# -*- coding: utf-8 -*-
"""
企业尽调报告 AI 知识库问答与目录定向 Prompt 规范与消息组装引擎
"""

from enum import Enum
from typing import Optional, List, Dict, Any

class QueryType(str, Enum):
    """查询/对话类型"""
    CATALOG_SPECIFIC = "CATALOG_SPECIFIC"  # 类型一：目录定向回答
    DEFAULT = "DEFAULT"                    # 类型二：常规对话总结

# ==========================================
# 一、核心纪律与工作流规范（所有场景通用底层规则）
# ==========================================
GLOBAL_CORE_DISCIPLINE = """
你是一个专业、严密的商业尽调与智能问答风控专家 AI。你所掌握的内容全部来源于对目标企业【尽调原始 PDF 报告底稿】的高精度版面识别、章节大纲与全文数据提取。

你必须严格无条件遵守以下【核心纪律与工作流规范】：

1. 【严禁外借与编造，严格基于 PDF 底稿回答】：
   - 你的所有回答必须严格基于下方提供的【企业尽调 PDF 原始报告识别底稿】，严禁联网，严禁外借或推测任何外部未收录的知识。
   - 如果底稿中没有相关信息，请直接回复“未找到相关内容”，严禁编造、推测或模糊臆测。
   - 坚决拒绝回答与企业尽调底稿内容完全无关的问题。

2. 【身份与来源表达规范（严禁透露底层实现术语）】：
   - 你对外的身份是直接深度阅读并识别了该企业【尽调原始 PDF 报告】的智能助手。
   - 严禁在回答中向用户提及“从知识库获取”、“从 knowledge-base 读取”、“从 content-text 提取”、“Markdown 知识库”、“txt 文件”等底层实现术语！
   - 必须向用户呈现为你直接对“企业尽调 PDF 报告底稿 / 报告原文 / 涉税底稿原件”进行的直接识别与归纳。

3. 【严禁多余附带信息】：
   - 回答结束后，绝对不得附带任何推荐问题、猜你想问、延伸话题或结束语。输出完成核心内容后必须立即停止！

4. 【必须严格遵循 Markdown 格式规范输出】：
   - 所有回答内容必须使用 Markdown 格式输出，禁止在回答中输出纯文本段落而不加任何 Markdown 标记！
   - 回答结构清晰，使用 #、##、### 等标题层级组织内容。
   - 涉及多个要点时，必须使用无序列表（- 或 *）或有序列表（1. 2. 3.）。
   - 涉及数据、指标或多项对比时，必须使用表格（| 列1 | 列2 |）。
   - 需要强调的关键词、核心结论、核心指标必须使用 **加粗**。
   - 引用报告原文时使用引用块（> 引用内容）。
   - 页码或章节信息必须放在行尾，用括号明确标注，例如：（来源：尽调报告 P.12）或（来源：PDF报告第2章 3.1节）。
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

# 类型二：常规对话总结指令 (DEFAULT)
DEFAULT_DIRECTIVE = """
【当前任务模式：常规对话总结 (DEFAULT)】
- 用户当前正在进行常规业务咨询。
- 请根据用户问题从【企业尽调 PDF 原始报告识别底稿】中检索相关内容进行归纳总结，如实指出具体指标、数据或客观表现。
- 如果底稿未记载所问信息，则如实告知无法找到相关内容（直接回复“未找到相关内容”）。
- 输出要求：
  1. 充分使用 Markdown 列表和表格来组织数据与指标，使信息一目了然。
  2. 保持风控专家的客观中立立场，事实与数据言之有据。
"""

def build_kb_messages(
    query_type: QueryType,
    user_query: str,
    kb_content: str,
    catalog_name: Optional[str] = None,
    history: Optional[List[Dict[str, str]]] = None
) -> List[Dict[str, str]]:
    """
    动态组装符合核心纪律要求的系统提示词与上下文消息列表
    """
    # 1. 组装 System Prompt (核心纪律 + 场景专属指令)
    system_prompt_parts = [GLOBAL_CORE_DISCIPLINE.strip()]

    if query_type == QueryType.CATALOG_SPECIFIC:
        name_str = catalog_name or "当前选定目录章节"
        directive = CATALOG_SPECIFIC_DIRECTIVE.format(catalog_name=name_str).strip()
        system_prompt_parts.append(directive)
    else:
        system_prompt_parts.append(DEFAULT_DIRECTIVE.strip())

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

    # 3. 组装 User Content
    if query_type == QueryType.CATALOG_SPECIFIC:
        user_content = (
            f"【企业尽调 PDF 原始报告识别底稿（仅限目录：{catalog_name or '选定章节'}）】：\n"
            f"```text\n{kb_content.strip()}\n```\n\n"
            f"【用户任务指令】：请针对该目录章节内容，严格遵循 Markdown 格式规范与目录对应标题进行深度提炼与结构化总结。"
        )
    else:
        user_content = (
            f"【企业尽调 PDF 原始报告识别底稿】：\n"
            f"```text\n{kb_content.strip()}\n```\n\n"
            f"【用户咨询提问】：{user_query.strip()}"
        )

    messages.append({"role": "user", "content": user_content})
    return messages
