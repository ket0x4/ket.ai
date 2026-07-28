(function () {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
  }

  const initData = tg?.initData || "";

  let chatsData = [];

  // Helper for API calls with initData header
  async function apiFetch(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      "x-telegram-init-data": initData,
      ...(options.headers || {}),
    };

    try {
      const res = await fetch(endpoint, { ...options, headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      console.error(`API Error [${endpoint}]:`, e);
      throw e;
    }
  }

  // --- Auth & User Profile ---
  async function initAuth() {
    try {
      const me = await apiFetch("/api/me");
      if (me.user) {
        const userNameEl = document.getElementById("user-name");
        if (userNameEl) userNameEl.textContent = me.user.first_name || me.user.username || "Admin";

        const roleEl = document.getElementById("user-role");
        if (roleEl) roleEl.textContent = me.isOwner ? "Kurucu / Owner" : "Grup Yöneticisi";
      }
    } catch (e) {
      console.warn("Auth check warning:", e);
    }
  }

  // --- Tab Navigation ---
  const navBtns = document.querySelectorAll(".nav-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      navBtns.forEach((b) => b.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      const targetPane = document.getElementById(targetTab);
      if (targetPane) targetPane.classList.add("active");

      // Trigger tab-specific refresh
      if (targetTab === "tab-dashboard") loadDashboardStats();
      if (targetTab === "tab-memories") loadMemories();
      if (targetTab === "tab-chats") loadChats();
      if (targetTab === "tab-logs") { loadLogs(); loadToolTraces(); }
      if (targetTab === "tab-settings") loadSettings();
    });
  });

  // --- 1. Dashboard Tab ---
  async function loadDashboardStats() {
    try {
      const stats = await apiFetch("/api/stats");
      document.getElementById("stat-total-chats").textContent = stats.totalChats || 0;
      document.getElementById("stat-allowed-chats").textContent = stats.allowedChats || 0;
      document.getElementById("stat-total-memories").textContent = stats.totalMemories || 0;
      document.getElementById("stat-total-messages").textContent = stats.totalMessages || 0;

      // Uptime formatting
      const uptimeSec = stats.uptimeSeconds || 0;
      const hours = Math.floor(uptimeSec / 3600);
      const mins = Math.floor((uptimeSec % 3600) / 60);
      const secs = uptimeSec % 60;
      document.getElementById("sys-uptime").textContent = `${hours}sa ${mins}dk ${secs}sn`;
      document.getElementById("sys-memory").textContent = `${stats.memoryUsageMb || 0} MB`;
    } catch (e) {
      console.error("Failed to load dashboard stats:", e);
    }
  }

  // --- 2. Memories Tab ---
  const memorySearchInput = document.getElementById("memory-search");
  const memoryChatFilter = document.getElementById("memory-chat-filter");
  const memoryCategoryFilter = document.getElementById("memory-category-filter");
  const memoryContainer = document.getElementById("memory-list-container");

  async function loadMemories() {
    memoryContainer.innerHTML = '<div class="loading-spinner">Hafıza kayıtları getiriliyor...</div>';

    const chatId = memoryChatFilter.value;
    const category = memoryCategoryFilter.value;
    const search = memorySearchInput.value.trim();

    let query = `/api/memories?search=${encodeURIComponent(search)}`;
    if (chatId) query += `&chat_id=${encodeURIComponent(chatId)}`;
    if (category) query += `&category=${encodeURIComponent(category)}`;

    try {
      const memories = await apiFetch(query);
      renderMemories(memories);
    } catch (e) {
      memoryContainer.innerHTML = '<div class="loading-spinner">Hafıza kayıtları yüklenemedi.</div>';
    }
  }

  function renderMemories(memories) {
    if (!memories || memories.length === 0) {
      memoryContainer.innerHTML = '<div class="loading-spinner">Kayıtlı hafıza bulunamadı.</div>';
      return;
    }

    memoryContainer.innerHTML = memories
      .map((mem) => {
        const dateStr = new Date(mem.created_at * 1000).toLocaleString("tr-TR");
        const categoryClass = `tag-${(mem.category || "PROFILE").toLowerCase()}`;

        return `
          <div class="memory-item" data-id="${mem.id}">
            <div class="memory-meta">
              <div class="memory-meta-left">
                <span class="tag">${mem.category || "PROFILE"}</span>
                <span>Grup: ${mem.chat_id}</span>
              </div>
              <span>${dateStr}</span>
            </div>
            <div class="memory-body">${escapeHtml(mem.memory_text)}</div>
            <div class="memory-footer">
              <button class="btn btn-danger btn-delete-mem" data-id="${mem.id}">Sil</button>
            </div>
          </div>
        `;
      })
      .join("");

    // Attach delete handlers
    document.querySelectorAll(".btn-delete-mem").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        if (confirm(`Hafıza kaydını (ID: ${id}) silmek istediğinize emin misiniz?`)) {
          try {
            await apiFetch(`/api/memories/${id}`, { method: "DELETE" });
            loadMemories();
            loadDashboardStats();
          } catch (err) {
            alert("Silme işlemi başarısız: " + err.message);
          }
        }
      });
    });
  }

  memorySearchInput?.addEventListener("input", debounce(loadMemories, 300));
  memoryChatFilter?.addEventListener("change", loadMemories);
  memoryCategoryFilter?.addEventListener("change", loadMemories);

  // Add Memory Modal
  const modalAdd = document.getElementById("modal-add-memory");
  const btnAddMem = document.getElementById("btn-add-memory");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const modalCancelBtn = document.getElementById("modal-cancel-btn");
  const modalSaveBtn = document.getElementById("modal-save-btn");

  btnAddMem?.addEventListener("click", () => {
    modalAdd?.classList.add("active");
  });

  function closeModal() {
    modalAdd?.classList.remove("active");
  }

  modalCloseBtn?.addEventListener("click", closeModal);
  modalCancelBtn?.addEventListener("click", closeModal);

  modalSaveBtn?.addEventListener("click", async () => {
    const chatId = document.getElementById("modal-chat-id").value;
    const category = document.getElementById("modal-category").value;
    const memoryText = document.getElementById("modal-memory-text").value.trim();

    if (!chatId || !memoryText) {
      alert("Lütfen grup seçin ve hafıza metnini doldurun.");
      return;
    }

    try {
      modalSaveBtn.disabled = true;
      modalSaveBtn.textContent = "Kaydediliyor...";
      await apiFetch("/api/memories", {
        method: "POST",
        body: JSON.stringify({ chatId, memoryText, category }),
      });
      document.getElementById("modal-memory-text").value = "";
      closeModal();
      loadMemories();
      loadDashboardStats();
    } catch (e) {
      alert("Hafıza eklenemedi: " + e.message);
    } finally {
      modalSaveBtn.disabled = false;
      modalSaveBtn.textContent = "Kaydet";
    }
  });

  // --- 3. Chats / Admin Tab ---
  const chatContainer = document.getElementById("chat-list-container");

  async function loadChats() {
    chatContainer.innerHTML = '<div class="loading-spinner">Gruplar yükleniyor...</div>';
    try {
      chatsData = await apiFetch("/api/chats");
      renderChats(chatsData);
      populateChatSelects(chatsData);
    } catch (e) {
      chatContainer.innerHTML = '<div class="loading-spinner">Gruplar yüklenemedi.</div>';
    }
  }

  function renderChats(chats) {
    if (!chats || chats.length === 0) {
      chatContainer.innerHTML = '<div class="loading-spinner">Kayıtlı grup bulunamadı.</div>';
      return;
    }

    chatContainer.innerHTML = chats
      .map((c) => {
        const title = c.title || `Grup ${c.chat_id}`;
        const prob = Math.round((c.reply_probability || 0.05) * 100);

        return `
          <div class="chat-item">
            <div class="chat-header-row">
              <div>
                <div class="chat-title">${escapeHtml(title)}</div>
                <div class="chat-id">ID: ${c.chat_id} • Hafıza: ${c.memoryCount} • Toplam Mesaj: ${c.stats?.totalMessages || 0}</div>
              </div>
            </div>
            <div class="chat-controls">
              <div class="toggle-switch">
                <span>Bot İzni:</span>
                <label class="switch">
                  <input type="checkbox" class="toggle-chat-allowed" data-id="${c.chat_id}" ${c.is_allowed ? "checked" : ""}>
                  <span class="slider"></span>
                </label>
              </div>
              <div class="prob-slider-container">
                <span>Yanıt Olasılığı: <strong id="prob-val-${c.chat_id}">${prob}%</strong></span>
                <input type="range" min="0" max="100" value="${prob}" class="slider-prob" data-id="${c.chat_id}">
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    // Toggle permission event
    document.querySelectorAll(".toggle-chat-allowed").forEach((chk) => {
      chk.addEventListener("change", async (e) => {
        const chatId = e.target.getAttribute("data-id");
        const allowed = e.target.checked;
        try {
          await apiFetch(`/api/chats/${chatId}`, {
            method: "PATCH",
            body: JSON.stringify({ is_allowed: allowed }),
          });
          loadDashboardStats();
        } catch (err) {
          alert("Ayar güncellenemedi: " + err.message);
          e.target.checked = !allowed;
        }
      });
    });

    // Probability slider event
    document.querySelectorAll(".slider-prob").forEach((slider) => {
      slider.addEventListener("input", (e) => {
        const chatId = e.target.getAttribute("data-id");
        const val = e.target.value;
        const display = document.getElementById(`prob-val-${chatId}`);
        if (display) display.textContent = `${val}%`;
      });

      slider.addEventListener("change", async (e) => {
        const chatId = e.target.getAttribute("data-id");
        const probFraction = parseFloat(e.target.value) / 100;
        try {
          await apiFetch(`/api/chats/${chatId}`, {
            method: "PATCH",
            body: JSON.stringify({ reply_probability: probFraction }),
          });
        } catch (err) {
          alert("Yanıt olasılığı güncellenemedi: " + err.message);
        }
      });
    });
  }

  function populateChatSelects(chats) {
    const memFilter = document.getElementById("memory-chat-filter");
    const modalSelect = document.getElementById("modal-chat-id");

    const currentFilterVal = memFilter.value;

    let optionsHtml = '<option value="">Tüm Gruplar</option>';
    let modalOptionsHtml = "";

    chats.forEach((c) => {
      const title = c.title || `Grup ${c.chat_id}`;
      optionsHtml += `<option value="${c.chat_id}">${escapeHtml(title)} (${c.chat_id})</option>`;
      modalOptionsHtml += `<option value="${c.chat_id}">${escapeHtml(title)} (${c.chat_id})</option>`;
    });

    if (memFilter) {
      memFilter.innerHTML = optionsHtml;
      memFilter.value = currentFilterVal;
    }
    if (modalSelect) {
      modalSelect.innerHTML = modalOptionsHtml;
    }
  }

  // --- 4. Logs Tab ---
  const logConsole = document.getElementById("log-console");
  const logSearchInput = document.getElementById("log-search");
  const btnRefreshLogs = document.getElementById("btn-refresh-logs");
  const logFileSelect = document.getElementById("log-file-select");
  const levelPills = document.querySelectorAll("#log-level-pills .pill");

  let activeLogLevel = "ALL";

  levelPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      levelPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      activeLogLevel = pill.getAttribute("data-level");
      loadLogs();
    });
  });

  async function loadLogs() {
    logConsole.innerHTML = '<div class="loading-spinner">Loglar yükleniyor...</div>';

    const type = logFileSelect.value;
    const search = logSearchInput.value.trim();

    let query = `/api/logs?type=${type}&level=${activeLogLevel}&search=${encodeURIComponent(search)}&limit=150`;

    try {
      const data = await apiFetch(query);
      renderLogs(data.logs || []);
    } catch (e) {
      logConsole.innerHTML = '<div class="loading-spinner">Loglar okunamadı.</div>';
    }
  }

  function renderLogs(logs) {
    if (!logs || logs.length === 0) {
      logConsole.innerHTML = '<div class="loading-spinner">Eşleşen log bulunamadı.</div>';
      return;
    }

    logConsole.innerHTML = logs
      .map((l) => {
        const lvlClass = l.level || "INFO";
        return `<div class="log-line ${lvlClass}"><span class="ts">${l.timestamp}</span> <span class="lvl">[${lvlClass}]</span> ${escapeHtml(l.message)}</div>`;
      })
      .join("");

    // Auto scroll to bottom
    logConsole.scrollTop = logConsole.scrollHeight;
  }

  btnRefreshLogs?.addEventListener("click", loadLogs);
  logFileSelect?.addEventListener("change", loadLogs);
  logSearchInput?.addEventListener("input", debounce(loadLogs, 300));

  // --- 5. Settings Tab ---
  const settingModel = document.getElementById("setting-model");
  const settingReplyProb = document.getElementById("setting-reply-prob");
  const settingReplyProbVal = document.getElementById("setting-reply-prob-val");
  const settingHistoryLimit = document.getElementById("setting-history-limit");
  const settingAgentSteps = document.getElementById("setting-agent-steps");
  const settingLogLevel = document.getElementById("setting-log-level");
  const settingWebSearch = document.getElementById("setting-web-search");
  const btnSaveSettings = document.getElementById("btn-save-settings");

  settingReplyProb?.addEventListener("input", (e) => {
    if (settingReplyProbVal) settingReplyProbVal.textContent = `${e.target.value}%`;
  });

  async function loadSettings() {
    try {
      const s = await apiFetch("/api/settings");
      if (settingModel) settingModel.value = s.gemini_model || "gemini-3.5-flash-lite";
      if (settingReplyProb) {
        const pct = Math.round((s.default_reply_probability || 0.05) * 100);
        settingReplyProb.value = pct;
        if (settingReplyProbVal) settingReplyProbVal.textContent = `${pct}%`;
      }
      if (settingHistoryLimit) settingHistoryLimit.value = s.chat_history_limit || 10;
      if (settingAgentSteps) settingAgentSteps.value = s.max_agent_steps || 3;
      if (settingLogLevel) settingLogLevel.value = s.log_level || "info";
      if (settingWebSearch) settingWebSearch.checked = Boolean(s.enable_web_search);

      const sysModelEl = document.getElementById("sys-model");
      if (sysModelEl) sysModelEl.textContent = s.gemini_model || "gemini-3.5-flash-lite";
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  }

  btnSaveSettings?.addEventListener("click", async () => {
    try {
      btnSaveSettings.disabled = true;
      btnSaveSettings.textContent = "Kaydediliyor...";

      const payload = {
        gemini_model: settingModel.value,
        default_reply_probability: parseFloat(settingReplyProb.value) / 100,
        chat_history_limit: parseInt(settingHistoryLimit.value, 10),
        max_agent_steps: parseInt(settingAgentSteps.value, 10),
        log_level: settingLogLevel.value,
        enable_web_search: settingWebSearch.checked,
      };

      await apiFetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      alert("Ayarlar başarıyla kaydedildi.");
      loadSettings();
    } catch (e) {
      alert("Ayarlar kaydedilemedi: " + e.message);
    } finally {
      btnSaveSettings.disabled = false;
      btnSaveSettings.textContent = "Ayarları Kaydet";
    }
  });

  // --- Memories Export & Import ---
  const btnExportMemories = document.getElementById("btn-export-memories");
  const btnImportMemories = document.getElementById("btn-import-memories");
  const fileImportMemories = document.getElementById("file-import-memories");

  btnExportMemories?.addEventListener("click", async () => {
    try {
      const data = await apiFetch("/api/memories/export");
      const blob = new Blob([JSON.stringify(data.memories, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ket_ai_memories_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Hafıza dışa aktarılamadı: " + e.message);
    }
  });

  btnImportMemories?.addEventListener("click", () => {
    fileImportMemories?.click();
  });

  fileImportMemories?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const memories = JSON.parse(text);
      if (!Array.isArray(memories)) {
        alert("Geçersiz dosya formatı: Dizi (Array) bekleniyor.");
        return;
      }

      const res = await apiFetch("/api/memories/import", {
        method: "POST",
        body: JSON.stringify({ memories }),
      });

      alert(`${res.importedCount} adet hafıza kaydı başarıyla yüklendi.`);
      loadMemories();
      loadDashboardStats();
    } catch (err) {
      alert("İçe aktarma hatası: " + err.message);
    } finally {
      e.target.value = "";
    }
  });

  // --- Tool Traces ---
  const traceConsole = document.getElementById("trace-console");
  const btnRefreshTraces = document.getElementById("btn-refresh-traces");

  async function loadToolTraces() {
    if (!traceConsole) return;
    try {
      const res = await apiFetch("/api/tool-traces");
      renderToolTraces(res.traces || []);
    } catch (e) {
      traceConsole.innerHTML = '<div class="loading-spinner">İzleme bilgileri okunamadı.</div>';
    }
  }

  function renderToolTraces(traces) {
    if (!traces || traces.length === 0) {
      traceConsole.innerHTML = '<div class="loading-spinner">Henüz kayıtlı araç çağrısı yok.</div>';
      return;
    }

    traceConsole.innerHTML = traces
      .map((t) => {
        const duration = t.executionTimeMs ? ` (${t.executionTimeMs}ms)` : "";
        return `
          <div class="log-line INFO">
            <span class="ts">${t.timestamp}</span> <span class="lvl">[STEP ${t.step}]</span> <strong>${escapeHtml(t.toolName)}</strong>${duration}
            <div style="color: var(--text-muted); font-size: 10px; margin-top: 2px;">
              Argümanlar: ${escapeHtml(JSON.stringify(t.args))}
            </div>
            ${t.resultSnippet ? `<div style="color: var(--text-secondary); font-size: 11px; margin-top: 2px;">Sonuç: ${escapeHtml(t.resultSnippet)}</div>` : ""}
          </div>
        `;
      })
      .join("");
  }

  btnRefreshTraces?.addEventListener("click", loadToolTraces);

  // --- 6. Sandbox Tab ---
  const sandboxPrompt = document.getElementById("sandbox-prompt");
  const btnRunSandbox = document.getElementById("btn-run-sandbox");
  const sandboxStatus = document.getElementById("sandbox-status");
  const sandboxOutput = document.getElementById("sandbox-output");

  btnRunSandbox?.addEventListener("click", async () => {
    const prompt = sandboxPrompt?.value.trim();
    if (!prompt) {
      alert("Lütfen bir soru veya istem yazın.");
      return;
    }

    try {
      btnRunSandbox.disabled = true;
      if (sandboxStatus) sandboxStatus.textContent = "Gemini yanıt üretiyor...";
      if (sandboxOutput) sandboxOutput.innerHTML = '<span style="color: var(--text-muted);">İşleniyor...</span>';

      const res = await apiFetch("/api/sandbox", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });

      if (sandboxStatus) sandboxStatus.textContent = `Tamamlandı (${res.executionTimeMs}ms • ${res.model})`;
      if (sandboxOutput) sandboxOutput.textContent = res.reply;
    } catch (e) {
      if (sandboxStatus) sandboxStatus.textContent = "Hata oluştu";
      if (sandboxOutput) sandboxOutput.textContent = "Hata: " + e.message;
    } finally {
      btnRunSandbox.disabled = false;
    }
  });

  // Utility helpers
  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // --- Initial Setup ---
  initAuth();
  loadDashboardStats();
  loadChats();
  loadSettings();
})();
