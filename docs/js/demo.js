(function () {
  const MOCK = window.EFISCAL_MOCK;
  const STORAGE_KEY = "efiscal-demo-vistoria";

  function badgeClass(p) {
    if (p === "alta") return "badge-alta";
    if (p === "media") return "badge-media";
    return "badge-baixa";
  }

  function showPanel(id) {
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    document.querySelectorAll(".nav-tabs button").forEach((b) => b.classList.remove("active"));
    const panel = document.getElementById("panel-" + id);
    const tab = document.querySelector('[data-tab="' + id + '"]');
    if (panel) panel.classList.add("active");
    if (tab) tab.classList.add("active");
    if (id === "campo") initMap();
  }

  function renderDemandas() {
    const tbody = document.getElementById("demandas-body");
    if (!tbody) return;
    tbody.innerHTML = MOCK.demandas
      .map(
        (d) =>
          `<tr>
            <td>${d.id}</td>
            <td>${d.tipo}</td>
            <td>${d.bairro}</td>
            <td><span class="badge ${badgeClass(d.prioridade)}">${d.prioridade}</span></td>
            <td>${d.prazo}</td>
            <td>${d.status}</td>
          </tr>`
      )
      .join("");
  }

  function renderPainel() {
    const k = MOCK.kpis;
    const el = (id, val) => {
      const n = document.getElementById(id);
      if (n) n.textContent = val;
    };
    el("kpi-os", k.osHoje);
    el("kpi-ok", k.concluidas);
    el("kpi-tempo", k.tempoMedio);
    el("kpi-div", k.divergencias);
    el("kpi-homolog", k.pendentesHomolog);

    const fb = document.getElementById("fiscais-body");
    if (fb) {
      fb.innerHTML = MOCK.fiscais
        .map(
          (f) =>
            `<tr>
              <td>${f.nome}</td>
              <td>${f.osAbertas}</td>
              <td>${f.online ? '<span class="badge badge-baixa">Em campo</span>' : '<span class="badge badge-media">Offline</span>'}</td>
            </tr>`
        )
        .join("");
    }
  }

  let mapInstance = null;
  let selectedOs = MOCK.ordens[0];

  function initMap() {
    const el = document.getElementById("map-campo");
    if (!el || typeof L === "undefined") return;
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
    }
    mapInstance = L.map("map-campo").setView([selectedOs.lat, selectedOs.lng], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(mapInstance);
    L.marker([selectedOs.lat, selectedOs.lng]).addTo(mapInstance).bindPopup(selectedOs.endereco);
    setTimeout(() => mapInstance.invalidateSize(), 200);
  }

  function loadSavedChecklist() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveChecklist(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateSyncBadge();
  }

  function updateSyncBadge() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const pending = raw && raw.includes('"pending":true');
    const b = document.getElementById("sync-badge");
    if (b) b.style.display = pending ? "inline-block" : "none";
  }

  function renderCampoList() {
    const list = document.getElementById("os-list");
    if (!list) return;
    list.innerHTML = MOCK.ordens
      .map(
        (o) =>
          `<div class="os-item ${o.id === selectedOs.id ? "selected" : ""}" data-os="${o.id}">
            <strong>${o.id}</strong><br>
            <small>${o.inscricao}</small><br>
            ${o.endereco}<br>
            <span class="badge badge-sync">${o.status}</span>
          </div>`
      )
      .join("");

    list.querySelectorAll(".os-item").forEach((item) => {
      item.addEventListener("click", () => {
        const id = item.getAttribute("data-os");
        selectedOs = MOCK.ordens.find((x) => x.id === id) || MOCK.ordens[0];
        renderCampoDetail();
        renderCampoList();
        initMap();
      });
    });
  }

  function renderCampoDetail() {
    const d = document.getElementById("os-detail");
    if (!d) return;
    d.innerHTML = `
      <p><strong>${selectedOs.id}</strong> — ${selectedOs.inscricao}</p>
      <p style="color:var(--muted);font-size:0.85rem">${selectedOs.endereco} (${selectedOs.distancia})</p>
    `;
    const saved = loadSavedChecklist();
    const cl = document.getElementById("checklist");
    if (cl) {
      cl.innerHTML = MOCK.checklist
        .map(
          (c) =>
            `<label><input type="checkbox" data-cid="${c.id}" ${saved[c.id] ? "checked" : ""}/> ${c.label}</label>`
        )
        .join("");
      cl.querySelectorAll("input").forEach((inp) => {
        inp.addEventListener("change", () => {
          const state = loadSavedChecklist();
          state[inp.getAttribute("data-cid")] = inp.checked;
          state.pending = true;
          saveChecklist(state);
        });
      });
    }
  }

  document.querySelectorAll(".nav-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => showPanel(btn.getAttribute("data-tab")));
  });

  const btnCheckin = document.getElementById("btn-checkin");
  if (btnCheckin) {
    btnCheckin.addEventListener("click", () => {
      alert("Demo: check-in GPS registrado (simulado).\nEm produção: coordenadas + distância ao lote.");
    });
  }

  const btnSync = document.getElementById("btn-sync");
  if (btnSync) {
    btnSync.addEventListener("click", () => {
      const state = loadSavedChecklist();
      delete state.pending;
      saveChecklist(state);
      alert("Demo: dados enviados ao servidor (simulado).\nEm produção: API REST + fotos.");
    });
  }

  const btnFoto = document.getElementById("btn-foto");
  if (btnFoto) {
    btnFoto.addEventListener("click", () => {
      alert("Demo: câmera / galeria (simulado).\nEm produção: upload para armazenamento S3.");
    });
  }

  renderDemandas();
  renderPainel();
  renderCampoList();
  renderCampoDetail();
  updateSyncBadge();
  showPanel("inicio");
})();
