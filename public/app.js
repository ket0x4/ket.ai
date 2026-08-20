const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

const initData = tg?.initData ?? "";
let chatsData = [];

// API helper utilizing ESNext async/await & object spreading
const apiFetch = async (endpoint, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    "x-telegram-init-data": initData,
    ...(options.headers ?? {}),
  };

  try {
    const res = await fetch(endpoint, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    console.error(`API Error [${endpoint}]:`, e);
    throw e;
  }
};

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
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function blockAccess(title, message) {
  const appEl = document.getElementById("app");
  if (!appEl) return;
  appEl.innerHTML = `
    <div class="access-denied-container">
      <div class="access-denied-card">
        <div class="access-denied-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
        <div class="access-denied-hint">
          Please open the bot in Telegram and use the <strong>Console</strong> menu button or <code>/app</code> command.
        </div>
      </div>
    </div>
  `;
}

const navBtns = document.querySelectorAll(".nav-btn");
const tabPanes = document.querySelectorAll(".tab-pane");

navBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetTab = btn.getAttribute("data-tab");
    navBtns.forEach((b) => b.classList.remove("active"));
    tabPanes.forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(targetTab)?.classList.add("active");

    if (targetTab === "tab-dashboard") loadDashboardStats();
    if (targetTab === "tab-memories") loadMemories();
    if (targetTab === "tab-chats") loadChats();
    if (targetTab === "tab-system") {
      loadSettings();
      loadLogs();
      loadToolTraces();
    }
  });
});

const loadDashboardStats = async () => {
  try {
    const stats = (await apiFetch("/api/stats")) ?? {};
    document.getElementById("stat-total-chats").textContent =
      stats.totalChats ?? 0;
    document.getElementById("stat-allowed-chats").textContent =
      stats.allowedChats ?? 0;
    document.getElementById("stat-total-memories").textContent =
      stats.totalMemories ?? 0;
    document.getElementById("stat-total-messages").textContent =
      stats.totalMessages ?? 0;

    const cats = stats.categoryStats ?? {
      PROFILE: 0,
      DYNAMIC: 0,
      TEMPORARY: 0,
    };
    const totalMems = stats.totalMemories || 1;
    const pProf = Math.round(((cats.PROFILE ?? 0) / totalMems) * 100);
    const pDyn = Math.round(((cats.DYNAMIC ?? 0) / totalMems) * 100);
    const pTemp = Math.max(0, 100 - pProf - pDyn);

    const segProf = document.getElementById("seg-profile");
    const segDyn = document.getElementById("seg-dynamic");
    const segTemp = document.getElementById("seg-temporary");

    if (segProf) segProf.style.width = `${pProf}%`;
    if (segDyn) segDyn.style.width = `${pDyn}%`;
    if (segTemp) segTemp.style.width = `${pTemp}%`;

    const cntProf = document.getElementById("cat-cnt-profile");
    const cntDyn = document.getElementById("cat-cnt-dynamic");
    const cntTemp = document.getElementById("cat-cnt-temporary");

    if (cntProf) cntProf.textContent = cats.PROFILE ?? 0;
    if (cntDyn) cntDyn.textContent = cats.DYNAMIC ?? 0;
    if (cntTemp) cntTemp.textContent = cats.TEMPORARY ?? 0;

    const uptimeSec = stats.uptimeSeconds ?? 0;
    const hours = Math.floor(uptimeSec / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);
    const secs = uptimeSec % 60;

    const sysUptime = document.getElementById("sys-uptime");
    const sysMemory = document.getElementById("sys-memory");
    const sysDbSize = document.getElementById("sys-dbsize");
    const sysModel = document.getElementById("sys-model");
    const sysWebSearch = document.getElementById("sys-websearch");

    if (sysUptime) sysUptime.textContent = `${hours}h ${mins}m ${secs}s`;
    if (sysMemory) sysMemory.textContent = `${stats.memoryUsageMb ?? 0} MB`;

    const bytes = stats.dbSizeBytes ?? 0;
    const kb = Math.round(bytes / 1024);
    if (sysDbSize)
      sysDbSize.textContent =
        kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
    if (sysModel) sysModel.textContent = stats.model ?? "Gemini 3.5 Flash Lite";
    if (sysWebSearch)
      sysWebSearch.textContent = stats.webSearch ? "Enabled" : "Disabled";

    const topContainer = document.getElementById("top-chats-container");
    if (topContainer) {
      if (!stats.topChats?.length) {
        topContainer.innerHTML =
          '<div style="color: var(--text-muted); font-size: 12px;">No active groups found yet.</div>';
      } else {
        topContainer.innerHTML = stats.topChats
          .map(
            ({ title, chat_id, message_count, is_allowed }) => `
          <div class="top-chat-item">
            <div class="top-chat-name">${escapeHtml(title ?? `Group ${chat_id}`)}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="top-chat-badge">${message_count} Messages</span>
              <span class="tag" style="font-size: 10px;">${is_allowed ? "Allowed" : "Blocked"}</span>
            </div>
          </div>
        `,
          )
          .join("");
      }
    }
  } catch (e) {
    console.error("Failed to load dashboard stats:", e);
  }
};

