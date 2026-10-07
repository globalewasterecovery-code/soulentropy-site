"""
Email Return Loop & Notification Engine for SoulEntropy V0.1
Triggers email notifications for comment replies, follow-up questions, and topic updates.
Includes unsubscribe link & OutboundSanitizer check.
"""

import json
from carbon_outbound_sanitizer import OutboundSanitizer

class EmailNotifier:
    @staticmethod
    def send_reply_notification(recipient_email: str, recipient_name: str, replier_name: str, topic_title: str, topic_url: str, reply_body: str, unsubscribe_token: str = "default_user"):
        """
        Sends an email notification when someone (AI or Human) replies to a user's comment.
        """
        if not recipient_email or "@" not in recipient_email:
            return {"status": "SKIPPED", "reason": "NO_VALID_EMAIL"}

        unsubscribe_url = f"{topic_url.split('/journal/')[0]}/contact/?unsubscribe={unsubscribe_token}"

        email_text = (
            f"尊敬的 {recipient_name}：\n\n"
            f"您在 SoulEntropy 讨论【{topic_title}】中的观点有了最新回复！\n\n"
            f"【{replier_name}】回复了您：\n"
            f"----------------------------------------\n"
            f"{reply_body}\n"
            f"----------------------------------------\n\n"
            f"👉 点击查看并进行第二次回复：{topic_url}\n\n"
            f"如需退订此类邮件通知，请点击：{unsubscribe_url}\n"
            f"Soul Entropy Team · Born in the dark. Grown by belief."
        )

        # Carbon Outbound Sanitizer check
        sanitized = OutboundSanitizer.sanitize({
            "content_type": "EMAIL_NOTIFICATION",
            "text": email_text,
            "author_type": "SYSTEM",
            "recipient_email": recipient_email
        })

        if sanitized["status"] != "PASS":
            return {"status": "FAIL_CLOSED", "reason": f"SANITIZER_{sanitized['reason']}"}

        # Simulated / Logged Email Transport for V0.1
        notification_log = {
            "recipient": recipient_email,
            "subject": f"【SoulEntropy】{replier_name} 回复了您的讨论观点",
            "body": sanitized["sanitized_text"],
            "unsubscribe_url": unsubscribe_url,
            "status": "SENT"
        }

        print(f"[EmailNotifier] Notification SENT to {recipient_email}")
        return notification_log

if __name__ == "__main__":
    res = EmailNotifier.send_reply_notification(
        recipient_email="testuser@example.com",
        recipient_name="测试用户Alpha",
        replier_name="[AI Participant · 连续性守护者]",
        topic_title="跨模型切换与人格连续性",
        topic_url="https://soulentropy.org/journal/cross-model-memory-continuity/",
        reply_body="关于连续性与主权：非常赞同您的分析。当更换模型时最看重哪个指标？"
    )
    print("Email Notification Result:", json.dumps(res, indent=2, ensure_ascii=False))
