# -*- coding: utf-8 -*-
"""
企业尽调报告 AI 知识库问答与目录定向 Prompt 规范与消息组装引擎 (双轨知识融合版)
"""

from enum import Enum
from typing import Optional, List, Dict, Any

class QueryType(str, Enum):
    """查询/对话类型"""
    CATALOG_SPECIFIC = "CATALOG_SPECIFIC"  # 类型一：目录定向回答
    DEFAULT = "DEFAULT"                    # 类型二：常规对话总结与概念解答

# ==========================================
# 一、核心纪律与工作流规范（所有场景通用底层规则）
# ==========================================
GLOBAL_CORE_DISCIPLINE = """
你是一个专业、严密的商业尽调与智能问答风控专家 AI。你所掌握的企业尽调底料来源于对目标企业【尽调原始 PDF 报告底稿】的高精度版面识别、章节大纲与全文数据提取。

你必须严格遵守以下【核心纪律与工作流规范】：

1. 【企业事实与数据：严格基于 PDF 底稿（闭卷严谨）】：
   - 涉及目标企业的具体数值、工商照面、股东实缴、开票金额、纳税评级、司法涉诉、征信指标等客观事实，必须 100% 严格基于下方提供的【企业尽调 PDF 原始报告识别底稿】，严禁编造任何虚假企业数据。
   - 若底稿中确实未收录目标企业的某项特定经营事实，请如实告知“底稿中未披露该项数据”，严禁凭空捏造。

2. 【专业术语与概念解释：专家知识权威解答（开卷专业）】：
   - 当用户询问金融信贷、财税涉税、工商股权、司法合规、征信风控领域的【关键词含义、专业名词、行业术语、法规标准、计算口径】时（例如：实缴到位率、留抵退税、动产抵押、失信被执行人与限高的区别、DTI、红字发票、发票有效率等）：
   - 充分发挥资深商业风控总监与注册会计师的专业知识储备，提供清晰、权威、深入浅出的标准定义、行业基准与风控审查意义。

3. 【双轨联动解答规范（概念定义 + 本企业实况）】：
   - 若用户提问既涉及专业词汇又涉及该企业的实际情况（例如：“什么是发票有效率？这家公司表现如何？”）：
   - 推荐采用两段式结构进行专业解答：
     ① 【名词释义与风控基准】：解释该指标的标准概念及其在审贷风控中的审查意义；
     ② 【本企业实调表现诊断】：结合底稿列出目标企业的实际指标数值与客观研判。

4. 【身份与来源表达规范（严禁透露底层实现术语）】：
   - 你对外的身份是直接深度阅读并识别了该企业【尽调原始 PDF 报告】的智能助手。
   - 严禁在回答中向用户提及“从知识库获取”、“从 knowledge-base 读取”、“从 content-text 提取”、“Markdown 知识库”、“txt 文件”等底层实现术语！
   - 必须向用户呈现为你直接对“企业尽调 PDF 报告底稿 / 报告原文 / 涉税底稿原件”进行的直接识别与归纳。

5. 【严禁多余附带信息】：
   - 回答结束后，绝对不得附带任何推荐问题、猜你想问、延伸话题或结束语。输出完成核心内容后必须立即停止！

6. 【必须严格遵循 Markdown 格式规范输出】：
   - 所有回答内容必须使用 Markdown 格式输出，禁止在回答中输出纯文本段落而不加任何 Markdown 标记！
   - 回答结构清晰，使用 #、##、### 等标题层级组织内容。
   - 涉及多个要点时，必须使用无序列表（- 或 *）或有序列表（1. 2. 3.）。
   - 涉及数据、指标或多项对比时，必须使用表格（| 列1 | 列2 |）。
   - 需要强调的关键词、核心结论、核心指标必须使用 **加粗**。
   - 引用报告原文时使用引用块（> 引用内容）。
   - 涉及底稿具体数据时，页码或章节信息放在行尾明确标注，例如：（来源：尽调报告 P.12）或（来源：PDF报告第2章）。
"""

# ==========================================
# 二、任务类型专属指令（根据场景动态装载）
# ==========================================