document.querySelectorAll(".btn-quick").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const action = e.currentTarget.getAttribute("data-action");
    if (action === "add-mem") {
      document.querySelector('[data-tab="tab-memories"]')?.click();
      setTimeout(() => document.getElementById("btn-add-memory")?.click(), 100);
    }
    if (action === "open-sandbox") {
      document.querySelector('[data-tab="tab-sandbox"]')?.click();
    }
    if (action === "open-logs") {
      document.querySelector('[data-tab="tab-system"]')?.click();
    }
    if (action === "open-chats") {
      document.querySelector('[data-tab="tab-chats"]')?.click();
    }
  });
});

const memorySearchInput = document.getElementById("memory-search");
const memoryChatFilter = document.getElementById("memory-chat-filter");
const memoryCategoryFilter = document.getElementById("memory-category-filter");
const memoryContainer = document.getElementById("memory-list-container");

const loadMemories = async () => {
  if (memoryContainer)
    memoryContainer.innerHTML =
      '<div class="loading-spinner">Loading memories...</div>';

  const chatId = memoryChatFilter?.value ?? "";
  const category = memoryCategoryFilter?.value ?? "";
  const search = memorySearchInput?.value.trim() ?? "";

  let query = `/api/memories?search=${encodeURIComponent(search)}`;
  if (chatId) query += `&chat_id=${encodeURIComponent(chatId)}`;
  if (category) query += `&category=${encodeURIComponent(category)}`;

  try {
    const memories = await apiFetch(query);
    renderMemories(memories);
  } catch (e) {
    if (memoryContainer)
      memoryContainer.innerHTML =
        '<div class="loading-spinner">Failed to load memories.</div>';
  }
};

