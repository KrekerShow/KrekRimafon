(function () {
  "use strict";

  const DB_NAME = "rimafon-admin";
  const DB_STORE = "drafts";
  const DB_KEY = "current";

  const byId = (id) => document.getElementById(id);

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function asText(value, fallback = "") {
    return typeof value === "string" ? value : fallback;
  }

  function asNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function formatMoney(value) {
    return `${asNumber(value).toLocaleString("ru-RU")} ₽`;
  }

  function formatCompact(value) {
    const number = asNumber(value);
    if (number >= 1000 && number % 1000 === 0) {
      return `${number / 1000}К`;
    }
    return number.toLocaleString("ru-RU");
  }

  function replaceTokens(value, settings) {
    return asText(value)
      .replaceAll("{{donationMin}}", String(asNumber(settings.donationMin, 100)))
      .replaceAll("{{streamTarget}}", String(asNumber(settings.streamTarget, 10000)))
      .replaceAll("{{schedule}}", asText(settings.schedule));
  }

  function safeExternalUrl(value) {
    const raw = asText(value).trim();
    if (!raw) return "";
    try {
      const url = new URL(raw, window.location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  function safeImageSource(value) {
    const source = asText(value).trim();
    if (/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/i.test(source)) {
      return source;
    }
    if (/^(?:\.{0,2}\/)?[a-z0-9_./%+-]+\.(?:png|jpe?g|webp|gif)$/i.test(source)) {
      return source;
    }
    return "";
  }

  function appendRichText(target, value, settings) {
    target.replaceChildren();
    const text = replaceTokens(value, settings);
    const pattern = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
    let cursor = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > cursor) {
        target.append(document.createTextNode(text.slice(cursor, match.index)));
      }
      const href = safeExternalUrl(match[2]);
      if (href) {
        const link = document.createElement("a");
        link.className = "inline-link";
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = match[1];
        target.append(link);
      } else {
        target.append(document.createTextNode(match[1]));
      }
      cursor = pattern.lastIndex;
    }

    if (cursor < text.length) {
      target.append(document.createTextNode(text.slice(cursor)));
    }
  }

  function renderRuleList(listId, values, settings) {
    const list = byId(listId);
    if (!list) return;
    list.replaceChildren();

    asArray(values).forEach((value, index) => {
      const item = document.createElement("li");
      const number = document.createElement("b");
      const content = document.createElement("span");
      number.textContent = String(index + 1).padStart(2, "0");
      appendRichText(content, value, settings);
      item.append(number, content);
      list.append(item);
    });
  }

  function normalizeIdea(raw, index) {
    const status = ["roulette", "current", "upcoming", "finished", "hidden"].includes(raw?.status)
      ? raw.status
      : "roulette";
    return {
      id: asText(raw?.id, `idea-${index + 1}`),
      name: asText(raw?.name || raw?.title, "Без названия"),
      amount: Math.max(0, asNumber(raw?.amount)),
      description: asText(raw?.description || raw?.desc),
      status,
      image: safeImageSource(raw?.image),
      watchUrl: safeExternalUrl(raw?.watchUrl || raw?.watch),
      modsUrl: safeExternalUrl(raw?.modsUrl || raw?.mods)
    };
  }

  function createIdeaImage(idea, className) {
    if (!idea.image) return null;
    const image = document.createElement("img");
    image.className = className;
    image.src = idea.image;
    image.alt = `Иллюстрация идеи «${idea.name}»`;
    image.loading = "lazy";
    image.decoding = "async";
    return image;
  }

  function createIdeaLinks(idea) {
    if (!idea.watchUrl && !idea.modsUrl) return null;
    const links = document.createElement("div");
    links.className = "links";

    if (idea.watchUrl) {
      const watch = document.createElement("a");
      watch.className = "link-btn";
      watch.href = idea.watchUrl;
      watch.target = "_blank";
      watch.rel = "noopener noreferrer";
      watch.textContent = "Смотреть";
      links.append(watch);
    }

    if (idea.modsUrl) {
      const mods = document.createElement("a");
      mods.className = "link-btn";
      mods.href = idea.modsUrl;
      mods.target = "_blank";
      mods.rel = "noopener noreferrer";
      mods.textContent = "Моды";
      links.append(mods);
    }

    return links;
  }

  function renderCurrent(idea) {
    const mount = byId("current-colony");
    if (!mount) return;
    mount.replaceChildren();

    if (!idea) {
      mount.className = "empty-colony";
      const wrapper = document.createElement("div");
      const icon = document.createElement("div");
      const title = document.createElement("h3");
      const description = document.createElement("p");
      const button = document.createElement("a");

      icon.className = "empty-colony__icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "0";
      title.id = "current-title";
      title.textContent = "Колония ещё не выбрана";
      description.textContent = "Здесь появится первый выбранный формат второго сезона. Предложения уже можно добавлять в новую рулетку.";
      button.className = "button";
      button.href = "https://www.donationalerts.com/r/krekeros";
      button.target = "_blank";
      button.rel = "noopener noreferrer";
      button.textContent = "Добавить идею";

      wrapper.append(icon, title, description, button);
      mount.append(wrapper);
      return;
    }

    mount.className = "current-idea";
    const image = createIdeaImage(idea, "current-idea__image");
    const body = document.createElement("div");
    const label = document.createElement("span");
    const title = document.createElement("h3");
    const description = document.createElement("p");
    const amount = document.createElement("span");

    body.className = "current-idea__body";
    label.className = "section-kicker";
    label.textContent = "Сейчас в эфире";
    title.id = "current-title";
    title.textContent = idea.name;
    description.textContent = idea.description || "Описание появится перед стартом колонии.";
    amount.className = "idea-amount";
    amount.textContent = formatMoney(idea.amount);

    body.append(label, title, description, amount);
    const links = createIdeaLinks(idea);
    if (links) body.append(links);

    if (image) mount.append(image);
    mount.append(body);
  }

  function createIdeaRow(idea, showAmount) {
    const row = document.createElement("article");
    const image = createIdeaImage(idea, "idea-row__image");
    const body = document.createElement("div");
    const title = document.createElement("strong");
    const description = document.createElement("p");

    row.className = `idea-row${image ? "" : " idea-row--no-image"}`;
    body.className = "idea-row__body";
    title.textContent = idea.name;
    description.textContent = idea.description;
    body.append(title);
    if (idea.description) body.append(description);

    if (showAmount) {
      const amount = document.createElement("span");
      amount.className = "idea-amount";
      amount.textContent = formatMoney(idea.amount);
      body.append(amount);
    }

    const links = createIdeaLinks(idea);
    if (links) body.append(links);

    if (image) row.append(image);
    row.append(body);
    return row;
  }

  function renderUpcoming(ideas) {
    const mount = byId("upcoming-list");
    const count = byId("upcoming-count");
    if (!mount || !count) return;
    count.textContent = String(ideas.length);
    mount.replaceChildren();

    if (!ideas.length) {
      mount.className = "queue-empty";
      mount.textContent = "Пока нет запланированных колоний.";
      return;
    }

    mount.className = "ideas-list";
    ideas.forEach((idea) => mount.append(createIdeaRow(idea, false)));
  }

  function renderRoulette(ideas) {
    const mount = byId("possible-list");
    const count = byId("possible-count");
    const heroCount = byId("hero-ideas-count");
    if (!mount || !count) return;

    const sorted = ideas.slice().sort((a, b) => b.amount - a.amount);
    count.textContent = String(sorted.length);
    if (heroCount) heroCount.textContent = String(sorted.length);
    mount.replaceChildren();

    if (!sorted.length) {
      mount.className = "queue-empty ideas-list";
      mount.textContent = "Новый сезон начинается с нуля.";
      return;
    }

    mount.className = "ideas-list";
    sorted.forEach((idea) => mount.append(createIdeaRow(idea, true)));
  }

  function renderFinished(ideas) {
    const section = byId("finished");
    const mount = byId("finished-list");
    const count = byId("finished-count");
    if (!section || !mount || !count) return;

    section.hidden = !ideas.length;
    count.textContent = String(ideas.length);
    mount.replaceChildren();
    ideas.forEach((idea) => mount.append(createIdeaRow(idea, false)));
  }

  function applyContent(content) {
    if (!content || typeof content !== "object") return;
    const settings = content.settings && typeof content.settings === "object" ? content.settings : {};
    const rules = content.rules && typeof content.rules === "object" ? content.rules : {};
    const ideas = asArray(content.ideas).map(normalizeIdea);

    const seasonLabel = byId("hero-season-label");
    const heroTitle = byId("hero-title");
    const heroDescription = byId("hero-description");
    const streamTarget = byId("stream-target");
    const heroColonies = byId("hero-colonies-count");

    if (seasonLabel && settings.seasonLabel) seasonLabel.textContent = settings.seasonLabel;
    if (
      heroTitle &&
      settings.heroTitle &&
      heroTitle.textContent.trim() !== settings.heroTitle.trim()
    ) {
      heroTitle.textContent = settings.heroTitle;
    }
    if (heroDescription && settings.heroDescription) heroDescription.textContent = settings.heroDescription;
    if (streamTarget) streamTarget.textContent = formatCompact(settings.streamTarget || 10000);

    document.querySelectorAll("[data-donation-min]").forEach((element) => {
      element.textContent = asNumber(settings.donationMin, 100).toLocaleString("ru-RU");
    });

    const visibleColonies = ideas.filter((idea) => ["current", "upcoming"].includes(idea.status));
    if (heroColonies) heroColonies.textContent = String(visibleColonies.length);

    const current = ideas.find((idea) => idea.status === "current");
    const upcoming = ideas.filter((idea) => idea.status === "upcoming");
    const roulette = ideas.filter((idea) => idea.status === "roulette");
    const finished = ideas.filter((idea) => idea.status === "finished");

    renderCurrent(current);
    renderUpcoming(upcoming);
    renderRoulette(roulette);
    renderFinished(finished);

    renderRuleList("adding-rules", rules.adding, settings);
    renderRuleList("format-rules", rules.formats, settings);
    renderRuleList("new-game-rules", rules.newGame, settings);

    const addingExample = byId("adding-example");
    const formatsNote = byId("formats-note");
    const newGameTitle = byId("new-game-title");
    const newGameIntro = byId("new-game-intro");
    const newGameNote = byId("new-game-note");

    if (addingExample && rules.addingExample) addingExample.textContent = replaceTokens(rules.addingExample, settings);
    if (formatsNote && rules.formatsNote) formatsNote.textContent = replaceTokens(rules.formatsNote, settings);
    if (newGameTitle && rules.newGameTitle) newGameTitle.textContent = rules.newGameTitle;
    if (newGameIntro && rules.newGameIntro) newGameIntro.textContent = replaceTokens(rules.newGameIntro, settings);
    if (newGameNote && rules.newGameNote) newGameNote.textContent = replaceTokens(rules.newGameNote, settings);

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && settings.heroDescription) {
      metaDescription.content = settings.heroDescription;
    }
  }

  function openDraftDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(DB_STORE)) {
          database.createObjectStore(DB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function loadDraft() {
    const database = await openDraftDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(DB_STORE, "readonly");
      const request = transaction.objectStore(DB_STORE).get(DB_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => database.close();
    });
  }

  async function loadPublishedContent() {
    const response = await fetch("site-content.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Не удалось загрузить site-content.json");
    return response.json();
  }

  async function start() {
    try {
      const params = new URLSearchParams(window.location.search);
      const content = params.get("preview") === "draft"
        ? await loadDraft()
        : await loadPublishedContent();
      if (content) applyContent(content);
    } catch (error) {
      console.warn("RimaFon content loader:", error);
    }
  }

  start();
})();
