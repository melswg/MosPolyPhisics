"""Отправка служебных писем без хранения секретов в исходном коде."""

from email.message import EmailMessage
import os
import smtplib


def send_password_reset(email: str, reset_url: str) -> bool:
    host = os.getenv("SMTP_HOST", "").strip()
    sender = os.getenv("SMTP_FROM", "").strip()
    if not host or not sender:
        return False

    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in {"1", "true", "yes"}

    message = EmailMessage()
    message["Subject"] = "Восстановление доступа к МосПолиФизикс"
    message["From"] = sender
    message["To"] = email
    message.set_content(
        "Чтобы задать новый пароль, откройте ссылку:\n\n"
        f"{reset_url}\n\n"
        "Ссылка действует 30 минут. Если вы не запрашивали восстановление, проигнорируйте письмо."
    )

    with smtplib.SMTP(host, port, timeout=15) as smtp:
        if use_tls:
            smtp.starttls()
        if username:
            smtp.login(username, password)
        smtp.send_message(message)
    return True