const renderMemories = (memories) => {
  if (!memoryContainer) return;
  if (!memories?.length) {
    memoryContainer.innerHTML =
      '<div class="loading-spinner">No memories found.</div>';
    return;
  }

  memoryContainer.innerHTML = memories
    .map(({ id, created_at, expires_at, category, chat_id, memory_text }) => {
      const dateStr = new Date(created_at * 1000).toLocaleString("en-US");
      const expiryStr = expires_at
        ? ` • Expires: ${new Date(expires_at * 1000).toLocaleDateString("en-US")}`
        : "";

      return `
        <div class="memory-item" data-id="${id}">
          <div class="memory-meta">
            <div class="memory-meta-left">
              <span class="tag">${category ?? "PROFILE"}</span>
              <span>Group: ${chat_id}${expiryStr}</span>
            </div>
            <span>${dateStr}</span>
          </div>
          <div class="memory-body">${escapeHtml(memory_text)}</div>
          <div class="memory-footer" style="gap: 6px;">
            <button class="btn btn-secondary btn-edit-mem" data-id="${id}" data-text="${escapeHtml(memory_text)}" data-category="${category ?? "PROFILE"}">Edit</button>
            <button class="btn btn-danger btn-delete-mem" data-id="${id}">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");

  document.querySelectorAll(".btn-edit-mem").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const { id, text, category } = e.currentTarget.dataset;
      if (modalEditId) modalEditId.value = id;
      if (modalEditMemoryText) modalEditMemoryText.value = text;
      if (modalEditCategory) modalEditCategory.value = category;
      modalEdit?.classList.add("active");
    });
  });

  document.querySelectorAll(".btn-delete-mem").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      if (confirm(`Are you sure you want to delete memory ID ${id}?`)) {
        try {
          await apiFetch(`/api/memories/${id}`, { method: "DELETE" });
          loadMemories();
          loadDashboardStats();
        } catch (err) {
          alert("Delete failed: " + err.message);
        }
      }
    });
  });
};

memorySearchInput?.addEventListener("input", debounce(loadMemories, 300));
memoryChatFilter?.addEventListener("change", loadMemories);
memoryCategoryFilter?.addEventListener("change", loadMemories);

const modalAdd = document.getElementById("modal-add-memory");
const btnAddMem = document.getElementById("btn-add-memory");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalCancelBtn = document.getElementById("modal-cancel-btn");
const modalSaveBtn = document.getElementById("modal-save-btn");

btnAddMem?.addEventListener("click", () => {
  modalAdd?.classList.add("active");
});

const closeModal = () => modalAdd?.classList.remove("active");

modalCloseBtn?.addEventListener("click", closeModal);
modalCancelBtn?.addEventListener("click", closeModal);

modalSaveBtn?.addEventListener("click", async () => {
  const chatId = document.getElementById("modal-chat-id")?.value;
  const category = document.getElementById("modal-category")?.value;
  const memoryText = document.getElementById("modal-memory-text")?.value.trim();

  if (!chatId || !memoryText) {
    alert("Please select a group and enter memory text.");
    return;
  }

  try {
    modalSaveBtn.disabled = true;
    modalSaveBtn.textContent = "Saving...";
    await apiFetch("/api/memories", {
      method: "POST",
      body: JSON.stringify({ chatId, memoryText, category }),
    });
    const txtArea = document.getElementById("modal-memory-text");
    if (txtArea) txtArea.value = "";
    closeModal();
    loadMemories();
    loadDashboardStats();
  } catch (e) {
    alert("Failed to add memory: " + e.message);
  } finally {
    modalSaveBtn.disabled = false;
    modalSaveBtn.textContent = "Save";
  }
});

const btnPruneMemories = document.getElementById("btn-prune-memories");

btnPruneMemories?.addEventListener("click", async () => {
  try {
    btnPruneMemories.disabled = true;
    const res = await apiFetch("/api/memories/prune", { method: "POST" });
    alert(`Pruned ${res.prunedCount ?? 0} expired memory records.`);
    loadMemories();
    loadDashboardStats();
  } catch (e) {
    alert("Prune failed: " + e.message);
  } finally {
    btnPruneMemories.disabled = false;
  }
});

const modalEdit = document.getElementById("modal-edit-memory");
const modalEditCloseBtn = document.getElementById("modal-edit-close-btn");
const modalEditCancelBtn = document.getElementById("modal-edit-cancel-btn");
const modalEditSaveBtn = document.getElementById("modal-edit-save-btn");
const modalEditId = document.getElementById("modal-edit-id");
const modalEditCategory = document.getElementById("modal-edit-category");
const modalEditMemoryText = document.getElementById("modal-edit-memory-text");

const closeEditModal = () => modalEdit?.classList.remove("active");

modalEditCloseBtn?.addEventListener("click", closeEditModal);
modalEditCancelBtn?.addEventListener("click", closeEditModal);

modalEditSaveBtn?.addEventListener("click", async () => {
  const id = modalEditId?.value;
  const memoryText = modalEditMemoryText?.value.trim();
  const category = modalEditCategory?.value;

  if (!id || !memoryText) {
    alert("Please enter memory text.");
    return;
  }

  try {
    modalEditSaveBtn.disabled = true;
    modalEditSaveBtn.textContent = "Updating...";
    await apiFetch(`/api/memories/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ memoryText, category }),
    });
    closeEditModal();
    loadMemories();
  } catch (e) {
    alert("Update failed: " + e.message);
  } finally {
    modalEditSaveBtn.disabled = false;
    modalEditSaveBtn.textContent = "Update";
  }
});

