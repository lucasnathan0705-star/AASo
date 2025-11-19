const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

function on(element, event, handler) {
  if (element) {
    element.addEventListener(event, handler);
  }
}

const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.warn(`Erro ao ler '${key}'`, err);
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`Erro ao salvar '${key}'`, err);
    }
  }
};

const Dropdowns = (() => {
  let openMenu = null;

  function positionMenu(button, menu) {
    const rect = button.getBoundingClientRect();
    menu.style.left = `${rect.left + window.scrollX}px`;
    menu.style.top = `${rect.bottom + 6 + window.scrollY}px`;
  }

  function toggle(button) {
    const menuId = button.dataset.menu;
    const menu = document.getElementById(menuId);
    if (!menu) return;

    const isOpen = openMenu === menu;
    close();

    if (!isOpen) {
      positionMenu(button, menu);
      menu.style.display = "flex";
      button.setAttribute("aria-expanded", "true");
      openMenu = menu;
    }
  }

  function close() {
    if (openMenu) {
      openMenu.style.display = "none";
      const btn = document.querySelector(`[data-menu='${openMenu.id}']`);
      if (btn) btn.setAttribute("aria-expanded", "false");
    }
    openMenu = null;
  }

  function init() {
    $$(".toggle-button").forEach((btn) => {
      on(btn, "click", (e) => {
        e.stopPropagation();
        toggle(btn);
      });
    });

    document.addEventListener("click", () => close());
    window.addEventListener("resize", () => close());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  return { init, close };
})();

const ThemeManager = (() => {
  const defaults = {
    primary: "#c62828",
    background: "#0f0f0f",
    backgroundImage: ""
  };

  function apply(theme) {
    const { primary, background, backgroundImage } = { ...defaults, ...theme };
    document.documentElement.style.setProperty("--primary", primary);
    document.body.style.backgroundColor = background;
    document.body.style.backgroundImage = backgroundImage ? `url('${backgroundImage}')` : "none";
  }

  function init() {
    const saved = storage.get("theme", defaults);
    apply(saved);

    const colorPicker = $("#theme-color-picker");
    const bgPicker = $("#bg-color-picker");
    const bgInput = $("#bg-image-url");
    const clearBtn = $("#clear-bg-image-btn");

    if (colorPicker) colorPicker.value = saved.primary || defaults.primary;
    if (bgPicker) bgPicker.value = saved.background || defaults.background;
    if (bgInput) bgInput.value = saved.backgroundImage || "";

    on(colorPicker, "input", () => {
      const theme = { ...saved, primary: colorPicker.value };
      storage.set("theme", theme);
      apply(theme);
    });

    on(bgPicker, "input", () => {
      const theme = { ...saved, background: bgPicker.value };
      storage.set("theme", theme);
      apply(theme);
    });

    on(bgInput, "change", () => {
      const theme = { ...saved, backgroundImage: bgInput.value.trim() };
      storage.set("theme", theme);
      apply(theme);
    });

    on(clearBtn, "click", () => {
      const theme = { ...saved, backgroundImage: "" };
      storage.set("theme", theme);
      apply(theme);
      if (bgInput) bgInput.value = "";
    });
  }

  return { init, apply };
})();

const RemoteManager = (() => {
  const container = $("#remote-panels-container");
  let panels = [];
  let audioPanel = null;

  function forceAudio(url, enable) {
    const clean = url.replace(/([?&])audio=[^&#]+/g, "$1").replace(/([?&])$/, "");
    const separator = clean.includes("?") ? "&" : "?";
    return `${clean}${separator}audio=${enable ? "on" : "off"}`;
  }

  function setAudioFocus(panel) {
    audioPanel = panel;
    panels.forEach((p) => {
      const iframe = p.querySelector("iframe");
      const desired = forceAudio(iframe.dataset.baseUrl, p === audioPanel);
      if (iframe.src !== desired) iframe.src = desired;
    });
  }

  function closePanel(panel) {
    panels = panels.filter((p) => p !== panel);
    if (audioPanel === panel) {
      audioPanel = panels[0] || null;
      if (audioPanel) setAudioFocus(audioPanel);
    }
    panel.remove();
  }

  function attachPanelEvents(panel) {
    panel.addEventListener("click", () => setAudioFocus(panel));
    const closeBtn = panel.querySelector(".close-btn");
    on(closeBtn, "click", (e) => {
      e.stopPropagation();
      closePanel(panel);
    });
  }

  function createPanel(title, url) {
    const wrapper = document.createElement("article");
    wrapper.className = "remote-panel";

    const iframe = document.createElement("iframe");
    iframe.dataset.baseUrl = url;
    iframe.setAttribute("sandbox", "allow-same-origin allow-scripts allow-forms allow-popups");
    iframe.src = forceAudio(url, !audioPanel);
    iframe.tabIndex = -1;

    wrapper.innerHTML = `
      <div class="panel-header">
        <div class="panel-title"><i class="fas fa-window-maximize"></i>${title}</div>
        <div class="panel-actions">
          <button class="action-btn close-btn" title="Fechar painel"><i class="fas fa-times"></i></button>
        </div>
      </div>
    `;
    wrapper.appendChild(iframe);

    attachPanelEvents(wrapper);
    panels.push(wrapper);
    if (!audioPanel) setAudioFocus(wrapper);

    if (container) container.appendChild(wrapper);
    setTimeout(() => iframe.focus({ preventScroll: true }), 150);
    wrapper.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bindRemoteLinks() {
    $$(".remote-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        Dropdowns.close();
        createPanel(link.dataset.name || "Remote", link.dataset.url);
      });
    });
  }

  function addPanel(options) {
    const { title, url } = options;
    if (!title || !url) return;
    createPanel(title, url);
  }

  function init() {
    bindRemoteLinks();
  }

  return { init, addPanel };
})();

const TicketManager = (() => {
  const listEl = $("#chamados-list");
  const countEl = $("#chamados-count");
  const addForm = $("#novo-chamado-form");
  const inputId = $("#novo-chamado-id");
  const inputDesc = $("#novo-chamado-desc");
  const glpiAddBtn = $("#glpi-add-btn");
  const monitor = $("#chamados-monitor");
  const collapseBtn = $("#monitor-collapse");
  const logBtn = $("#gerar-log-btn");
  const reopenBtn = $("#monitor-reopen");

  let tickets = [];

  function save() {
    storage.set("tickets", tickets);
  }

  function updateCount() {
    countEl.textContent = tickets.length;
  }

  function setCollapsed(collapsed) {
    if (!monitor) return;
    monitor.classList.toggle("collapsed", collapsed);
    document.body.classList.toggle("monitor-collapsed", collapsed);
    const icon = collapseBtn ? collapseBtn.querySelector("i") : null;
    if (icon) icon.className = collapsed ? "fas fa-chevron-right" : "fas fa-chevron-left";
  }

  function ensureVisible() {
    setCollapsed(false);
  }

  function render() {
    if (!listEl) return;
    listEl.innerHTML = "";

    if (!tickets.length) {
      const empty = document.createElement("p");
      empty.textContent = "Nenhum chamado acompanhado.";
      empty.className = "muted";
      listEl.appendChild(empty);
      updateCount();
      return;
    }

    tickets.forEach((ticket) => {
      const item = document.createElement("div");
      item.className = "chamado-item";
      item.dataset.id = ticket.id;

      const meta = document.createElement("div");
      meta.className = "chamado-meta";
      const title = document.createElement("strong");
      title.textContent = `#${ticket.id}`;
      const desc = document.createElement("span");
      desc.textContent = ticket.title || "Sem descrição";
      meta.append(title, desc);

      const actions = document.createElement("div");
      actions.className = "chamado-actions";

      const openBtn = document.createElement("button");
      openBtn.className = "action-btn";
      openBtn.title = "Abrir GLPI em nova aba";
      openBtn.innerHTML = "<i class='fas fa-up-right-from-square'></i>";
      openBtn.addEventListener("click", () => openTicket(ticket.id));

      const iframeBtn = document.createElement("button");
      iframeBtn.className = "action-btn";
      iframeBtn.title = "Abrir chamado em IFRAME";
      iframeBtn.innerHTML = "<i class='fas fa-window-restore'></i>";
      iframeBtn.addEventListener("click", () => openTicketIframe(ticket));

      const removeBtn = document.createElement("button");
      removeBtn.className = "action-btn";
      removeBtn.title = "Remover chamado";
      removeBtn.innerHTML = "<i class='fas fa-times'></i>";
      removeBtn.addEventListener("click", () => removeTicket(ticket.id));

      actions.append(openBtn, iframeBtn, removeBtn);
      item.append(meta, actions);
      listEl.appendChild(item);
    });

    updateCount();
  }

  function normalizeId(value) {
    return (value || "").replace(/\D+/g, "").padStart(6, "0");
  }

  function addTicket(id, title) {
    const cleanId = normalizeId(id);
    if (!cleanId) return;
    const existing = tickets.find((t) => t.id === cleanId);
    if (existing) {
      existing.title = title || existing.title;
    } else {
      tickets.unshift({ id: cleanId, title: title || "" });
    }
    save();
    render();
    ensureVisible();
  }

  function removeTicket(id) {
    tickets = tickets.filter((t) => t.id !== id);
    save();
    render();
  }

  function openTicket(id) {
    addTicket(id);
    window.open(`https://suporte.muffato.com.br/front/ticket.form.php?id=${encodeURIComponent(id)}`, "_blank", "noopener");
  }

  async function fetchTicketTitle(id) {
    const url = `https://suporte.muffato.com.br/front/ticket.form.php?id=${encodeURIComponent(id)}`;
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) return null;
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const docTitle = doc.querySelector("title");
      const heading = doc.querySelector("h1");
      const title = docTitle ? docTitle.textContent : heading ? heading.textContent : null;
      return title ? title.replace(/\s+\|.*$/, "").trim() : null;
    } catch (err) {
      console.warn("Não foi possível obter o título do chamado", err);
      return null;
    }
  }

  async function openTicketIframe(ticket) {
    const baseUrl = `https://suporte.muffato.com.br/front/ticket.form.php?id=${encodeURIComponent(ticket.id)}`;
    let titleText = ticket.title;

    if (!titleText) {
      titleText = await fetchTicketTitle(ticket.id);
      if (titleText) {
        ticket.title = titleText;
        save();
        render();
      }
    }

    RemoteManager.addPanel({
      title: `GLPI ${ticket.id}${titleText ? ` • ${titleText}` : ""}`,
      url: baseUrl
    });
  }

  function handleAddForm(evt) {
    evt.preventDefault();
    const id = inputId ? inputId.value.trim() : "";
    const desc = inputDesc ? inputDesc.value.trim() : "";
    if (!id) return;
    addTicket(id, desc);
    inputId.value = "";
    if (inputDesc) inputDesc.value = "";
  }

  function generateLog() {
    const lines = tickets.map((t) => `#${t.id}${t.title ? ` - ${t.title}` : ""}`);
    const content = lines.join("\n") || "Nenhum chamado acompanhado.";
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chamados-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleMonitor() {
    const collapsed = monitor ? monitor.classList.contains("collapsed") : false;
    setCollapsed(!collapsed);
  }

  function init() {
    tickets = storage.get("tickets", []);
    render();
    setCollapsed(false);

    on(addForm, "submit", handleAddForm);
    on(glpiAddBtn, "click", () => {
      const glpiInput = $("#glpi-input");
      const id = glpiInput ? glpiInput.value.trim() : "";
      if (!id) return;
      addTicket(id, "GLPI adicionado pelo topo");
    });

    on(collapseBtn, "click", toggleMonitor);
    on(reopenBtn, "click", () => setCollapsed(false));
    on(logBtn, "click", generateLog);
  }

  return { init, addTicket };
})();

