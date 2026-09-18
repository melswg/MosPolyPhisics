"""Проверки корневой страницы и локальных статических файлов."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_index_returns_html(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "МосПолиФизикс" in response.text


def test_index_uses_only_local_assets(client: TestClient) -> None:
    body = client.get("/").text

    assert "/static/css/styles.css" in body
    assert "/static/js/app.js" in body
    assert "http://" not in body
    assert "https://" not in body
    assert 'href="#"' not in body


def test_local_css_and_js_are_served(client: TestClient) -> None:
    css = client.get("/static/css/styles.css")
    script = client.get("/static/js/app.js")

    assert css.status_code == 200
    assert css.headers["content-type"].startswith("text/css")
    assert script.status_code == 200
    assert "javascript" in script.headers["content-type"]


def test_brand_assets_are_served(client: TestClient) -> None:
    logo = client.get("/assets/brand/logo.svg")
    mascot = client.get("/assets/brand/mas.svg")

    assert logo.status_code == 200
    assert mascot.status_code == 200
    assert logo.headers["content-type"].startswith("image/svg")


def test_missing_static_file_returns_404(client: TestClient) -> None:
    assert client.get("/static/css/absent.css").status_code == 404