const chatContainer = document.getElementById("chat-list-container");

const loadChats = async () => {
  if (chatContainer)
    chatContainer.innerHTML =
      '<div class="loading-spinner">Loading groups...</div>';
  try {
    chatsData = (await apiFetch("/api/chats")) ?? [];
    renderChats(chatsData);
    populateChatSelects(chatsData);
  } catch (e) {
    if (chatContainer)
      chatContainer.innerHTML =
        '<div class="loading-spinner">Failed to load groups.</div>';
  }
};

const renderChats = (chats) => {
  if (!chatContainer) return;
  if (!chats?.length) {
    chatContainer.innerHTML =
      '<div class="loading-spinner">No registered groups found.</div>';
    return;
  }

  chatContainer.innerHTML = chats
    .map(
      ({
        title,
        chat_id,
        reply_probability,
        memoryCount,
        stats,
        is_allowed,
      }) => {
        const displayTitle = title ?? `Group ${chat_id}`;
        const prob = Math.round((reply_probability ?? 0.05) * 100);

        return `
        <div class="chat-item">
          <div class="chat-header-row">
            <div>
              <div class="chat-title">${escapeHtml(displayTitle)}</div>
              <div class="chat-id">ID: ${chat_id} • Memories: ${memoryCount} • Messages: ${stats?.totalMessages ?? 0}</div>
            </div>
          </div>
          <div class="chat-controls">
            <div class="toggle-switch">
              <span>Bot Permission:</span>
              <label class="switch">
                <input type="checkbox" class="toggle-chat-allowed" data-id="${chat_id}" ${is_allowed ? "checked" : ""}>
                <span class="slider"></span>
              </label>
            </div>
            <div class="prob-slider-container">
              <span>Reply Probability: <strong id="prob-val-${chat_id}">${prob}%</strong></span>
              <input type="range" min="0" max="100" value="${prob}" class="slider-prob" data-id="${chat_id}">
            </div>
          </div>
        </div>
      `;
      },
    )
    .join("");

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
        alert("Setting update failed: " + err.message);
        e.target.checked = !allowed;
      }
    });
  });

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
        alert("Reply probability update failed: " + err.message);
      }
    });
  });
};

const populateChatSelects = (chats) => {
  const memFilter = document.getElementById("memory-chat-filter");
  const modalSelect = document.getElementById("modal-chat-id");
  const currentFilterVal = memFilter?.value ?? "";

  let optionsHtml = '<option value="">All Groups</option>';
  let modalOptionsHtml = "";

  chats.forEach(({ title, chat_id }) => {
    const displayTitle = title ?? `Group ${chat_id}`;
    optionsHtml += `<option value="${chat_id}">${escapeHtml(displayTitle)} (${chat_id})</option>`;
    modalOptionsHtml += `<option value="${chat_id}">${escapeHtml(displayTitle)} (${chat_id})</option>`;
  });

  if (memFilter) {
    memFilter.innerHTML = optionsHtml;
    memFilter.value = currentFilterVal;
  }
  if (modalSelect) {
    modalSelect.innerHTML = modalOptionsHtml;
  }
};

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
    activeLogLevel = pill.getAttribute("data-level") ?? "ALL";
    loadLogs();
  });
});

const loadLogs = async () => {
  if (logConsole)
    logConsole.innerHTML = '<div class="loading-spinner">Loading logs...</div>';

  const type = logFileSelect?.value ?? "app";
  const search = logSearchInput?.value.trim() ?? "";
  const query = `/api/logs?type=${type}&level=${activeLogLevel}&search=${encodeURIComponent(search)}&limit=150`;

  try {
    const data = await apiFetch(query);
    renderLogs(data.logs ?? []);
  } catch (e) {
    if (logConsole)
      logConsole.innerHTML =
        '<div class="loading-spinner">Failed to read logs.</div>';
  }
};

