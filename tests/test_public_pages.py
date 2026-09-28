import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def page_client(tmp_path, monkeypatch):
    monkeypatch.setenv("MOSPHYSICS_DATABASE", str(tmp_path / "pages.sqlite"))
    import backend.main as main

    importlib.reload(main)
    with TestClient(main.app) as client:
        yield client, main


def test_approved_public_pages_and_assets_are_served(page_client):
    client, main = page_client

    for path in ["/", *main.PAGE_FILES]:
        response = client.get(path)
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/html")
        assert 'class="header"' in response.text
        assert 'class="footer"' in response.text
        assert "/static/css/styles.css" in response.text
        assert "/static/js/site.js" in response.text
        assert 'href="#"' not in response.text

    for path in (
        "/static/css/styles.css",
        "/static/js/site.js",
        "/static/js/theme-init.js",
        "/assets/brand/logo.svg",
        "/assets/brand/mas.svg",
    ):
        assert client.get(path).status_code == 200


def test_legacy_page_urls_redirect_to_new_routes(page_client):
    client, main = page_client

    for old_path, new_path in main.LEGACY_PAGE_ROUTES.items():
        response = client.get(old_path, follow_redirects=False)
        assert response.status_code == 308
        assert response.headers["location"] == new_path


def test_auth_forms_are_connected_to_real_handlers(page_client):
    client, _ = page_client

    assert "data-login-form" in client.get("/login").text
    assert "data-register-form" in client.get("/register").text
    assert "data-password-reset-request" in client.get("/password-reset").text
    assert "data-password-reset-confirm" in client.get("/password-reset/confirm").text
    register_page = client.get("/register").text
    assert "accepted_personal_data_processing" in register_page
    assert 'href="/privacy-consent"' in register_page
    assert "Согласие на обработку персональных данных" in client.get("/privacy-consent").text

    script = client.get("/static/js/site.js").text
    for endpoint in (
        "/api/login",
        "/api/register",
        "/api/logout",
        "/api/user/me",
        "/api/password-reset/request",
        "/api/password-reset/confirm",
    ):
        assert endpoint in script


def test_projects_rows_are_keyboard_accessible_links(page_client):
    client, _ = page_client
    body = client.get("/projects").text

    assert body.count('class="row row--link"') == 4
    assert body.count('class="row__link"') == 4
    for target in ("/video", "/calendar", "/novel", "/about"):
        assert f'class="row__link" href="{target}"' in body


def test_public_content_does_not_describe_project_as_practice(page_client):
    client, main = page_client

    for path in ["/", *main.PAGE_FILES]:
        body = client.get(path).text.lower()
        assert "практик" not in body
        assert "09.03.02" not in body


def test_about_uses_confirmed_project_description_and_rubrics(page_client):
    client, _ = page_client
    body = client.get("/about").text

    for rubric in (
        "Видео",
        "Комиксы",
        "Календари",
        "Дни рождения",
        "Историческая справка",
        "Физики говорят",
    ):
        assert rubric in body

    assert "Ксения Гудкова" in body
    assert "Что будет в кабинете" not in client.get("/account").text
