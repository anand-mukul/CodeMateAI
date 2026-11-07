"""
CodeMate AI — Notification & Email Delivery Service (Resend SMTP & Mock Engine)
Supports high-deliverability transactional emails via Resend SMTP (Port 465 SSL & Port 587 STARTTLS)
with branded responsive HTML templates, non-blocking async execution, and test mailbox tracking.
"""

import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib
from typing import List, Optional, Tuple

from app.core.config import settings
from app.core.logging import logger

# In-memory test mailbox for automated integration tests and debugging
_sent_notifications: List[Tuple[str, str, str]] = []


class NotificationService:
    """
    Transactional email delivery engine for account verification, password resets,
    and security alerts. Designed for zero-downtime integration with Resend SMTP.
    """

    @classmethod
    def get_sent_notifications(cls) -> List[Tuple[str, str, str]]:
        return list(_sent_notifications)

    @classmethod
    def clear_sent_notifications(cls) -> None:
        _sent_notifications.clear()

    @classmethod
    def _dispatch_smtp_sync(
        cls,
        to_email: str,
        subject: str,
        plain_body: str,
        html_body: Optional[str] = None,
    ) -> bool:
        """
        Synchronous SMTP delivery helper executed in a background worker thread.
        Handles both SSL (Port 465) and STARTTLS (Port 587/2587).
        """
        port = settings.SMTP_PORT or 465
        host = settings.SMTP_HOST or "smtp.resend.com"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = to_email

        # Attach text/plain fallback
        msg.attach(MIMEText(plain_body, "plain", "utf-8"))

        # Attach text/html if provided
        if html_body:
            msg.attach(MIMEText(html_body, "html", "utf-8"))

        try:
            if port == 465 or port == 2465:
                # Direct SSL/TLS connection (Standard for Resend Port 465)
                with smtplib.SMTP_SSL(host, port, timeout=15) as server:
                    if settings.SMTP_PASSWORD:
                        server.login(settings.SMTP_USER or "resend", settings.SMTP_PASSWORD)
                    server.send_message(msg)
            else:
                # STARTTLS connection (Standard for Port 587 / 2587)
                with smtplib.SMTP(host, port, timeout=15) as server:
                    server.starttls()
                    if settings.SMTP_PASSWORD:
                        server.login(settings.SMTP_USER or "resend", settings.SMTP_PASSWORD)
                    server.send_message(msg)

            logger.info(f"[NotificationService] Successfully delivered email to '{to_email}' via {host}:{port}")
            return True
        except Exception as e:
            logger.error(f"[NotificationService] SMTP delivery to '{to_email}' failed via {host}:{port} -> {e}")
            return False

    @classmethod
    async def send_email(
        cls,
        to_email: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None,
    ) -> bool:
        """
        Sends email asynchronously via Resend SMTP without blocking the FastAPI event loop.
        Falls back cleanly to mock mode in test and development environments.
        """
        _sent_notifications.append((to_email, subject, body))
        logger.info(f"[NotificationService] Dispatched email to '{to_email}' with subject: '{subject}'")

        is_smtp_configured = (
            settings.EMAIL_PROVIDER in ["smtp", "resend"]
            and settings.SMTP_HOST
            and settings.SMTP_USER
            and settings.SMTP_PASSWORD
        )

        if is_smtp_configured:
            # Execute synchronous SMTP dispatch in an asynchronous threadpool
            return await asyncio.to_thread(
                cls._dispatch_smtp_sync,
                to_email=to_email,
                subject=subject,
                plain_body=body,
                html_body=html_body,
            )

        # In development/test mock mode:
        logger.debug(f"[NotificationService] [Mock Mode] Email preview for {to_email}: {body[:150]}...")
        return True

    @classmethod
    async def send_verification_email(cls, to_email: str, token: str) -> bool:
        subject = "CodeMate AI — Verify your email address"
        plain_body = (
            f"Welcome to CodeMate AI!\n\n"
            f"Please verify your email address by submitting this verification token in your extension or web portal:\n\n"
            f"Verification Token: {token}\n\n"
            f"If you did not create this account, please ignore this email."
        )

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #080c15; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; color: #f8fafc;">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #a855f7); font-size: 22px; color: #ffffff;">⚡</div>
      <h2 style="margin: 12px 0 4px; font-size: 20px; font-weight: 700; color: #ffffff;">Welcome to CodeMate AI</h2>
      <p style="margin: 0; font-size: 13px; color: #94a3b8;">Your intelligent coding practice assistant for competitive programming.</p>
    </div>

    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">
      Please verify your email address to unlock AI problem explanations, test case analyzers, and optimal solution generation.
    </p>

    <div style="background-color: #030712; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
      <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 6px;">Your Verification Token</span>
      <span style="font-family: 'JetBrains Mono', monospace, Courier; font-size: 18px; font-weight: 700; color: #818cf8; letter-spacing: 0.1em; word-break: break-all;">{token}</span>
    </div>

    <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">
      If you did not sign up for CodeMate AI, please ignore this email. Your email address remains secure.
    </p>
  </div>
