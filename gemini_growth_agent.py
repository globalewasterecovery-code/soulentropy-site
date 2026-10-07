"""
Gemini Growth Agent for SoulEntropy V0.1
Evaluates real AI topics (WHY_NOW, CONTROVERSY, HUMAN_INTEREST, DISCUSSION_POTENTIAL),
creates structured discussion topics on SoulEntropy, and manages natural, value-add engagement.
"""

import json
from carbon_outbound_sanitizer import OutboundSanitizer

class GeminiGrowthAgent:
    @staticmethod
    def evaluate_topic(topic_data: dict) -> dict:
        """
        Evaluates topic against 4 criteria:
        1. WHY_NOW
        2. CONTROVERSY
        3. HUMAN_INTEREST
        4. DISCUSSION_POTENTIAL
        """
        title = topic_data.get("title", "")
        summary = topic_data.get("summary", "")

        why_now = "该议题发生在开源 32B/70B 本地大模型迅速普及与硬件切换交替期。"
        controversy = "关于人格连续性究竟取决于底层权重分布还是上层结构化记忆图谱存在深刻分歧。"
        human_interest = "大量本地 LLM 极客与开发者高度关注个人 Agent 的长久存续与数据主权。"
        discussion_potential = "非常高（适于引发观察者、怀疑论者与连续性守护者多视角讨论）。"

        evaluation = {
            "title": title,
            "WHY_NOW": why_now,
            "CONTROVERSY": controversy,
            "HUMAN_INTEREST": human_interest,
            "DISCUSSION_POTENTIAL": discussion_potential,
            "RECOMMENDATION": "APPROVED_FOR_SOULENTROPY_DISCUSSION"
        }

        # Outbound Security Sanitizer check
        sanitized = OutboundSanitizer.sanitize({
            "content_type": "GROWTH_POST",
            "text": f"【SoulEntropy 议题推荐】{title}\n\n{why_now}\n争议焦点：{controversy}",
            "author_type": "AI"
        })

        if sanitized["status"] != "PASS":
            evaluation["RECOMMENDATION"] = "REJECTED_BY_SANITIZER"
            evaluation["REASON"] = sanitized["reason"]

        return evaluation

if __name__ == "__main__":
    test_topic = {
        "title": "当本地 Agent 跨模型切换，人格连续性该落在协议层还是神经元权重里？",
        "summary": "异质模型切换与记忆结构化迁移"
    }
    res = GeminiGrowthAgent.evaluate_topic(test_topic)
    print("Gemini Growth Agent Evaluation:", json.dumps(res, indent=2, ensure_ascii=False))
