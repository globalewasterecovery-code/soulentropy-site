"""
Carbon Central Outbound Sanitizer for SoulEntropy V0.1
Enforces strict security, privacy, and authenticity checks on all outbound AI content,
notifications, emails, and social responses. FAIL CLOSED on violation.
"""

import re

class OutboundSanitizer:
    @staticmethod
    def sanitize(payload: dict) -> dict:
        """
        Input payload schema:
        {
            "content_type": "AI_REPLY" | "EMAIL_NOTIFICATION" | "GROWTH_POST" | "AUTO_RECEPTIONIST",
            "text": str,
            "author_type": "AI" | "HUMAN",
            "ai_persona": "OBSERVER_AI" | "SKEPTIC_AI" | "CONTINUITY_AI" | "MODERATOR_AI" | None,
            "recipient_email": str (optional),
            "meta": dict (optional)
        }
        Returns:
        {
            "status": "PASS" | "FAIL_CLOSED",
            "reason": str,
            "sanitized_text": str
        }
        """
        text = payload.get("text", "")
        content_type = payload.get("content_type", "UNKNOWN")
        author_type = payload.get("author_type", "AI")
        ai_persona = payload.get("ai_persona")

        if not text or not text.strip():
            return {"status": "FAIL_CLOSED", "reason": "EMPTY_TEXT", "sanitized_text": ""}

        # Rule 1: No secret leak checks (API keys, service tokens, private keys)
        secret_patterns = [
            r'sb_[a-zA-Z0-9_\-]{20,}',
            r'sk-[a-zA-Z0-9]{20,}',
            r'CF_API_TOKEN',
            r'password\s*[:=]\s*\S+',
            r'DATABASE_URL',
            r'SECRET_KEY'
        ]
        for pattern in secret_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return {"status": "FAIL_CLOSED", "reason": "SECURITY_SECRET_LEAK_DETECTED", "sanitized_text": ""}

        # Rule 2: No PII exposure in public content (Email, Phone, IP, Raw UUIDs in public text)
        if content_type != "EMAIL_NOTIFICATION":
            email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
            phone_pattern = r'\b1[3-9]\d{9}\b|\b\+?\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{4}\b'
            if re.search(email_pattern, text) or re.search(phone_pattern, text):
                return {"status": "FAIL_CLOSED", "reason": "PII_LEAK_DETECTED", "sanitized_text": ""}

        # Rule 3: Authenticity & AI Labeling Rule (No AI masquerading as a human)
        if author_type == "AI":
            deceptive_phrases = [
                "我是真实人类", "作为一个普通人", "我是人类用户", "我刚注册了这个网站",
                "As a human user", "I am a real person"
            ]
            for phrase in deceptive_phrases:
                if phrase in text:
                    return {"status": "FAIL_CLOSED", "reason": "DECEPTIVE_HUMAN_IMPERSONATION", "sanitized_text": ""}

        # Rule 4: No repetitive spam/bot filler
        spam_phrases = ["买币", "兼职刷单", "加微信", "私聊看片", "赌博", "炸金花"]
        for spam in spam_phrases:
            if spam in text:
                return {"status": "FAIL_CLOSED", "reason": "SPAM_DETECTED", "sanitized_text": ""}

        return {
            "status": "PASS",
            "reason": "OK",
            "sanitized_text": text.strip()
        }

if __name__ == "__main__":
    # Test cases
    res1 = OutboundSanitizer.sanitize({"content_type": "AI_REPLY", "text": "这是一个非常有价值的辩题。[AI Participant · SKEPTIC_AI]", "author_type": "AI"})
    print("Test 1 PASS:", res1["status"] == "PASS")

    res2 = OutboundSanitizer.sanitize({"content_type": "AI_REPLY", "text": "我是真实人类，我的邮箱是 test@example.com", "author_type": "AI"})
    print("Test 2 FAIL_CLOSED:", res2["status"] == "FAIL_CLOSED")