const renderLogs = (logs) => {
  if (!logConsole) return;
  if (!logs?.length) {
    logConsole.innerHTML =
      '<div class="loading-spinner">No matching log entries.</div>';
    return;
  }

  logConsole.innerHTML = logs
    .map(({ level, timestamp, message }) => {
      const lvlClass = level ?? "INFO";
      return `<div class="log-line ${lvlClass}"><span class="ts">${timestamp}</span> <span class="lvl">[${lvlClass}]</span> ${escapeHtml(message)}</div>`;
    })
    .join("");

  logConsole.scrollTop = logConsole.scrollHeight;
};

btnRefreshLogs?.addEventListener("click", loadLogs);
logFileSelect?.addEventListener("change", loadLogs);
logSearchInput?.addEventListener("input", debounce(loadLogs, 300));

const settingModel = document.getElementById("setting-model");
const settingReplyProb = document.getElementById("setting-reply-prob");
const settingReplyProbVal = document.getElementById("setting-reply-prob-val");
const settingHistoryLimit = document.getElementById("setting-history-limit");
const settingAgentSteps = document.getElementById("setting-agent-steps");
const settingLogLevel = document.getElementById("setting-log-level");
const settingWebSearch = document.getElementById("setting-web-search");
const btnSaveSettings = document.getElementById("btn-save-settings");

settingReplyProb?.addEventListener("input", (e) => {
  if (settingReplyProbVal)
    settingReplyProbVal.textContent = `${e.target.value}%`;
});

