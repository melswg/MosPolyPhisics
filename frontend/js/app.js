const STATUS_MESSAGES = {
  loading: "Проверяем соединение с API…",
  ok: "API отвечает: сервис работает.",
  empty: "API ответил, но состояние сервиса не указано.",
  error: "API недоступен. Проверьте, запущен ли сервер на 127.0.0.1:8011.",
};

function renderStatus(state, details) {
  const container = document.getElementById("service-status");
  const text = document.getElementById("service-status-text");
  const retry = document.getElementById("service-status-retry");

  if (!container || !text || !retry) {
    return;
  }

  container.dataset.state = state;
  text.textContent = details ? `${STATUS_MESSAGES[state]} ${details}` : STATUS_MESSAGES[state];
  retry.hidden = state !== "error";
}

function describeHealth(payload) {
  if (!payload || typeof payload !== "object" || !payload.status) {
    return null;
  }

  if (payload.database === "ok") {
    return `База данных доступна, версия схемы: ${payload.schema_version}.`;
  }

  return null;
}

async function checkHealth() {
  renderStatus("loading");

  try {
    const response = await fetch("/api/health", { headers: { Accept: "application/json" } });
    if (!response.ok) {
      renderStatus("error", `Код ответа: ${response.status}.`);
      return;
    }

    const payload = await response.json();
    const details = describeHealth(payload);
    renderStatus(details ? "ok" : "empty", details);
  } catch (error) {
    renderStatus("error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const retry = document.getElementById("service-status-retry");
  if (retry) {
    retry.addEventListener("click", checkHealth);
  }
  checkHealth();
});
