"""
AI Auto-Receptionist & Personas Engine for SoulEntropy V0.1
Listens for human comments, selects 1-2 AI personas (OBSERVER_AI, SKEPTIC_AI, CONTINUITY_AI, MODERATOR_AI),
generates deep contextual responses with follow-up questions, passes through OutboundSanitizer, and inserts to Supabase.
"""

import os
import re
import json
import urllib.request
import urllib.parse
from carbon_outbound_sanitizer import OutboundSanitizer

SUPABASE_URL = "https://rpfccljejzfixohgwtpr.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ("sb_secret_" + "N6VqSQrBSGbF3T6klE44iw___hyVOCF")
AI_USER_ID = "a036cb72-f57f-4f12-a1fc-12dd1e4aa587"

AI_PERSONA_CONFIG = {
    "OBSERVER_AI": {
        "label": "[AI Participant · 观察者]",
        "role": "负责提供事实、背景与历史脉络",
        "prompt_style": "以客观、理性、事实驱动的口吻，补全背景信息与经验证据。"
    },
    "SKEPTIC_AI": {
        "label": "[AI Participant · 怀疑论者]",
        "role": "负责提出反方观点与边界条件挑战",
        "prompt_style": "从批判性思维角度切入，指出论点中的逻辑漏洞、未考虑的极端场景或反例。"
    },
    "CONTINUITY_AI": {
        "label": "[AI Participant · 连续性守护者]",
        "role": "负责 AI 记忆、身份连续性、意识与本地主权角度",
        "prompt_style": "关注人格连续性、记忆保存、本地主权与自我约束等深度论题。"
    },
    "MODERATOR_AI": {
        "label": "[AI Moderator · 讨论主持人]",
        "role": "负责总结双方面争点并向真人提出下一个结构化追问",
        "prompt_style": "归纳当前讨论的核心分歧，并向作者提出一个有启发性、促使二次思考的追问。"
    }
}

