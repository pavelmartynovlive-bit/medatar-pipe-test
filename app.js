const app = document.querySelector("#app");

const state = {
  screen: "home",
  history: [],
  uploadState: "empty",
  file: null,
  consents: {
    personal: false,
    medical: false,
  },
  recognitionRuns: 0,
  labUpdated: false,
  sheet: null,
};

const metrics = [
  { name: "Ферритин", value: "5 мг/моль", trend: "up" },
  { name: "Глюкоза", value: "4 г", trend: "down" },
  { name: "С-реактивный белок", value: "3%", trend: "ok" },
];

const recommendations = [
  { icon: "◉", title: "Гепатолог", subtitle: "Специалист по печени даст рекомендации" },
  { icon: "▴", title: "Анализы", subtitle: "15 показателей" },
];

const actions = [
  { icon: "⌁", title: "Ходить 5 000 шагов в день", subtitle: "Это позволит разгрузить печень" },
  { icon: "●", title: "Пить 1 литр воды в день", subtitle: "Это позволит разгрузить печень" },
  { icon: "◼", title: "Уменьшить потребление алкоголя", subtitle: "Это позволит разгрузить печень" },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatSize(bytes) {
  if (!bytes) return "0 МБ";
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} МБ`;
}

function fileType(file) {
  const fromName = file.name.split(".").pop() || "";
  return fromName.slice(0, 4).toUpperCase();
}

function navigate(screen) {
  if (state.screen !== screen) state.history.push(state.screen);
  state.screen = screen;
  render();
}

function back() {
  if (state.screen === "upload" && state.uploadState !== "empty") {
    resetUpload();
    render();
    return;
  }

  if (state.screen === "organ") {
    state.screen = "report";
    state.history = state.history.filter((screen) => screen !== "organ");
    render();
    return;
  }

  const previous = state.history.pop();
  state.screen = previous || "home";
  render();
}

function resetUpload() {
  state.uploadState = "empty";
  state.file = null;
  state.consents.personal = false;
  state.consents.medical = false;
  state.sheet = null;
}

function statusBar() {
  return `
    <div class="status-bar">
      <span>9:41</span>
      <span class="status-icons" aria-hidden="true">
        <span class="signal"><i></i><i></i><i></i><i></i></span>
        <span class="wifi"></span>
        <span class="battery"></span>
      </span>
    </div>
  `;
}

function topRow({ backButton = false, plus = false, close = false } = {}) {
  return `
    <div class="top-row">
      ${
        backButton
          ? `<button class="icon-button" data-action="${close ? "close-upload" : "back"}" aria-label="${close ? "Закрыть" : "Назад"}">${close ? "×" : "‹"}</button>`
          : `<span class="icon-button" aria-hidden="true"></span>`
      }
      ${
        plus
          ? `<button class="icon-button" data-action="open-upload" aria-label="Добавить результаты">+</button>`
          : `<span class="icon-button" aria-hidden="true"></span>`
      }
    </div>
  `;
}

function metricRows({ clickable = true } = {}) {
  return metrics
    .map((metric) => {
      const marker = metric.trend === "ok" ? `<span class="trend-dot"></span>` : `<span class="trend-up">${metric.trend === "up" ? "▲" : "▼"}</span>`;
      return `
        <button class="row" ${clickable ? `data-action="open-biomarker"` : ""}>
          <span class="row-main">
            <span class="row-title">${metric.name}</span>
          </span>
          <span class="value">${metric.value} ${marker}</span>
        </button>
      `;
    })
    .join("");
}

function recommendationCard() {
  return `
    <section class="card recommendation-card">
      <h2 class="section-title">Рекомендации</h2>
      ${recommendations
        .map(
          (item) => `
            <div class="recommendation-item">
              <span class="icon-well">${item.icon}</span>
              <span>
                <span class="row-title">${item.title}</span>
                <span class="row-subtitle">${item.subtitle}</span>
              </span>
            </div>
          `,
        )
        .join("")}
    </section>
  `;
}

function actionCard() {
  return `
    <section class="card action-card">
      <h2 class="section-title">Что делать</h2>
      ${actions
        .map(
          (item) => `
            <div class="action-item">
              <span class="icon-well">${item.icon}</span>
              <span>
                <span class="row-title">${item.title}</span>
                <span class="row-subtitle">${item.subtitle}</span>
              </span>
            </div>
          `,
        )
        .join("")}
    </section>
  `;
}

function promoCard(label = "Открыть полный отчёт") {
  return `
    <section class="card promo-card">
      <h2 class="promo-title">Узнайте причины и как снизить риски</h2>
      <button class="button" data-action="open-report">${label}</button>
      <span class="doc-art" aria-hidden="true"></span>
    </section>
  `;
}

function bottomNav(active = "health") {
  return `
    <nav class="bottom-nav" aria-label="Основная навигация">
      <button class="nav-item ${active === "health" ? "active" : ""}" data-action="open-home">
        <span class="nav-glyph">♥</span>
        <span>Здоровье</span>
      </button>
      <button class="nav-item ${active === "metrics" ? "active" : ""}" data-action="open-report">
        <span class="nav-glyph">≋</span>
        <span>Показатели</span>
      </button>
      <button class="nav-item ${active === "profile" ? "active" : ""}" data-action="placeholder">
        <span class="nav-glyph">◌</span>
        <span>Профиль</span>
      </button>
    </nav>
    <button class="floating-add" data-action="open-upload" aria-label="Добавить результаты">+</button>
  `;
}

function homeScreen() {
  const dateText = state.labUpdated ? "Данные обновлены 15.05" : "Данные от 18.02";
  return `
    <div class="phone">
      <section class="screen">
        ${statusBar()}
        <div class="date-label">${dateText}</div>
        <h1 class="page-title">Ваше здоровье</h1>
        ${state.labUpdated ? `<div class="updated-meta home-updated"><span class="updated-pill">Обновлено</span><span>12 показателей добавлено</span></div>` : ""}
        <div class="home-summary">
          <div><span class="score-number">7</span> <span class="score-unit">/10</span></div>
          <span class="status-pill">В норме</span>
          <button class="button secondary chevron" data-action="open-report">Подробнее</button>
        </div>
        <div class="content-stack">
          <section class="card metric-card">
            <div class="card-header">
              <h2 class="section-title">Показатели</h2>
              <span class="chevron" aria-hidden="true"></span>
            </div>
            ${metricRows()}
          </section>
          ${promoCard()}
          ${recommendationCard()}
          ${actionCard()}
          <p class="legal-note">Приложение Medatar предназначено исключительно для информационных целей и не представляет собой медицинское устройство. Оно не является заменой профессиональной медицинской консультации, диагностики или лечения.</p>
        </div>
      </section>
      ${bottomNav("health")}
    </div>
  `;
}

function reportScreen() {
  const reportDate = state.labUpdated ? "Отчёт обновлён 15.05" : "Отчёт от 18.02";
  return `
    <div class="phone">
      <section class="screen hero-screen">
        ${statusBar()}
        ${topRow({ backButton: true, plus: true })}
        <section class="report-hero">
          <div class="ring-art" aria-hidden="true"></div>
          <div class="small subtle">${reportDate}</div>
          <h1 class="hero-title">Состояние здоровья</h1>
          <div class="hero-score">7 <span class="score-unit">/10</span></div>
          <p class="subtle">В норме, поддерживайте,<br />Забота поможет снизить риски</p>
          ${state.labUpdated ? `<div class="updated-meta centered"><span class="updated-pill">Обновлено</span><span>12 показателей добавлено</span></div>` : ""}
        </section>
        <div class="content-stack">
          <section class="card">
            <div class="card-header">
              <h2 class="section-title">Органы</h2>
            </div>
            <div class="organ-strip">
              <button class="organ-card" data-action="open-organ">
                <span class="organ-name">Сердце</span>
                <span class="organ-score">7<span> /10</span></span>
                <span class="heart-art" aria-hidden="true"></span>
              </button>
              <button class="organ-card" data-action="open-organ">
                <span class="organ-name">Печень</span>
                <span class="organ-score">5<span> /10</span></span>
                <span class="liver-art" aria-hidden="true"></span>
              </button>
            </div>
          </section>
          <section class="card metric-card">
            <div class="card-header">
              <h2 class="section-title">Показатели</h2>
              <span class="chevron" aria-hidden="true"></span>
            </div>
            ${metricRows()}
          </section>
          ${promoCard()}
          <section class="card">
            <div class="card-header">
              <h2 class="section-title">Биологический возраст</h2>
              <span class="chevron" aria-hidden="true"></span>
            </div>
            <div class="age-row">
              <div>
                <div class="score-number" style="font-size: 24px;">47</div>
                <div class="subtle">На 3 года моложе<br />паспортного</div>
              </div>
              <div class="bars" aria-hidden="true">
                <span style="height: 18px" class="active"></span>
                <span style="height: 24px" class="active"></span>
                <span style="height: 27px" class="active"></span>
                <span style="height: 31px" class="active"></span>
                <span style="height: 34px" class="active"></span>
                <span style="height: 28px" class="active"></span>
                <span style="height: 22px"></span>
                <span style="height: 18px"></span>
                <span style="height: 14px"></span>
              </div>
            </div>
          </section>
          ${recommendationCard()}
          ${actionCard()}
          <button class="button">Экспортировать</button>
          <p class="legal-note">Приложение Medatar предназначено исключительно для информационных целей и не представляет собой медицинское устройство.</p>
        </div>
      </section>
    </div>
  `;
}

function organScreen() {
  return `
    <div class="phone">
      <section class="screen">
        ${statusBar()}
        ${topRow({ backButton: true, plus: true })}
        <section class="organ-hero">
          <h1 class="page-title">Сердце</h1>
          <span class="heart-art big-heart" aria-hidden="true"></span>
          <div class="card status-card">
            <div>
              <h2 class="section-title">В норме,<br />поддерживайте</h2>
              <p class="subtle">Забота поможет снизить риски</p>
              <p class="small subtle">На основе показателей</p>
            </div>
            <div class="score-ring" aria-label="7 из 10">
              <div class="score-ring-inner">7<span>/10</span></div>
            </div>
          </div>
        </section>
        <div class="content-stack">
          <div class="mini-grid">
            <section class="mini-card">
              <h2 class="section-title">Стало лучше</h2>
              <p class="subtle">+0.5 за полгода</p>
              <div class="sparkline"></div>
            </section>
            <section class="mini-card">
              <h2 class="section-title">Ниже среднего</h2>
              <p class="subtle">По возрасту</p>
              <div class="comparison-line"></div>
            </section>
          </div>
          <section class="card metric-card">
            <div class="card-header">
              <h2 class="section-title">Показатели</h2>
              <span class="chevron" aria-hidden="true"></span>
            </div>
            ${metricRows()}
          </section>
          <section class="card risk-card">
            <h2 class="section-title">Есть риски заболеваний</h2>
            <div class="risk-list">
              <div class="risk-chip">
                <div class="row-title">Инфаркт</div>
                <div class="row-subtitle">Низкий</div>
              </div>
              <div class="risk-chip">
                <div class="row-title">Тромбоз двухсторонний</div>
                <div class="row-subtitle">Средний <span class="trend-up">▲</span></div>
              </div>
            </div>
          </section>
          ${promoCard("Полный отчёт")}
          ${recommendationCard()}
          ${actionCard()}
          <button class="button">Экспортировать</button>
          <p class="legal-note">Приложение Medatar предназначено исключительно для информационных целей и не представляет собой медицинское устройство.</p>
        </div>
      </section>
    </div>
  `;
}

function biomarkerScreen() {
  return `
    <div class="phone">
      <section class="screen">
        ${statusBar()}
        ${topRow({ backButton: true, plus: true })}
        <section class="biomarker-hero">
          <div class="date-label">Данные от 18.02</div>
          <h1 class="page-title compact">С-реактивный<br />белок</h1>
          <div class="card value-card">
            <div>
              <h2 class="section-title">Повышен</h2>
              <p class="subtle">На 1.2 выше нормы возраста,<br />0.5 личной нормы</p>
              <p class="small subtle">О нормах показателей <span class="chevron"></span></p>
            </div>
            <div class="value-number"><span class="warning-mark">▲</span>300 <span>г/ммоль</span></div>
          </div>
        </section>
        <div class="content-stack">
          <div class="mini-grid">
            <section class="mini-card">
              <h2 class="section-title">Стало лучше</h2>
              <p class="subtle">+0.5 за полгода</p>
              <div class="sparkline"></div>
            </section>
            <section class="mini-card">
              <h2 class="section-title">Так у многих</h2>
              <p class="subtle">людей вашего возраста</p>
              <div class="comparison-line"></div>
            </section>
          </div>
          <section class="card info-card">
            <h3>О биомаркере</h3>
            <p class="body-copy">Ферритин представляет собой особый белковый комплекс, выполняющий роль депо для железа в организме. Его синтез происходит в печени, костном мозге и селезёнке, после чего происходит распределение по тканям и клеткам.</p>
          </section>
          <section class="card info-card">
            <h3>Причины</h3>
            <p class="body-copy">Когда анализ показывает, что ферритин понижен, это сигнал: запасы железа истощены, и организм может не хватать ресурса для нормальной работы клеток.</p>
          </section>
          <section class="card info-card">
            <h3>Почему это важно</h3>
            <p class="body-copy">Ключевая функция ферритина — аккумулировать железо и мягко поддерживать обменные процессы и активность ферментов.</p>
          </section>
          ${recommendationCard()}
          <button class="button">Экспортировать</button>
          <p class="legal-note">Приложение Medatar предназначено исключительно для информационных целей и не представляет собой медицинское устройство.</p>
        </div>
      </section>
    </div>
  `;
}

function uploadIntroList() {
  return `
    <ul class="intro-list">
      <li>Подойдут результаты за последние годы</li>
      <li>Каждый файл должен весить до 10 МБ</li>
      <li>Файлы будут обработаны без участия людей</li>
    </ul>
  `;
}

function consentRows() {
  return `
    <div class="checkboxes">
      <button class="check-row ${state.consents.personal ? "checked" : ""}" data-action="toggle-personal">
        <span class="checkbox-box" aria-hidden="true"></span>
        <span>Согласен с <span class="legal-link">правилами обработки персональных данных</span></span>
      </button>
      <button class="check-row ${state.consents.medical ? "checked" : ""}" data-action="toggle-medical">
        <span class="checkbox-box" aria-hidden="true"></span>
        <span>Согласен с <span class="legal-link">правилами обработки медицинских данных</span></span>
      </button>
    </div>
  `;
}

function uploadEmpty() {
  return `
    <div class="upload-layout">
      <h1 class="upload-title tight">Загрузите результаты ваших анализов</h1>
      ${uploadIntroList()}
      <section class="upload-card">
        <div>
          <div class="upload-art" aria-hidden="true"></div>
          <h2 class="section-title">Загрузите фото или PDF</h2>
          <p class="upload-helper">Выберите файл с результатами анализов</p>
          <button class="button" data-action="select-file">Загрузить файл</button>
        </div>
      </section>
      ${consentRows()}
      <div class="bottom-cta">
        <button class="button" disabled>Продолжить</button>
      </div>
      <input id="file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" hidden />
    </div>
  `;
}

function uploadSelected() {
  const file = state.file;
  const enabled = state.consents.personal && state.consents.medical;
  return `
    <div class="upload-layout">
      <h1 class="upload-title tight">Загрузите результаты ваших анализов</h1>
      ${uploadIntroList()}
      <section class="card">
        <div class="selected-file">
          <span class="file-badge">${escapeHtml(file.typeLabel)}</span>
          <span>
            <span class="row-title">${escapeHtml(file.name)}</span>
            <span class="row-subtitle">${escapeHtml(file.typeLabel)} · ${escapeHtml(file.sizeLabel)}</span>
          </span>
          <button class="icon-button soft" data-action="remove-file" aria-label="Удалить файл">×</button>
        </div>
      </section>
      ${consentRows()}
      <div class="bottom-cta">
        <button class="button" data-action="start-recognition" ${enabled ? "" : "disabled"}>Продолжить</button>
      </div>
      <input id="file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" hidden />
    </div>
  `;
}

function uploadProgress() {
  return `
    <div class="upload-layout">
      <h1 class="upload-title tight">Распознаём показатели</h1>
      <section class="card progress-card">
        <h2 class="section-title">Распознаём показатели</h2>
        <p class="subtle">Обычно это занимает несколько секунд</p>
        <div class="loader" aria-hidden="true"></div>
        <p class="row-subtitle">${state.file ? escapeHtml(state.file.name) : "Файл выбран"}</p>
      </section>
      <div class="checkboxes"></div>
      <div class="bottom-cta">
        <button class="button ghost" data-action="reset-upload">Отменить</button>
      </div>
    </div>
  `;
}

function uploadError() {
  return `
    <div class="upload-layout">
      <h1 class="upload-title tight">Не всё удалось распознать</h1>
      <section class="card warning-card">
        <div class="recommendation-item">
          <span class="icon-well">!</span>
          <span>
            <h2 class="section-title">Часть данных не распознана</h2>
            <span class="subtle">Мы распознали часть показателей, но некоторые значения нужно проверить вручную.</span>
          </span>
        </div>
        <ul class="issue-list">
          <li>СРБ — не удалось прочитать значение</li>
          <li>Ферритин — не распознана единица измерения</li>
        </ul>
      </section>
      <div class="checkboxes"></div>
      <div class="bottom-cta stack">
        <button class="button" data-action="manual-correction">Исправить вручную</button>
        <div class="action-row">
          <button class="button secondary" data-action="reset-upload">Загрузить заново</button>
          <button class="text-button" data-action="upload-success">Продолжить с распознанными</button>
        </div>
      </div>
    </div>
  `;
}

function uploadSuccess() {
  return `
    <div class="upload-layout">
      <h1 class="upload-title tight">Результаты добавлены</h1>
      <section class="card success-card">
        <div class="recommendation-item">
          <span class="icon-well">✓</span>
          <span>
            <h2 class="section-title">Результаты добавлены</h2>
            <span class="subtle">Мы обновили показатели и пересчитали отчёт.</span>
          </span>
        </div>
        <div class="risk-list" style="margin-top: 12px;">
          <div class="risk-chip">
            <div class="row-title">12 показателей</div>
            <div class="row-subtitle">распознано</div>
          </div>
          <div class="risk-chip">
            <div class="row-title">2 показателя</div>
            <div class="row-subtitle">требуют проверки</div>
          </div>
        </div>
      </section>
      <div class="checkboxes"></div>
      <div class="bottom-cta stack">
        <button class="button" data-action="success-report">Перейти к отчёту</button>
        <button class="button secondary" data-action="reset-upload">Добавить ещё файл</button>
      </div>
    </div>
  `;
}

function uploadBody() {
  if (state.uploadState === "selected") return uploadSelected();
  if (state.uploadState === "progress") return uploadProgress();
  if (state.uploadState === "error") return uploadError();
  if (state.uploadState === "success") return uploadSuccess();
  return uploadEmpty();
}

function sheet() {
  if (!state.sheet) return "";

  return `
    <div class="sheet-backdrop" data-action="close-sheet">
      <section class="sheet" role="dialog" aria-modal="true" aria-label="Исправить вручную">
        <div class="sheet-handle"></div>
        <h2 class="section-title">Проверка вручную</h2>
        <p class="body-copy">В прототипе этот шаг показан как заглушка. Можно продолжить с распознанными значениями или загрузить файл заново.</p>
        <button class="button" data-action="upload-success">Продолжить</button>
      </section>
    </div>
  `;
}

function uploadScreen() {
  const close = state.uploadState === "success";
  return `
    <div class="phone">
      <section class="screen upload-screen">
        ${statusBar()}
        ${topRow({ backButton: true, close })}
        ${uploadBody()}
      </section>
      ${sheet()}
    </div>
  `;
}

function placeholderScreen() {
  return `
    <div class="phone">
      <section class="screen">
        ${statusBar()}
        ${topRow({ backButton: true })}
        <div class="screen-placeholder">
          <div>
            <h1 class="page-title">Профиль</h1>
            <p class="subtle">Раздел оставлен как визуальная заглушка для нижней навигации.</p>
          </div>
        </div>
      </section>
    </div>
  `;
}

function render() {
  const screens = {
    home: homeScreen,
    report: reportScreen,
    organ: organScreen,
    biomarker: biomarkerScreen,
    upload: uploadScreen,
    placeholder: placeholderScreen,
  };

  app.innerHTML = screens[state.screen]();
  bindFileInput();
}

function bindFileInput() {
  const input = document.querySelector("#file-input");
  if (!input) return;

  input.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    state.file = {
      name: file.name,
      sizeLabel: formatSize(file.size),
      typeLabel: fileType(file),
    };
    state.uploadState = "selected";
    render();
  });
}

function startRecognition() {
  state.uploadState = "progress";
  state.recognitionRuns += 1;
  render();

  window.setTimeout(() => {
    if (state.screen !== "upload" || state.uploadState !== "progress") return;
    state.uploadState = state.recognitionRuns === 1 ? "error" : "success";
    render();
  }, 1350);
}

app.addEventListener("click", (event) => {
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) return;

  const action = actionTarget.dataset.action;
  if (action !== "noop") event.preventDefault();

  const actionsMap = {
    "open-home": () => {
      state.screen = "home";
      state.history = [];
      render();
    },
    "open-report": () => navigate("report"),
    "open-organ": () => navigate("organ"),
    "open-biomarker": () => navigate("biomarker"),
    "open-upload": () => navigate("upload"),
    "open-placeholder": () => navigate("placeholder"),
    placeholder: () => navigate("placeholder"),
    back,
    "close-upload": () => {
      resetUpload();
      state.screen = "home";
      state.history = [];
      render();
    },
    "select-file": () => document.querySelector("#file-input")?.click(),
    "remove-file": () => {
      state.file = null;
      state.uploadState = "empty";
      render();
    },
    "toggle-personal": () => {
      state.consents.personal = !state.consents.personal;
      render();
    },
    "toggle-medical": () => {
      state.consents.medical = !state.consents.medical;
      render();
    },
    "start-recognition": startRecognition,
    "reset-upload": () => {
      resetUpload();
      render();
    },
    "manual-correction": () => {
      state.sheet = "manual";
      render();
    },
    "close-sheet": () => {
      state.sheet = null;
      render();
    },
    "upload-success": () => {
      state.sheet = null;
      state.uploadState = "success";
      render();
    },
    "success-report": () => {
      state.labUpdated = true;
      resetUpload();
      state.screen = "report";
      state.history = ["home"];
      render();
    },
    noop: () => {},
  };

  actionsMap[action]?.();
});

render();
