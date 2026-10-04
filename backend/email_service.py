"""Отправка служебных писем без хранения секретов в исходном коде."""

from email.message import EmailMessage
from contextlib import contextmanager
import os
import smtplib
import ssl
from typing import Iterator


@contextmanager
def smtp_connection() -> Iterator[smtplib.SMTP]:
    host = os.getenv("SMTP_HOST", "").strip()
    if not host:
        raise ValueError("SMTP_HOST is not configured")
    port = int(os.getenv("SMTP_PORT", "") or "587")
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in {"1", "true", "yes"}
    use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() in {"1", "true", "yes"}
    if use_ssl and use_tls:
        raise ValueError("Select SMTP_USE_SSL or SMTP_USE_TLS, not both")
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    if username and not password:
        raise ValueError("SMTP_PASSWORD is not configured")
    context = ssl.create_default_context()
    client = (smtplib.SMTP_SSL(host, port, timeout=15, context=context) if use_ssl
              else smtplib.SMTP(host, port, timeout=15))
    with client as smtp:
        smtp.ehlo()
        if use_tls:
            smtp.starttls(context=context)
            smtp.ehlo()
        if username:
            smtp.login(username, password)
        yield smtp


def send_password_reset(email: str, reset_url: str) -> bool:
    host = os.getenv("SMTP_HOST", "").strip()
    sender = os.getenv("SMTP_FROM", "").strip()
    if not host or not sender:
        return False

    message = EmailMessage()
    message["Subject"] = "Восстановление доступа к МосПолиФизикс"
    message["From"] = sender
    message["To"] = email
    message.set_content(
        "Чтобы задать новый пароль, откройте ссылку:\n\n"
        f"{reset_url}\n\n"
        "Ссылка действует 30 минут. Если вы не запрашивали восстановление, проигнорируйте письмо."
    )

    with smtp_connection() as smtp:
        smtp.send_message(message)
    return True
