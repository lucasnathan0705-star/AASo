document.addEventListener("DOMContentLoaded", () => {

    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

    /* ============================================================
       DROPDOWN MENUS
    ============================================================ */
    $$(".toggle-button").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();

            const menu = document.getElementById(btn.dataset.menu);

            // Fecha todos antes de abrir o clicado
            $$(".dropdown-menu").forEach(m => m.style.display = "none");

            // Alterna o atual
            menu.style.display =
                menu.style.display === "flex" ? "none" : "flex";
        });
    });

    document.addEventListener("click", () => {
        $$(".dropdown-menu").forEach(m => m.style.display = "none");
    });

    /* ============================================================
       GLPI
    ============================================================ */
    $("#glpi-btn").addEventListener("click", () => {
        const val = $("#glpi-input").value.trim();
        if (!val) {
            // Se o campo estiver vazio, abre o GLPI para o chamado
            // (Comportamento original, mantido como fallback ou para abrir um chamado específico)
            return alert("Digite um GLPI");
        }

        // Tenta filtrar a lista de chamados na sidebar
        const chamadosList = $("#chamados-list");
        const chamados = chamadosList.querySelectorAll(".chamado-item"); // Assumindo que cada chamado tem a classe .chamado-item

        let found = false;
        chamados.forEach(chamado => {
            const chamadoId = chamado.dataset.id; // Assumindo que o ID do chamado está em um atributo data-id
            if (chamadoId && chamadoId.includes(val)) {
                chamado.style.display = "flex"; // Mostra o chamado
                found = true;
            } else {
                chamado.style.display = "none"; // Esconde o chamado
            }
        });

        if (!found) {
            // Se não encontrou na lista, abre o GLPI para o chamado
            window.open(`https://suporte.muffato.com.br/front/ticket.form.php?id=${val}`, "_blank");
        }
    });

    /* ============================================================
       WIKI
    ============================================================ */
    $("#wiki-btn").addEventListener("click", () => {
        const q = $("#wiki-input").value.trim();
        if (!q) return alert("Digite uma busca");
        window.open(`http://10.124.210.252/Wikifato/doku.php?do=search&q=${encodeURIComponent(q)}`, "_blank");
    });

    /* ============================================================
       REMOTES
    ============================================================ */
    const container = $("#remote-panels-container");

    function addRemote(name, url) {
        const wrap = document.createElement("div");
        wrap.className = "remote-panel";

        wrap.innerHTML = `
            <div class="panel-header">
                <span>${name}</span>
                <button class="close-btn">&times;</button>
            </div>
            <iframe src="${url}"></iframe>
        `;

        wrap.querySelector(".close-btn").onclick = () => wrap.remove();

        container.appendChild(wrap);
    }

    $$(".remote-link").forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            addRemote(link.dataset.name, link.dataset.url);
        };
    });

    /* ============================================================
       MODAL CONFIGURAÇÃO
    ============================================================ */
    $("#config-btn").onclick = () => $("#config-modal").style.display = "flex";
    $(".modal .close-btn").onclick = () => $("#config-modal").style.display = "none";
});
document.addEventListener("DOMContentLoaded", () => {

    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

    /* ============================================================
       DROPDOWN MENUS
    ============================================================ */
    $$(".toggle-button").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();

            const menu = document.getElementById(btn.dataset.menu);

            // Fecha todos antes de abrir o clicado
            $$(".dropdown-menu").forEach(m => m.style.display = "none");

            // Alterna o atual
            menu.style.display =
                menu.style.display === "flex" ? "none" : "flex";
        });
    });

    document.addEventListener("click", () => {
        $$(".dropdown-menu").forEach(m => m.style.display = "none");
    });

    /* ============================================================
       GLPI
    ============================================================ */
    $("#glpi-btn").addEventListener("click", () => {
        const val = $("#glpi-input").value.trim();
        if (!val) {
            return alert("Digite um GLPI");
        }

        const chamadosList = $("#chamados-list");
        const chamados = chamadosList?.querySelectorAll(".chamado-item");

        let found = false;

        chamados?.forEach(chamado => {
            const chamadoId = chamado.dataset.id;
            if (chamadoId && chamadoId.includes(val)) {
                chamado.style.display = "flex";
                found = true;
            } else {
                chamado.style.display = "none";
            }
        });

        if (!found) {
            window.open(
                `https://suporte.muffato.com.br/front/ticket.form.php?id=${val}`,
                "_blank"
            );
        }
    });

    /* ============================================================
       WIKI
    ============================================================ */
    $("#wiki-btn").addEventListener("click", () => {
        const q = $("#wiki-input").value.trim();
        if (!q) return alert("Digite uma busca");

        window.open(
            `http://10.124.210.252/Wikifato/doku.php?do=search&q=${encodeURIComponent(q)}`,
            "_blank"
        );
    });

    /* ============================================================
       REMOTES — ÁUDIO + SANDBOX + MÚLTIPLAS SESSÕES
    ============================================================ */

    const container = $("#remote-panels-container");
    let panels = [];
    let activeAudioPanel = null;

    // Adiciona ?audio=on/off corretamente
    function forceAudio(url, enable) {
        url = url.replace(/audio=\w+/g, ""); // Remove parâmetros antigos
        return url + (url.includes("?") ? "&" : "?") + `audio=${enable ? "on" : "off"}`;
    }

    // Define qual painel tem áudio
    function setAudioFocus(panel) {
        activeAudioPanel = panel;

        panels.forEach(p => {
            const iframe = p.querySelector("iframe");
            let src = iframe.src;
            const enable = (p === panel);

            src = forceAudio(src, enable);
            if (iframe.src !== src) iframe.src = src;
        });

        console.log("Novo painel com áudio:", panel);
    }

    function addRemote(name, url) {
        // Primeira sessão recebe áudio
        if (!activeAudioPanel) {
            url = forceAudio(url, true);
        } else {
            url = forceAudio(url, false);
        }

        const wrap = document.createElement("div");
        wrap.className = "remote-panel";

        wrap.innerHTML = `
            <div class="panel-header">
                <span>${name}</span>
                <button class="close-btn">&times;</button>
            </div>

            <!-- SANDBOX APLICADO -->
            <iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups" src="${url}"></iframe>
        `;

        // Clicar transfere áudio
        wrap.addEventListener("click", () => setAudioFocus(wrap));

        wrap.querySelector(".close-btn").onclick = () => {
            panels = panels.filter(p => p !== wrap);

            // Se fechou o painel com áudio, passa para outro
            if (activeAudioPanel === wrap) {
                activeAudioPanel = panels[0] || null;
                if (activeAudioPanel) setAudioFocus(activeAudioPanel);
            }

            wrap.remove();
        };

        container.appendChild(wrap);
        panels.push(wrap);

        // Primeiro painel automaticamente tem áudio
        if (!activeAudioPanel) setAudioFocus(wrap);
    }

    // Inicia painéis quando clicar nos links Remote
    $$(".remote-link").forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            addRemote(link.dataset.name, link.dataset.url);
        };
    });

    /* ============================================================
       MODAL CONFIGURAÇÃO
    ============================================================ */
    $("#config-btn").onclick = () => $("#config-modal").style.display = "flex";
    $(".modal .close-btn").onclick = () => $("#config-modal").style.display = "none";

});
