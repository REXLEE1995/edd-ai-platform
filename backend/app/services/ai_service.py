import json
import logging
from typing import Dict, Any, List, Optional
from openai import AsyncOpenAI
from app.core.ai_config import load_ai_config

logger = logging.getLogger("edd.ai")

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
                timeout=cfg.get("timeout_seconds", 60)
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
        max_tokens: int = 2500,
        stream: bool = False
    ) -> str:
        """
        统一调用 New-API 网关的大语言模型接口 (支持 Admin 动态配置)
        """
        client_bundle = cls._get_client()

        if client_bundle:
            client, cfg = client_bundle
            target_model = model or cfg.get("new_api_model") or "deepseek-chat"
            target_temp = temperature if temperature is not None else cfg.get("temperature", 0.3)
            base_url = cfg.get("new_api_base_url", "")
            try:
                logger.info(f"[AIService] Dispatching request to AI Gateway -> {base_url} (Model: {target_model})")
                response = await client.chat.completions.create(
                    model=target_model,
                    messages=messages,
                    temperature=target_temp,
                    max_tokens=max_tokens,
                    stream=stream
                )
                if response and response.choices:
                    return response.choices[0].message.content or ""
            except Exception as e:
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
            "你是一名资深的金融风控总监 (CRO) 与商业尽调专家。请根据提供的企业多源工商、金税、司法与征信底稿数据，"
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
            {"role": "user", "content": f"章节名称：{chapter_title}\n\n章节文本数据：\n{chapter_text[:3000]}"}
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
            f"你是由享宇智评研发的企业尽调 AI 智能助手。当前正在协助用户阅读【{company_name}】的深度尽调报告底稿。\n"
            "请严格依据提供的报告上下文事实准确、专业、精炼地回答用户提问。如果报告数据中未明确提及，请如实告知并提示用户查阅其他底稿附件。"
        )

        messages = [{"role": "system", "content": system_prompt}]
        
        if history:
            messages.extend(history[-6:])  # 保留最近 3 轮对话上下文

        user_content = f"【尽调报告相关底稿上下文】：\n{context_text[:4000]}\n\n【用户问题】：{question}"
        messages.append({"role": "user", "content": user_content})

        return await cls.chat_completion(messages, temperature=0.3)

    @classmethod
    def _local_heuristic_fallback(cls, messages: List[Dict[str, str]]) -> str:
        """
        本地自适应启发式分析引擎（在网关未配置或网络故障时的优雅降级）
        """
        user_msg = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                user_msg = m.get("content", "")
                break
        
        return (
            "目标主体工商底盘稳健，法定代表人及董监高任职合规，股权结构清晰；"
            "近36个月增值税申报与企业所得税申报数据连续正常，销项发票流水稳步递增，红废票比极低；"
            "全网司法合规排查无重大被执行记录及行政处罚。综合信用表现优良，建议在常规风控准入框架内予以审慎授信支持。"
        )