const NotesPanel = (() => {
  const panel = $("#notes-panel");
  const toggleBtn = $("#notes-toggle");
  const closeBtn = $("#notes-close");
  const saveBtn = $("#notes-save");
  const clearBtn = $("#notes-clear");
  const textarea = $("#notes-text");

  function show() {
    if (panel) panel.classList.remove("hidden");
    document.body.classList.remove("notes-hidden");
    if (textarea) textarea.focus();
  }

  function hide() {
    if (panel) panel.classList.add("hidden");
    document.body.classList.add("notes-hidden");
  }

  function load() {
    const saved = storage.get("notes", "");
    if (textarea) textarea.value = saved;
  }

  function save() {
    storage.set("notes", textarea ? textarea.value : "");
  }

  function clear() {
    if (textarea) textarea.value = "";
    save();
  }

  function init() {
    load();
    on(toggleBtn, "click", () => {
      if (panel && panel.classList.contains("hidden")) {
        show();
      } else {
        hide();
      }
    });
    on(closeBtn, "click", hide);
    on(saveBtn, "click", save);
    on(clearBtn, "click", clear);
  }

  return { init };
})();

const ConfigModal = (() => {
  const modal = $("#config-modal");
  const openBtn = $("#config-btn");
  const closeBtn = modal ? modal.querySelector(".close-btn") : null;

  function open() {
    if (modal) modal.style.display = "flex";
  }

  function close() {
    if (modal) modal.style.display = "none";
  }

  function init() {
    on(openBtn, "click", open);
    on(closeBtn, "click", close);
    on(modal, "click", (e) => {
      if (e.target === modal) close();
    });
  }

  return { init };
})();

