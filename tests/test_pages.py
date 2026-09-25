"""Проверки страниц сайта и локальных статических файлов."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.routes.pages import PAGE_FILES

PUBLIC_PAGES = ["/"] + sorted(PAGE_FILES)

TECHNICAL_WORDS = ("api", "sqlite", "fastapi", "health", "localhost", "127.0.0.1", "база данных", "endpoint")


@pytest.mark.parametrize("path", PUBLIC_PAGES)
def test_page_returns_html(client: TestClient, path: str) -> None:
    response = client.get(path)

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")


@pytest.mark.parametrize("path", PUBLIC_PAGES)
def test_page_has_common_shell(client: TestClient, path: str) -> None:
    body = client.get(path).text

    assert '<html lang="ru"' in body
    assert 'class="header"' in body
    assert 'class="footer"' in body
    assert "Перейти к содержанию" in body
    assert "/static/css/styles.css" in body
    assert "/static/js/site.js" in body
    assert "/static/js/theme-init.js" in body


@pytest.mark.parametrize("path", PUBLIC_PAGES)
def test_page_uses_local_assets_only(client: TestClient, path: str) -> None:
    body = client.get(path).text

    assert "https://" not in body
    assert 'href="#"' not in body


@pytest.mark.parametrize("path", PUBLIC_PAGES)
def test_page_shows_no_technical_information(client: TestClient, path: str) -> None:
    body = client.get(path).text.lower()
    found = [word for word in TECHNICAL_WORDS if word in body]

    assert found == []


@pytest.mark.parametrize("path", PUBLIC_PAGES)
def test_page_has_title_and_single_main_heading(client: TestClient, path: str) -> None:
    body = client.get(path).text

    assert "<title>" in body
    assert body.count("<h1") == 1


def test_unknown_page_returns_404(client: TestClient) -> None:
    assert client.get("/nope").status_code == 404


def test_local_css_and_js_are_served(client: TestClient) -> None:
    css = client.get("/static/css/styles.css")
    script = client.get("/static/js/site.js")
    theme = client.get("/static/js/theme-init.js")

    assert css.status_code == 200
    assert css.headers["content-type"].startswith("text/css")
    assert script.status_code == 200
    assert "javascript" in script.headers["content-type"]
    assert theme.status_code == 200


def test_styles_declare_both_themes(client: TestClient) -> None:
    css = client.get("/static/css/styles.css").text

    assert ':root[data-theme="light"]' in css
    assert "--radius-header: 30px" in css


def test_brand_assets_are_served(client: TestClient) -> None:
    logo = client.get("/assets/brand/logo.svg")
    mascot = client.get("/assets/brand/mas.svg")
    user = client.get("/assets/brand/icons/user-circle.svg")

    assert logo.status_code == 200
    assert mascot.status_code == 200
    assert user.status_code == 200
    assert logo.headers["content-type"].startswith("image/svg")


def test_missing_static_file_returns_404(client: TestClient) -> None:
    assert client.get("/static/css/absent.css").status_code == 404