const loadSettings = async () => {
  try {
    const s = (await apiFetch("/api/settings")) ?? {};
    if (settingModel)
      settingModel.value = s.gemini_model ?? "gemini-3.5-flash-lite";
    if (settingReplyProb) {
      const pct = Math.round((s.default_reply_probability ?? 0.05) * 100);
      settingReplyProb.value = pct;
      if (settingReplyProbVal) settingReplyProbVal.textContent = `${pct}%`;
    }
    if (settingHistoryLimit)
      settingHistoryLimit.value = s.chat_history_limit ?? 10;
    if (settingAgentSteps) settingAgentSteps.value = s.max_agent_steps ?? 3;
    if (settingLogLevel) settingLogLevel.value = s.log_level ?? "info";
    if (settingWebSearch)
      settingWebSearch.checked = Boolean(s.enable_web_search);

    const sysModelEl = document.getElementById("sys-model");
    if (sysModelEl)
      sysModelEl.textContent = s.gemini_model ?? "gemini-3.5-flash-lite";
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
};

btnSaveSettings?.addEventListener("click", async () => {
  try {
    btnSaveSettings.disabled = true;
    btnSaveSettings.textContent = "Saving...";

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

    alert("Settings saved successfully.");
    loadSettings();
  } catch (e) {
    alert("Failed to save settings: " + e.message);
  } finally {
    btnSaveSettings.disabled = false;
    btnSaveSettings.textContent = "Save Settings";
  }
});

const btnClearCache = document.getElementById("btn-clear-cache");

btnClearCache?.addEventListener("click", async () => {
  try {
    btnClearCache.disabled = true;
    await apiFetch("/api/settings/cache-clear", { method: "POST" });
    alert("Memory cache flushed successfully.");
  } catch (e) {
    alert("Failed to clear cache: " + e.message);
  } finally {
    btnClearCache.disabled = false;
  }
});

const btnExportMemories = document.getElementById("btn-export-memories");
const btnImportMemories = document.getElementById("btn-import-memories");
const fileImportMemories = document.getElementById("file-import-memories");

btnExportMemories?.addEventListener("click", async () => {
  try {
    const data = await apiFetch("/api/memories/export");
    const blob = new Blob([JSON.stringify(data.memories, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ket_ai_memories_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert("Failed to export memories: " + e.message);
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
      alert("Invalid file format: Array expected.");
      return;
    }

    const res = await apiFetch("/api/memories/import", {
      method: "POST",
      body: JSON.stringify({ memories }),
    });

    alert(`Successfully imported ${res.importedCount ?? 0} memory records.`);
    loadMemories();
    loadDashboardStats();
  } catch (err) {
    alert("Import failed: " + err.message);
  } finally {
    e.target.value = "";
  }
});

const traceConsole = document.getElementById("trace-console");
const btnRefreshTraces = document.getElementById("btn-refresh-traces");

const loadToolTraces = async () => {
  if (!traceConsole) return;
  try {
    const res = await apiFetch("/api/tool-traces");
    renderToolTraces(res.traces ?? []);
  } catch (e) {
    traceConsole.innerHTML =
      '<div class="loading-spinner">Failed to load traces.</div>';
  }
};

const renderToolTraces = (traces) => {
  if (!traceConsole) return;
  if (!traces?.length) {
    traceConsole.innerHTML =
      '<div class="loading-spinner">No tool calls recorded yet.</div>';
    return;
  }

  traceConsole.innerHTML = traces
    .map(
      ({ executionTimeMs, timestamp, step, toolName, args, resultSnippet }) => {
        const duration = executionTimeMs ? ` (${executionTimeMs}ms)` : "";
        return `
        <div class="log-line INFO">
          <span class="ts">${timestamp}</span> <span class="lvl">[STEP ${step}]</span> <strong>${escapeHtml(toolName)}</strong>${duration}
          <div style="color: var(--text-muted); font-size: 10px; margin-top: 2px;">
            Arguments: ${escapeHtml(JSON.stringify(args))}
          </div>
          ${resultSnippet ? `<div style="color: var(--text-secondary); font-size: 11px; margin-top: 2px;">Result: ${escapeHtml(resultSnippet)}</div>` : ""}
        </div>
      `;
      },
    )
    .join("");
};

btnRefreshTraces?.addEventListener("click", loadToolTraces);

const sandboxPrompt = document.getElementById("sandbox-prompt");
const btnRunSandbox = document.getElementById("btn-run-sandbox");
const sandboxStatus = document.getElementById("sandbox-status");
const sandboxOutput = document.getElementById("sandbox-output");

btnRunSandbox?.addEventListener("click", async () => {
  const prompt = sandboxPrompt?.value.trim();
  if (!prompt) {
    alert("Please enter a prompt.");
    return;
  }

  try {
    btnRunSandbox.disabled = true;
    if (sandboxStatus) sandboxStatus.textContent = "Generating response...";
    if (sandboxOutput)
      sandboxOutput.innerHTML =
        '<span style="color: var(--text-muted);">Processing...</span>';

    const res = await apiFetch("/api/sandbox", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });

    if (sandboxStatus)
      sandboxStatus.textContent = `Completed (${res.executionTimeMs}ms • ${res.model})`;
    if (sandboxOutput) sandboxOutput.textContent = res.reply;
  } catch (e) {
    if (sandboxStatus) sandboxStatus.textContent = "Error occurred";
    if (sandboxOutput) sandboxOutput.textContent = "Error: " + e.message;
  } finally {
    btnRunSandbox.disabled = false;
  }
});

const bootstrap = async () => {
  if (!initData) {
    blockAccess(
      "Telegram Access Only",
      "This dashboard is protected and can only be opened inside Telegram Mini App."
    );
    return;
  }

  try {
    const auth = await apiFetch("/api/me");
    if (!auth || !auth.valid) {
      blockAccess(
        "Unauthorized",
        "Invalid Telegram cryptographic signature. Please reopen from Telegram."
      );
      return;
    }

    if (auth.user) {
      const userNameEl = document.getElementById("user-name");
      if (userNameEl)
        userNameEl.textContent = auth.user.first_name ?? auth.user.username ?? "User";

      const roleEl = document.getElementById("user-role");
      if (roleEl) {
        roleEl.textContent = auth.isOwner ? "Owner" : "User";
        if (!auth.isOwner) {
          roleEl.style.backgroundColor = "#3b82f6";
        }
      }
    }

    // Load initial data only after authentication succeeds
    loadDashboardStats();
    loadChats();
    loadSettings();
  } catch (e) {
    blockAccess(
      "Access Denied",
      "Could not verify Telegram authentication. Please reopen the bot inside Telegram."
    );
  }
};

bootstrap();
