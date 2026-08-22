(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);

  const formatMoney = (value) => `${Math.max(0, Number(value) || 0).toLocaleString("ru-RU")} ₽`;
  const compactMoney = (value) => {
    const amount = Math.max(0, Number(value) || 0);
    if (amount >= 1000 && amount % 1000 === 0) return `${amount / 1000}К`;
    return amount.toLocaleString("ru-RU");
  };

  function substitutions(settings) {
    return {
      donationMin: Math.max(0, Number(settings.donationMin) || 0).toLocaleString("ru-RU"),
      streamTarget: Math.max(0, Number(settings.streamTarget) || 0).toLocaleString("ru-RU"),
      streamTargetStep: Math.max(0, Number(settings.streamTargetStep) || 0).toLocaleString("ru-RU"),
      schedule: String(settings.schedule || "")
    };
  }

  function substitute(value, settings) {
    const values = substitutions(settings);
    return String(value ?? "").replace(/{{(donationMin|streamTarget|streamTargetStep|schedule)}}/g, (_, key) => values[key]);
  }

  function inlineMarkup(value, settings) {
    const text = substitute(value, settings);
    let cursor = 0;
    let html = "";
    const pattern = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
    let match;
    while ((match = pattern.exec(text))) {
      html += escapeHtml(text.slice(cursor, match.index));
      const label = escapeHtml(match[1].trim());
      const href = escapeHtml(match[2].trim());
      html += `<a class="inline-link" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      cursor = match.index + match[0].length;
    }
    html += escapeHtml(text.slice(cursor));
    return html;
  }

  function ideaImage(idea, className) {
    if (!idea.image) return "";
    return `<img class="${className}" src="${escapeHtml(idea.image)}" alt="" loading="lazy" decoding="async" fetchpriority="low">`;
  }

  function actionLinks(idea) {
    const links = [];
    if (idea.watchUrl) links.push(`<a href="${escapeHtml(idea.watchUrl)}" target="_blank" rel="noopener noreferrer">Смотреть</a>`);
    if (idea.modsUrl) links.push(`<a href="${escapeHtml(idea.modsUrl)}" target="_blank" rel="noopener noreferrer">Моды</a>`);
    return links.join(" ");
  }

  function rowCard(idea, { showAmount = false } = {}) {
    const hasImage = Boolean(idea.image);
    return `<article class="idea-row${hasImage ? "" : " idea-row--no-image"}">
      ${ideaImage(idea, "idea-row__image")}
      <div class="idea-row__body">
        <strong>${escapeHtml(idea.name || "Без названия")}</strong>
        ${idea.description ? `<p>${escapeHtml(idea.description)}</p>` : ""}
        ${showAmount ? `<span class="idea-amount">${formatMoney(idea.amount)}</span>` : ""}
        ${actionLinks(idea)}
      </div>
    </article>`;
  }

  function renderRules(listSelector, rows, settings) {
    const mount = $(listSelector);
    if (!mount) return;
    const safeRows = Array.isArray(rows) ? rows : [];
    mount.innerHTML = safeRows.map((row, index) => `<li><b>${String(index + 1).padStart(2, "0")}</b><span>${inlineMarkup(row, settings)}</span></li>`).join("");
  }

  function renderContent(content) {
    const rawSettings = content?.settings || {};
    const legacyGoalSettings = rawSettings.streamTargetStep === undefined || rawSettings.streamTargetStep === null;
    const settings = { ...rawSettings };
    if (legacyGoalSettings) { settings.streamTarget = 13000; settings.streamTargetStep = 1000; }
    if (!settings.weekdaysTime) settings.weekdaysTime = "17:00";
    if (!settings.weekendTime) settings.weekendTime = "15:00";
    const rules = content?.rules || {};
    const ideas = Array.isArray(content?.ideas) ? content.ideas : [];

    const setText = (selector, value) => { const el = $(selector); if (el) el.textContent = value; };
    setText("#hero-season-label", settings.seasonLabel || "Римафон · сезон 2");
    const heroTitle = $("#hero-title");
    if (heroTitle) {
      const title = String(settings.heroTitle || "Вы выбираете следующую колонию");
      const marker = "следующую";
      const at = title.toLocaleLowerCase("ru").indexOf(marker);
      heroTitle.innerHTML = at >= 0
        ? `${escapeHtml(title.slice(0, at))}<span class="accent-stroke">${escapeHtml(title.slice(at, at + marker.length))}</span>${escapeHtml(title.slice(at + marker.length))}`
        : escapeHtml(title);
    }
    setText("#hero-description", settings.heroDescription || "");
    setText("#stream-target", compactMoney(settings.streamTarget));
    setText("#goal-current-target", formatMoney(settings.streamTarget));
    setText("#goal-step", formatMoney(settings.streamTargetStep));
    setText("#schedule-weekdays", settings.weekdaysTime || "17:00");
    setText("#schedule-weekend", settings.weekendTime || "15:00");
    document.querySelectorAll("[data-donation-min]").forEach((el) => { el.textContent = Math.max(0, Number(settings.donationMin) || 0).toLocaleString("ru-RU"); });

    renderRules("#adding-rules", rules.adding, settings);
    renderRules("#format-rules", rules.formats, settings);
    renderRules("#new-game-rules", rules.newGame, settings);
    setText("#adding-example", substitute(rules.addingExample || "", settings));
    setText("#formats-note", substitute(rules.formatsNote || "", settings));
    setText("#new-game-title", rules.newGameTitle || "Лот «Новая игра»");
    setText("#new-game-intro", substitute(rules.newGameIntro || "", settings));
    setText("#new-game-note", substitute(rules.newGameNote || "", settings));

    const current = ideas.find((idea) => idea.status === "current");
    const upcoming = ideas.filter((idea) => idea.status === "upcoming");
    const roulette = ideas.filter((idea) => idea.status === "roulette").sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
    const finished = ideas.filter((idea) => idea.status === "finished");

    setText("#hero-ideas-count", roulette.length);
    setText("#possible-count", roulette.length);
    setText("#hero-colonies-count", upcoming.length + (current ? 1 : 0));
    setText("#upcoming-count", upcoming.length);
    setText("#finished-count", finished.length);

    const currentMount = $("#current-colony");
    if (currentMount && current) {
      currentMount.className = "current-idea";
      currentMount.innerHTML = `${ideaImage(current, "current-idea__image")}<div class="current-idea__body"><h3>${escapeHtml(current.name)}</h3>${current.description ? `<p>${escapeHtml(current.description)}</p>` : ""}${actionLinks(current)}</div>`;
    }

    const upcomingMount = $("#upcoming-list");
    if (upcomingMount) {
      if (upcoming.length) {
        upcomingMount.className = "ideas-list";
        upcomingMount.innerHTML = upcoming.map((idea) => rowCard(idea)).join("");
      } else {
        upcomingMount.className = "queue-empty";
        upcomingMount.textContent = "Пока нет запланированных колоний.";
      }
    }

    const rouletteMount = $("#possible-list");
    if (rouletteMount) {
      if (roulette.length) {
        rouletteMount.className = "ideas-list";
        rouletteMount.innerHTML = roulette.map((idea) => rowCard(idea, { showAmount: true })).join("");
      } else {
        rouletteMount.className = "queue-empty ideas-list";
        rouletteMount.textContent = "Сейчас в рулетке нет идей.";
      }
    }

    const finishedSection = $("#finished");
    const finishedMount = $("#finished-list");
    if (finishedSection && finishedMount) {
      finishedSection.hidden = !finished.length;
      finishedMount.innerHTML = finished.map((idea) => rowCard(idea)).join("");
    }
  }

  async function loadDraftPreview() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("rimafon-admin", 2);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("drafts")) { db.close(); resolve(null); return; }
        const tx = db.transaction("drafts", "readonly");
        const get = tx.objectStore("drafts").get("current");
        get.onsuccess = () => { const value = get.result || null; db.close(); resolve(value); };
        get.onerror = () => { db.close(); reject(get.error); };
      };
    });
  }

  async function loadContent() {
    const params = new URLSearchParams(location.search);
    if (params.get("preview") === "draft") {
      try {
        const draft = await loadDraftPreview();
        if (draft) return draft;
      } catch (_) {}
    }
    const response = await fetch("site-content.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("site-content.json unavailable");
    return response.json();
  }

  loadContent().then(renderContent).catch(() => {
    // Встроенный HTML остаётся рабочим fallback, если JSON временно недоступен.
  });
})();