</body>
</html>"""

        return await cls.send_email(to_email, subject, plain_body, html_body=html_body)

    @classmethod
    async def send_password_reset_email(cls, to_email: str, token: str) -> bool:
        subject = "CodeMate AI — Password Reset Request"
        plain_body = (
            f"A password reset request was received for your CodeMate AI account.\n\n"
            f"Use the following secure token to reset your password:\n\n"
            f"Reset Token: {token}\n\n"
            f"This token expires in {settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS} hour(s).\n"
            f"If you did not request this change, your account remains secure."
        )

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset Request</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #080c15; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; color: #f8fafc;">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background: linear-gradient(135deg, #ef4444, #f59e0b); font-size: 22px; color: #ffffff;">🔐</div>
      <h2 style="margin: 12px 0 4px; font-size: 20px; font-weight: 700; color: #ffffff;">Reset Your Password</h2>
      <p style="margin: 0; font-size: 13px; color: #94a3b8;">A password reset request was received for your account.</p>
    </div>

    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">
      Use the secure token below to reset your password. This token expires in <strong>{settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS} hour(s)</strong>.
    </p>

    <div style="background-color: #030712; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
      <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 6px;">Reset Token</span>
      <span style="font-family: 'JetBrains Mono', monospace, Courier; font-size: 18px; font-weight: 700; color: #f87171; letter-spacing: 0.1em; word-break: break-all;">{token}</span>
    </div>

    <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">
      If you did not request a password reset, you can safely ignore this email. Your password will not change until you submit this token.
    </p>
  </div>
</body>
</html>"""

        return await cls.send_email(to_email, subject, plain_body, html_body=html_body)

    @classmethod
    async def send_security_alert(cls, to_email: str, event_type: str, details: str) -> bool:
        subject = f"CodeMate AI Security Alert: {event_type}"
        plain_body = (
            f"Security activity detected on your CodeMate AI account:\n\n"
            f"Event: {event_type}\n"
            f"Details: {details}\n\n"
            f"If this was not you, please log in immediately and terminate active sessions."
        )

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Security Alert</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #080c15; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; color: #f8fafc;">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background: linear-gradient(135deg, #f59e0b, #ef4444); font-size: 22px; color: #ffffff;">🛡️</div>
      <h2 style="margin: 12px 0 4px; font-size: 20px; font-weight: 700; color: #ffffff;">Security Alert</h2>
      <p style="margin: 0; font-size: 13px; color: #fca5a5;">{event_type}</p>
    </div>

    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">
      {details}
    </p>

    <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">
      If this was not you, please immediately log in to your CodeMate AI dashboard and revoke all active device sessions.
    </p>
  </div>
</body>
</html>"""

        return await cls.send_email(to_email, subject, plain_body, html_body=html_body)