const Search = (() => {
  function initGLPI() {
    const form = $("#glpi-form");
    on(form, "submit", (e) => {
      e.preventDefault();
      const input = $("#glpi-input");
      const value = input ? input.value.trim() : "";
      if (!value) return;
      TicketManager.addTicket(value, "Buscado via GLPI");
      window.open(`https://suporte.muffato.com.br/front/ticket.form.php?id=${encodeURIComponent(value)}`, "_blank", "noopener");
    });
  }

  function initWiki() {
    const form = $("#wiki-form");
    on(form, "submit", (e) => {
      e.preventDefault();
      const input = $("#wiki-input");
      const q = input ? input.value.trim() : "";
      if (!q) return;
      window.open(`http://10.124.210.252/Wikifato/doku.php?do=search&q=${encodeURIComponent(q)}`, "_blank", "noopener");
    });
  }

  return { init() { initGLPI(); initWiki(); } };
})();

function initApp() {
  ThemeManager.init();
  Dropdowns.init();
  RemoteManager.init();
  TicketManager.init();
  NotesPanel.init();
  ConfigModal.init();
  Search.init();
}

if (typeof window !== "undefined") {
  window.__app__ = {
    initApp,
    Dropdowns,
    ThemeManager,
    RemoteManager,
    TicketManager,
    NotesPanel,
    ConfigModal,
    Search,
  };
}

document.addEventListener("DOMContentLoaded", initApp);
