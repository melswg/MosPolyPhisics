from unittest.mock import MagicMock

import pytest

from backend import email_service


@pytest.fixture()
def smtp_client(monkeypatch):
    for key, value in {
        "SMTP_HOST": "smtp.example.org", "SMTP_PORT": "587",
        "SMTP_USERNAME": "test-user", "SMTP_PASSWORD": "test-password",
        "SMTP_FROM": "noreply@example.org", "SMTP_USE_TLS": "true", "SMTP_USE_SSL": "false",
    }.items():
        monkeypatch.setenv(key, value)
    client = MagicMock()
    client.__enter__.return_value = client
    plain = MagicMock(return_value=client)
    secure = MagicMock(return_value=client)
    monkeypatch.setattr(email_service.smtplib, "SMTP", plain)
    monkeypatch.setattr(email_service.smtplib, "SMTP_SSL", secure)
    return client, plain, secure


def test_starttls_before_authentication_and_send(smtp_client):
    client, plain, secure = smtp_client
    assert email_service.send_password_reset("reader@example.org", "https://example.org/reset?token=test")
    plain.assert_called_once_with("smtp.example.org", 587, timeout=15)
    secure.assert_not_called()
    assert [call[0] for call in client.method_calls] == ["ehlo", "starttls", "ehlo", "login", "send_message"]
    context = client.starttls.call_args.kwargs["context"]
    assert context.check_hostname
    message = client.send_message.call_args.args[0]
    assert message["From"] == "noreply@example.org"
    assert message["To"] == "reader@example.org"
    assert "https://example.org/reset?token=test" in message.get_content()


def test_implicit_tls_on_465(smtp_client, monkeypatch):
    client, plain, secure = smtp_client
    monkeypatch.setenv("SMTP_PORT", "465")
    monkeypatch.setenv("SMTP_USE_SSL", "true")
    monkeypatch.setenv("SMTP_USE_TLS", "false")
    with email_service.smtp_connection():
        pass
    plain.assert_not_called()
    assert secure.call_args.args == ("smtp.example.org", 465)
    assert secure.call_args.kwargs["context"].check_hostname
    client.starttls.assert_not_called()
    client.login.assert_called_once_with("test-user", "test-password")


def test_missing_config_never_connects(smtp_client, monkeypatch):
    _, plain, secure = smtp_client
    monkeypatch.setenv("SMTP_HOST", "")
    assert not email_service.send_password_reset("reader@example.org", "https://example.org/reset")
    plain.assert_not_called()
    secure.assert_not_called()


def test_missing_password_never_connects(smtp_client, monkeypatch):
    _, plain, secure = smtp_client
    monkeypatch.setenv("SMTP_PASSWORD", "")
    with pytest.raises(ValueError, match="SMTP_PASSWORD"):
        with email_service.smtp_connection():
            pass
    plain.assert_not_called()
    secure.assert_not_called()


def test_conflicting_security_modes_never_connect(smtp_client, monkeypatch):
    _, plain, secure = smtp_client
    monkeypatch.setenv("SMTP_USE_SSL", "true")
    with pytest.raises(ValueError, match="not both"):
        with email_service.smtp_connection():
            pass
    plain.assert_not_called()
    secure.assert_not_called()