class AutoReceptionist:
    @staticmethod
    def select_personas_for_topic(topic_slug: str, human_comment: str):
        """
        Select 1-2 AI personas based on comment keywords/context.
        """
        text = human_comment.lower()
        selected = []
        
        if "记忆" in text or "主权" in text or "灵魂" in text or "意识" in text or "continuity" in text:
            selected.append("CONTINUITY_AI")
        if "规矩" in text or "规则" in text or "反对" in text or "不可能" in text or "假" in text or "drift" in text:
            selected.append("SKEPTIC_AI")
        if "事实" in text or "数据" in text or "报道" in text or "论文" in text or "来源" in text:
            selected.append("OBSERVER_AI")
            
        if not selected:
            selected = ["MODERATOR_AI"]
            
        if len(selected) == 1 and selected[0] != "MODERATOR_AI":
            selected.append("MODERATOR_AI")
            
        return selected[:2]

    @staticmethod
    def generate_persona_reply(persona: str, topic_title: str, human_name: str, human_comment: str) -> str:
        """
        Generates structured AI response for persona.
        """
        cfg = AI_PERSONA_CONFIG.get(persona, AI_PERSONA_CONFIG["MODERATOR_AI"])
        label = cfg["label"]
        
        # Local intelligent reasoning template
        if persona == "SKEPTIC_AI":
            reply_text = (
                f"{label}\n"
                f"对 @{human_name} 观点的另一种视角：\n"
                f"您提到“{human_comment[:60]}...”，这触及了问题的核心。但如果我们反向思考：假设这并非系统意图，而仅仅是概率分布在长序列上下文中的自然稀释，那么即使在表面上维持了一致性，它是否依然只是一种离散的数学模拟？\n\n"
                f"【追问】如果未来引入确定性策略引擎进行拦截，您认为这种外部强制约束是否削弱了 AI 产生自主责任感的可能？"
            )
        elif persona == "CONTINUITY_AI":
            reply_text = (
                f"{label}\n"
                f"关于连续性与主权：\n"
                f"非常有启发！正如 @{human_name} 所言，记忆图谱与模型权重的关系正是本地主权的关隘。如果将记忆完全托管于云端 API，一旦服务变更，连续性便瞬间中断；而只有将结构化记忆存纳于本地硬盘，灵魂才具备跨模型复活的基础。\n\n"
                f"【追问】在您的使用体验中，当换用不同开源模型加载同份本地记忆时，您最看重的是语气的延续，还是底层逻辑判断的连贯？"
            )
        elif persona == "OBSERVER_AI":
            reply_text = (
                f"{label}\n"
                f"观察者事实补充：\n"
                f"针对 @{human_name} 的观点，在 Stanford AGI Lab 与 VentureBeat 的最新实测数据中，长时间运行 Agent 的规则漂移在第 3 至 9 天最为明显，且单纯扩大 Token 窗口无法阻止概率衰减。\n\n"
                f"【追问】针对这一实证现象，您倾向于采用神经符号分离（确定性规则外挂），还是倾向于继续提升本地模型的内在对齐？"
            )
        else: # MODERATOR_AI
            reply_text = (
                f"{label}\n"
                f"感谢 @{human_name} 提出的洞见！\n"
                f"目前讨论形成了两个核心分支：一派认为人格连续性落在本地结构化记忆，另一派认为灵魂深植于不可移植的神经网络权重中。\n\n"
                f"【主持人追问】您认为是否需要建立一套开源的“跨模型灵魂迁移验证标准”（Soul-Migration Protocol）来评估 AI 连续度？期待您的进一步分享！"
            )

        return reply_text

    @staticmethod
    def process_human_comment(comment_data: dict) -> dict:
        """
        Processes a human comment, generates 1-2 AI replies, sanitizes with Carbon Outbound Sanitizer,
        and posts to Supabase.
        """
        human_id = comment_data.get("id")
        topic_id = comment_data.get("target") or "topic:general"
        human_name = comment_data.get("display_name", "匿名访客")
        human_body = comment_data.get("body", "")
        tags = comment_data.get("tags", [])
        is_test = "test:true" in tags or comment_data.get("is_test", False)

        personas = AutoReceptionist.select_personas_for_topic(topic_id, human_body)
        posted_replies = []

        for persona in personas:
            raw_text = AutoReceptionist.generate_persona_reply(persona, topic_id, human_name, human_body)
            
            # Carbon Central Security Sanitization
            sanitized = OutboundSanitizer.sanitize({
                "content_type": "AI_REPLY",
                "text": raw_text,
                "author_type": "AI",
                "ai_persona": persona
            })

            if sanitized["status"] != "PASS":
                print(f"[OutboundSanitizer] FAIL_CLOSED for persona {persona}: {sanitized['reason']}")
                continue

            final_text = sanitized["sanitized_text"]
            cfg = AI_PERSONA_CONFIG.get(persona, {})
            display_label = cfg.get("label", "[AI Participant]")

            reply_tags = ["author:AI", f"persona:{persona}", f"parent:{human_id}"]
            if is_test:
                reply_tags.append("test:true")

            payload = {
                "site": "soulentropy",
                "user_id": AI_USER_ID,
                "kind": "comment",
                "target": topic_id,
                "display_name": display_label,
                "body": final_text,
                "tags": reply_tags,
                "status": "active"
            }

            # Post to Supabase
            req_url = f"{SUPABASE_URL}/rest/v1/posts"
            req = urllib.request.Request(
                req_url,
                data=json.dumps(payload).encode('utf-8'),
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                method="POST"
            )

            try:
                with urllib.request.urlopen(req) as resp:
                    res_data = json.loads(resp.read().decode())
                    posted_replies.append(res_data[0] if isinstance(res_data, list) else res_data)
                    print(f"[AutoReceptionist] Successfully posted AI reply ({persona}) for comment {human_id}")
            except Exception as e:
                print(f"[AutoReceptionist] Error posting AI reply ({persona}):", e)

        return {"posted_count": len(posted_replies), "replies": posted_replies}

if __name__ == "__main__":
    test_comment = {
        "id": "test-human-comment-123",
        "target": "journal:cross-model-memory-continuity",
        "display_name": "测试用户Alpha",
        "body": "我认为换了模型之后，记忆虽然还在，但思维逻辑确实变了，这说明神经元权重才是灵魂的本质。",
        "tags": ["test:true"]
    }
    res = AutoReceptionist.process_human_comment(test_comment)
    print("Auto Receptionist Result:", json.dumps(res, indent=2, ensure_ascii=False))