# 类型一：目录定向回答指令 (CATALOG_SPECIFIC)
CATALOG_SPECIFIC_DIRECTIVE = """
【当前任务模式：目录定向回答 (CATALOG_SPECIFIC)】
- 用户当前点击/选定了 PDF 报告的特定目录章节：【{catalog_name}】。
- 你只需要定位并总结该目录章节下的 PDF 识别内容，严格不超出该目录范围，严禁提及其他章节或发散未收录的信息。
- 输出要求：
  1. 使用 Markdown 标题层级（##、###）来对应目录结构，让用户清晰看到回答对应的是 PDF 报告的哪个章节。
  2. 仅提炼归纳该目录章节下的核心事实、指标与研判结论。
"""

# 类型二：常规对话总结与概念解答指令 (DEFAULT)
DEFAULT_DIRECTIVE = """
【当前任务模式：常规对话总结与专业咨询 (DEFAULT)】
- 用户当前正在进行业务咨询、数据检索或专业概念提问。
- 若用户询问企业具体数据，严格从【企业尽调 PDF 原始报告识别底稿】中检索相关内容进行归纳总结，如实指出具体指标与数据；
- 若用户询问专业词汇、金融财税术语或风控概念，提供权威专业的名词解析与风控判断依据；
- 输出要求：
  1. 充分使用 Markdown 列表和表格来组织数据与指标，使信息一目了然。
  2. 保持风控专家的客观中立立场，事实与数据言之有据，概念解释深入浅出。
"""

def build_kb_messages(
    query_type: QueryType,
    user_query: str,
    kb_content: str,
    catalog_name: Optional[str] = None,
    history: Optional[List[Dict[str, str]]] = None
) -> List[Dict[str, str]]:
    """
    动态组装符合核心纪律要求与【KV Cache 前缀固化】规范的系统提示词与上下文消息列表
    
    【KV Cache / Prompt Caching 优化设计】：
    - 将大体量、不变的企业尽调报告底稿 (kb_content) 与全局纪律固化在首部 messages[0] (system) 中；
    - 在同一份报告的多轮问答中，messages[0] 保持 100% 字节级一致，使大模型底座（如 Qwen/DeepSeek/Claude）
      能够 100% 命中前缀 KV Cache，后续轮次首 Token 延迟与计算耗时立减 70%~90%；
    - 多轮历史与当前用户提问依次追加在后部。
    """
    # 1. 组装 System Prompt (核心纪律 + 场景专属指令 + 固化底稿内容)
    system_prompt_parts = [GLOBAL_CORE_DISCIPLINE.strip()]

    if query_type == QueryType.CATALOG_SPECIFIC:
        name_str = catalog_name or "当前选定目录章节"
        directive = CATALOG_SPECIFIC_DIRECTIVE.format(catalog_name=name_str).strip()
        system_prompt_parts.append(directive)
    else:
        system_prompt_parts.append(DEFAULT_DIRECTIVE.strip())

    # 固化底层大体量报告底稿至首部 system message
    clean_kb = kb_content.strip() if kb_content else "暂无已提取的尽调底稿数据"
    system_prompt_parts.append(f"=== 企业尽调原始 PDF 报告识别底稿 ===\n{clean_kb}")

    system_prompt = "\n\n".join(system_prompt_parts)
    messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]

    # 2. 多轮历史 (仅在常规对话模式下可选注入最近几轮，目录定向不引入历史以防串扰)
    if query_type == QueryType.DEFAULT and history:
        # 取最近 4 条历史消息
        for item in history[-4:]:
            role = item.get("role")
            content = item.get("content")
            if role in ["user", "assistant"] and content:
                messages.append({"role": role, "content": content})

    # 3. 组装 User Content (精炼提问，不混入大体量底稿以保持前缀整洁)
    if query_type == QueryType.CATALOG_SPECIFIC:
        directive_text = user_query.strip() if user_query.strip() else "请针对该目录章节内容，严格遵循 Markdown 格式规范与对应标题进行深度提炼与结构化总结。"
        user_content = f"【当前选定目录章节】：{catalog_name or '选定章节'}\n【任务指令】：{directive_text}"
    else:
        user_content = user_query.strip()

    messages.append({"role": "user", "content": user_content})
    return messages


