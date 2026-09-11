import json
import logging
import asyncio
import re
from typing import Dict, Any, List, Optional, AsyncGenerator, Callable
from openai import AsyncOpenAI
from app.core.ai_config import load_ai_config
from app.core.config import settings

logger = logging.getLogger("xyzp.ai")

class AIService:
    """
    企业尽调大模型智能体服务 (统一通过 New-API 网关 / 动态 Admin 配置调用后端 Token 资源池)
    - 支持与 New-API 聚合网关对接，自动享受 Token 轮询、负载均衡、故障自动重试
    - 针对未配置 Key 或网络异常提供自适应 Mock 降级兜底，保障业务高可用
    """

    @classmethod
    def _get_client(cls) -> Optional[tuple[AsyncOpenAI, Dict[str, Any]]]:
        cfg = load_ai_config()
        api_key = cfg.get("new_api_key") or settings.NEW_API_KEY or settings.OPENAI_API_KEY
        base_url = (cfg.get("new_api_base_url") or settings.NEW_API_BASE_URL or settings.OPENAI_API_BASE or "").rstrip("/")
        provider = cfg.get("llm_provider", "newapi")
        
        # 若未填写真实 key 且为默认占位符，或者 provider 为 mock 时
        if not api_key or api_key == "sk-your-new-api-master-token" or provider == "mock" or not cfg.get("is_enabled", True):
            return None
        
        try:
            client = AsyncOpenAI(
                api_key=api_key.strip(),
                base_url=base_url,
                timeout=float(cfg.get("timeout_seconds", 60)),
                max_retries=1
            )
            return client, cfg
        except Exception as e:
            logger.error(f"[AIService] Failed to initialize AsyncOpenAI client: {e}")
            return None

    @classmethod
    async def chat_completion(
        cls,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> str:
        """
        统一调用 New-API 网关的大语言模型接口 (支持 Admin 动态配置，默认不限制 Token，关闭思维链)
        """
        client_bundle = cls._get_client()

        if client_bundle:
            client, cfg = client_bundle
            target_model = model or cfg.get("new_api_model") or "xyzp-ai"
            target_temp = temperature if temperature is not None else cfg.get("temperature", 0.3)
            base_url = cfg.get("new_api_base_url", "")

            # Token 配额策略：如果未显式传参，读取配置；若配置为 None 或 0 则完全不限制
            configured_max_tokens = cfg.get("max_tokens")
            target_max_tokens = max_tokens if max_tokens is not None else configured_max_tokens
            if target_max_tokens is not None and int(target_max_tokens) <= 0:
                target_max_tokens = None

            # 思考模式策略：默认关闭思维链 (Reasoning/Thinking) 以大幅提速并杜绝截断
            enable_thinking = cfg.get("enable_thinking", False)
            extra_body = {}
            if not enable_thinking:
                extra_body["enable_thinking"] = False

            create_kwargs: Dict[str, Any] = {
                "model": target_model,
                "messages": messages,
                "temperature": target_temp,
                "stream": stream
            }
            if target_max_tokens is not None:
                create_kwargs["max_tokens"] = int(target_max_tokens)
            if extra_body:
                create_kwargs["extra_body"] = extra_body

            try:
                logger.info(f"[AIService] Dispatching request to AI Gateway -> {base_url} (Model: {target_model}, max_tokens: {target_max_tokens or 'Unlimited'}, thinking: {enable_thinking})")
                response = await client.chat.completions.create(**create_kwargs)
                if response and response.choices:
                    msg = response.choices[0].message
                    content = (msg.content or "").strip()
                    if not content and getattr(msg, "reasoning", None):
                        content = msg.reasoning.strip()
                    return content
            except Exception as e:
                # 若因 extra_body 不支持报错，自动剥离 extra_body 降级重试
                if extra_body:
                    try:
                        create_kwargs.pop("extra_body", None)
                        response = await client.chat.completions.create(**create_kwargs)
                        if response and response.choices:
                            msg = response.choices[0].message
                            return (msg.content or "").strip()
                    except Exception:
                        pass
                logger.error(f"[AIService] AI Gateway call failed ({str(e)}), fallbacking to local heuristic engine.")

        # 本地拟真降级返回
        return cls._local_heuristic_fallback(messages)

    @classmethod
    async def generate_enterprise_summary(
        cls,
        company_name: str,
        credit_code: str,
        basic_info: Dict[str, Any],
        tax_info: Dict[str, Any],
        risk_info: Dict[str, Any]
    ) -> str:
        """
        基于全景多源底稿数据，调用 AI 生成全景综合研判结论
        """
        system_prompt = (
            "你是一名资深的金融风控总监 (CRO) 与商业尽调专家。请根据提供的企业多源工商、官方涉税、司法与征信底稿数据，"
            "出具客观、精炼、专业且具有决策指导意义的综合尽调结论（字数控制在 250-400 字之间）。"
            "结构包含：1. 企业基本盘与经营真实性；2. 核心风险排查与涉税/司法表现；3. 准入与授信综合建议。"
        )

        user_content = f"""
目标企业：{company_name} (统一社会信用代码: {credit_code})
【工商概况】：法定代表人 {basic_info.get('legal_person', '--')}，注册资本 {basic_info.get('reg_capital', '--')}，实缴到位率 {basic_info.get('paid_rate', '100%')}。
【涉税与开票】：近36个月开票总额 {tax_info.get('annual_vat_sales', '--')}，有效发票率 {tax_info.get('valid_ratio', '99.8%')}，纳税评级 {tax_info.get('tax_rating', 'A')} 级。
【司法合规】：严重违法失信记录 {risk_info.get('serious_illegal', '无')}，失信被执行人 {risk_info.get('dishonest_count', 0)} 条，行政处罚 {risk_info.get('penalty_count', 0)} 起。
【多头借贷】：近3个月金融机构查询 {risk_info.get('query_count_3m', 1)} 次，逾期记录 {risk_info.get('overdue_records', 0)} 次。

请输出客观中立的 AI 深度研判结论：
"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        return await cls.chat_completion(messages, temperature=0.2)

    @classmethod
    async def generate_chapter_summary(cls, chapter_title: str, chapter_text: str) -> str:
        """
        针对报告特定章节生成 AI 智能研判与风险提示
        """
        system_prompt = (
            "你是一名专业的企业尽调分析师。请针对提供的报告章节内容，提取核心关键数据事实，"
            "并给出 2-3 条精炼的要点研判与风控提示（采用清晰的 Markdown 列表形式输出）。"
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"章节名称：{chapter_title}\n\n章节文本数据：\n{chapter_text[:40000]}"}
        ]
        return await cls.chat_completion(messages, temperature=0.2)

    @classmethod
    async def chat_with_report(
        cls,
        report_meta: Dict[str, Any],
        context_text: str,
        question: str,
        history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        报告阅读器内的 AI 智能问答对话助手
        """
        company_name = report_meta.get("company_name", "目标企业")
        system_prompt = (
            f"你是由享宇AI智评研发的企业尽调 AI 智能助手。当前正在协助用户阅读【{company_name}】的深度尽调报告底稿。\n"
            "请严格依据提供的报告上下文事实准确、专业、精炼地回答用户提问。如果报告数据中未明确提及，请如实告知并提示用户查阅其他底稿附件。"
        )

        messages = [{"role": "system", "content": system_prompt}]
        
        if history:
            messages.extend(history[-6:])  # 保留最近 3 轮对话上下文

        user_content = f"【尽调报告相关底稿上下文】：\n{context_text[:40000]}\n\n【用户问题】：{question}"
        messages.append({"role": "user", "content": user_content})

        return await cls.chat_completion(messages, temperature=0.3)

    @classmethod
    def _local_heuristic_fallback(cls, messages: List[Dict[str, str]]) -> str:
        """
        本地自适应提示（在网关未配置或网络故障时的真实提示）
        """
        return (
            "⚠️ **[大模型服务暂时不可用]** AI 大语言模型网关调用异常，无法生成实时研判结论。"
            "请前往管理后台【系统设置 -> AI 大模型配置】核查网关地址与 API Key 后重试。"
        )

    @classmethod
    async def convert_subwindow_to_markdown(
        cls,
        subwindow_title: str,
        subwindow_pages_desc: str,
        subwindow_text: str,
        temperature: float = 0.0,
        timeout: float = 60.0
    ) -> str:
        """
        面向通用自适应窗口切片 (Adaptive Window Chunking) 的单个 SubWindow Markdown 转换微任务
        - 单个切片跨度小（通常1-2页）、耗时短（2-5秒）、绝对不超时、大模型不偷懒
        """
        system_prompt = """作为一个 PDF 解析人员和企业信息整合人员。需要从这个 PDF 页面底稿中分析出所有数据，并且所有的数据是企业的工商信息、经营信息、税务信息等等相关信息。解析这个 PDF 页面片段成为纯正的 markdown 格式输出，同时需要校验是否和原本的 PDF 内容有差池。

【提取与格式准则】：
1. 绝对保真：金额数字、百分比、税额、统一代码、人名必须与原文字字对应，严禁四舍五入、省略或概括。
2. 表格标准化：所有数据表格完整转换为标准 Markdown 表格。
3. 页码溯源：每一节标注 [见报告 P.XX]。
4. 【格式严禁代码块包裹】：必须整篇直接输出纯正标准的 Markdown 标题、正文与表格排版。绝对禁止在开头和结尾使用 ```markdown 或 ``` 将整篇内容整体包裹为代码块！必须直接从 Markdown 标题 (#、##) 或表格起笔输出。"""

        user_prompt = f"正在处理板块切片：【{subwindow_title}】（{subwindow_pages_desc}）\n对应原始 PDF 底稿如下：\n{subwindow_text}\n\n请提取并直接输出该切片的标准 Markdown 正文："

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        try:
            res = await asyncio.wait_for(
                cls.chat_completion(messages=messages, temperature=temperature),
                timeout=timeout
            )
            if res and len(res) > 20:
                cleaned = res.strip()
                cleaned = re.sub(r"^```(?:markdown)?\s*", "", cleaned, flags=re.IGNORECASE)
                cleaned = re.sub(r"\s*```$", "", cleaned)
                return cleaned.strip()
        except Exception as e:
            logger.warning(f"[AIService] convert_subwindow_to_markdown ({subwindow_title} {subwindow_pages_desc}) failed: {e}")
        return subwindow_text

    @classmethod
    async def stream_chat_completion(
        cls,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: Optional[float] = 0.1,
        max_tokens: Optional[int] = None,
        stop_check_fn: Optional[Callable[[], Any]] = None,
        usage_callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> AsyncGenerator[str, None]:
        """
        统一调用 AI 网关的异步流式输出接口 (支持生产环境与免 Key 降级流式输出)
        - 开启 stream_options: {"include_usage": True} 捕获 Prompt 缓存与 Token 用量
        - 实时分析 DeepSeek / Qwen 在阿里 Model Router 下的 Prefix KV Cache 命中率
        """
        client_bundle = cls._get_client()

        if client_bundle:
            client, cfg = client_bundle
            target_model = model or cfg.get("new_api_model") or "xyzp-ai"
            target_temp = temperature if temperature is not None else cfg.get("temperature", 0.1)
            base_url = cfg.get("new_api_base_url", "")

            configured_max_tokens = cfg.get("max_tokens")
            target_max_tokens = max_tokens if max_tokens is not None else configured_max_tokens
            if target_max_tokens is not None and int(target_max_tokens) <= 0:
                target_max_tokens = None

            enable_thinking = cfg.get("enable_thinking", False)
            extra_body = {}
            if not enable_thinking:
                extra_body["enable_thinking"] = False

            create_kwargs: Dict[str, Any] = {
                "model": target_model,
                "messages": messages,
                "temperature": target_temp,
                "stream": True,
                "stream_options": {"include_usage": True}
            }
            if target_max_tokens is not None:
                create_kwargs["max_tokens"] = int(target_max_tokens)
            if extra_body:
                create_kwargs["extra_body"] = extra_body

            def _log_and_notify_usage(usage_obj: Any):
                try:
                    if not usage_obj:
                        return
                    prompt_tokens = getattr(usage_obj, "prompt_tokens", 0) or 0
                    completion_tokens = getattr(usage_obj, "completion_tokens", 0) or 0
                    total_tokens = getattr(usage_obj, "total_tokens", 0) or 0
                    cached_tokens = 0
                    prompt_details = getattr(usage_obj, "prompt_tokens_details", None)
                    if prompt_details:
                        if isinstance(prompt_details, dict):
                            cached_tokens = prompt_details.get("cached_tokens", 0) or 0
                        else:
                            cached_tokens = getattr(prompt_details, "cached_tokens", 0) or 0
                    
                    hit_rate = (cached_tokens / prompt_tokens * 100.0) if prompt_tokens > 0 else 0.0
                    logger.info(
                        f"[AIService] Stream Usage Stats -> prompt_tokens: {prompt_tokens}, "
                        f"cached_tokens: {cached_tokens} (Cache Hit: {hit_rate:.1f}%), "
                        f"completion_tokens: {completion_tokens}, total: {total_tokens}"
                    )
                    if usage_callback and callable(usage_callback):
                        usage_callback({
                            "prompt_tokens": prompt_tokens,
                            "cached_tokens": cached_tokens,
                            "cache_hit_rate": hit_rate,
                            "completion_tokens": completion_tokens,
                            "total_tokens": total_tokens
                        })
                except Exception as usage_err:
                    logger.debug(f"[AIService] Usage extraction note: {usage_err}")

            try:
                logger.info(f"[AIService] Dispatching stream request to AI Gateway -> {base_url} (Model: {target_model}, max_tokens: {target_max_tokens or 'Unlimited'}, thinking: {enable_thinking})")
                stream_resp = await client.chat.completions.create(**create_kwargs)
                async for chunk in stream_resp:
                    if stop_check_fn and await stop_check_fn():
                        break
                    if getattr(chunk, "usage", None):
                        _log_and_notify_usage(chunk.usage)
                    if chunk.choices and len(chunk.choices) > 0 and chunk.choices[0].delta:
                        delta = chunk.choices[0].delta.content or ""
                        if delta:
                            yield delta
                return
            except Exception as e:
                # 若因 stream_options 或 extra_body 导致部分三方网关报错，平滑降级重试
                fallback_kwargs = dict(create_kwargs)
                fallback_kwargs.pop("stream_options", None)
                if extra_body:
                    fallback_kwargs.pop("extra_body", None)
                try:
                    logger.warning(f"[AIService] Stream with options failed ({e}), attempting resilient fallback stream...")
                    stream_resp = await client.chat.completions.create(**fallback_kwargs)
                    async for chunk in stream_resp:
                        if stop_check_fn and await stop_check_fn():
                            break
                        if chunk.choices and len(chunk.choices) > 0 and chunk.choices[0].delta:
                            delta = chunk.choices[0].delta.content or ""
                            if delta:
                                yield delta
                    return
                except Exception as ex:
                    logger.error(f"[AIService] Stream resilient fallback call also failed ({ex}), falling back to local notification.")

        # 本地流式异常提示输出
        simulated_text = (
            "⚠️ **【AI 大模型网关调用异常】**\n\n"
            "当前大语言模型网关响应失败或尚未配置有效密钥，无法根据尽调报告底稿进行实时问答。\n\n"
            "请联系系统管理员或前往 **管理后台 -> 系统配置 -> AI大模型配置** 检查 API Key 与网关连接。"
        )
        chunk_size = 4
        for i in range(0, len(simulated_text), chunk_size):
            if stop_check_fn and await stop_check_fn():
                break
            yield simulated_text[i:i + chunk_size]
            await asyncio.sleep(0.02)


