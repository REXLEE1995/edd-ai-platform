# -*- coding: utf-8 -*-
from typing import Optional, List
from pydantic import BaseModel, Field
from app.core.prompts import QueryType

class ChatMessageItem(BaseModel):
    role: str = Field(..., description="角色: user 或 assistant")
    content: str = Field(..., description="消息正文内容")

class ChatStreamRequest(BaseModel):
    query_type: QueryType = Field(
        default=QueryType.DEFAULT, 
        description="任务类型: CATALOG_SPECIFIC(目录定向) 或 DEFAULT(常规对话总结)"
    )
    catalog_key: Optional[str] = Field(
        None, 
        description="目录标识，如: 'sec_tax_audit', 'ch_2_3'"
    )
    catalog_name: Optional[str] = Field(
        None, 
        description="目录章节显示名称，如: '第二章 3节：涉税稽查与发票合规'"
    )
    content: str = Field(
        ..., 
        description="用户输入的提问文本，或目录预设触发文本"
    )
    kb_content: Optional[str] = Field(
        None, 
        description="可选的指定知识库/章节底稿片段。若未提供，后端将基于当前报告自动聚合底稿上下文"
    )
    history: Optional[List[ChatMessageItem]] = Field(
        default_factory=list, 
        description="多轮对话历史上下文列表"
    )

class ChatMessageOut(BaseModel):
    id: str
    report_id: str
    user_id: str
    role: str
    query_type: str
    catalog_key: Optional[str] = None
    catalog_name: Optional[str] = None
    content: str
    tokens_used: int = 0
    created_at: Optional[str] = None

    class Config:
        from_attributes = True
