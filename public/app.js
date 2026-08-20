const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

const initData = tg?.initData ?? "";
let currentUser = null;
let currentRole = "user"; // "owner" | "admin" | "user"
let adminChatIds = [];
let memberChatIds = [];
let chatsData = [];
let _currentMemories = [];

// Toast notification helper
function showToast(message, type = "info") {
	const container = document.getElementById("toast-container");
	if (!container) return;

	const toast = document.createElement("div");
	toast.className = `toast toast-${type}`;
	toast.textContent = message;
	container.appendChild(toast);

	setTimeout(() => {
		toast.style.opacity = "0";
		toast.style.transform = "translateY(8px)";
		toast.style.transition = "all 0.2s ease";
		setTimeout(() => toast.remove(), 220);
	}, 2800);
}

// API Fetch Helper
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
	return String(str)
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
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
        <div class="access-denied-hint">
          Please open this bot inside Telegram and use the <strong>Console</strong> menu button or <code>/app</code> command.
        </div>
      </div>
    </div>
  `;
}

// Setup Role-Based Navigation
function setupRoleTabs(role) {
	const navBtns = document.querySelectorAll("#main-nav-tabs .nav-btn");
	navBtns.forEach((btn) => {
		const allowedRoles = (btn.getAttribute("data-roles") || "").split(",");
		if (allowedRoles.includes(role)) {
			btn.style.display = "inline-flex";
		} else {
			btn.style.display = "none";
		}
	});

	// Hide admin/owner only elements for regular users
	if (role === "user") {
		document.querySelectorAll(".admin-owner-only").forEach((el) => {
			el.style.display = "none";
		});
	}

	// Role badges styling
	const roleEl = document.getElementById("user-role");
	if (roleEl) {
		roleEl.className = `badge badge-role badge-${role}`;
		if (role === "owner") roleEl.textContent = "Owner";
		else if (role === "admin") roleEl.textContent = "Admin";
		else roleEl.textContent = "User";
	}

	const navLabelMem = document.getElementById("nav-label-memories");
	if (navLabelMem && role === "user") {
		navLabelMem.textContent = "My Facts";
	}
}

// Tab Switching
const navBtns = document.querySelectorAll(".nav-btn");
const tabPanes = document.querySelectorAll(".tab-pane");

navBtns.forEach((btn) => {
	btn.addEventListener("click", () => {
		const targetTab = btn.getAttribute("data-tab");
		navBtns.forEach((b) => {
			b.classList.remove("active");
		});
		tabPanes.forEach((p) => {
			p.classList.remove("active");
		});

		btn.classList.add("active");
		document.getElementById(targetTab)?.classList.add("active");

		if (targetTab === "tab-dashboard") loadDashboardStats();
		if (targetTab === "tab-memories") loadMemories();
		if (targetTab === "tab-chats") loadChats();
		if (targetTab === "tab-system" && currentRole === "owner") {
			loadSettings();
			loadLogs();
			loadToolTraces();
		}
	});
});

document
	.getElementById("btn-dashboard-view-groups")
	?.addEventListener("click", () => {
		const groupsBtn = document.querySelector('.nav-btn[data-tab="tab-chats"]');
		groupsBtn?.click();
	});

// ==========================================================================
// 1. DASHBOARD
// ==========================================================================
async function loadDashboardStats() {
	const gridEl = document.getElementById("dashboard-metrics-grid");
	const _topChatsEl = document.getElementById("top-chats-container");

	try {
		const s = await apiFetch("/api/stats");

		if (s.role === "owner") {
			// Owner view
			gridEl.innerHTML = `
        <div class="metric-card">
          <div class="metric-header">
            <span class="label">Groups</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <span class="value">${s.totalChats}</span>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <span class="label">Allowed</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <span class="value" style="color: var(--success-color);">${s.allowedChats}</span>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <span class="label">Memories</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
          </div>
          <span class="value">${s.totalMemories}</span>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <span class="label">Messages</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          </div>
          <span class="value">${s.totalMessages}</span>
        </div>
      `;

			// Category breakdown
			updateCategoryBar(s.categoryStats, s.totalMemories);

			// System stats
			const sysContainer = document.getElementById("system-stats-container");
			if (sysContainer) {
				sysContainer.style.display = "grid";
				document.getElementById("sys-uptime").textContent = formatUptime(
					s.uptimeSeconds,
				);
				document.getElementById("sys-memory").textContent =
					`${s.memoryUsageMb} MB`;
				document.getElementById("sys-dbsize").textContent =
					`${Math.round(s.dbSizeBytes / 1024)} KB`;
				document.getElementById("sys-model").textContent = s.model ?? "-";
			}

			renderTopChats(s.topChats);
		} else if (s.role === "admin") {
			// Group Admin view
			gridEl.innerHTML = `
        <div class="metric-card">
          <div class="metric-header">
            <span class="label">Managed Groups</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
          </div>
          <span class="value">${s.managedGroupsCount}</span>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <span class="label">Group Memories</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
          </div>
          <span class="value">${s.totalMemories}</span>
        </div>
        <div class="metric-card" style="grid-column: span 2;">
          <div class="metric-header">
            <span class="label">Group Messages</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          </div>
          <span class="value">${s.totalMessages}</span>
        </div>
      `;

			updateCategoryBar(s.categoryStats, s.totalMemories);
			renderTopChats(s.topChats);
		} else {
			// Regular User view
			gridEl.innerHTML = `
        <div class="metric-card">
          <div class="metric-header">
            <span class="label">My Saved Facts</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
          </div>
          <span class="value" style="color: #60a5fa;">${s.totalMemories}</span>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <span class="label">My Active Groups</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
          </div>
          <span class="value">${s.totalGroups}</span>
        </div>
        <div class="metric-card" style="grid-column: span 2;">
          <div class="metric-header">
            <span class="label">My Messages Recorded</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          </div>
          <span class="value">${s.totalMessages}</span>
        </div>
      `;

			// Hide category breakdown for users
			const catCard = document.getElementById("card-memory-distribution");
			if (catCard) catCard.style.display = "none";
		}
	} catch (_e) {
		gridEl.innerHTML = `<div class="loading-spinner">Failed to load metrics.</div>`;
	}
}

function updateCategoryBar(catStats = {}, _total = 0) {
	const pCount = catStats.PROFILE || 0;
	const dCount = catStats.DYNAMIC || 0;
	const tCount = catStats.TEMPORARY || 0;

	document.getElementById("cat-cnt-profile").textContent = pCount;
	document.getElementById("cat-cnt-dynamic").textContent = dCount;
	document.getElementById("cat-cnt-temporary").textContent = tCount;

	const sum = pCount + dCount + tCount || 1;
	const pPct = Math.round((pCount / sum) * 100);
	const dPct = Math.round((dCount / sum) * 100);
	const tPct = Math.max(0, 100 - pPct - dPct);

	document.getElementById("seg-profile").style.width = `${pPct}%`;
	document.getElementById("seg-dynamic").style.width = `${dPct}%`;
	document.getElementById("seg-temporary").style.width = `${tPct}%`;
}

function renderTopChats(chats = []) {
	const container = document.getElementById("top-chats-container");
	if (!container) return;

	if (!chats || chats.length === 0) {
		container.innerHTML = `<div class="loading-spinner" style="padding: 12px;">No active groups recorded yet.</div>`;
		return;
	}

	container.innerHTML = chats
		.map(
			(c) => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
      <div style="display: flex; flex-direction: column; min-width: 0;">
        <span style="font-size: 13px; font-weight: 500; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(c.title || `Group (${c.chat_id})`)}</span>
        <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${escapeHtml(c.chat_id)}</span>
      </div>
      <span style="font-size: 12px; font-weight: 600; font-family: var(--font-mono); color: var(--text-secondary);">${c.message_count} msgs</span>
    </div>
  `,
		)
		.join("");
}

function formatUptime(seconds = 0) {
	const d = Math.floor(seconds / 86400);
	const h = Math.floor((seconds % 86400) / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	if (d > 0) return `${d}d ${h}h`;
	if (h > 0) return `${h}h ${m}m`;
	return `${m}m`;
}

// ==========================================================================
// 2. MEMORIES MANAGEMENT
// ==========================================================================
async function loadMemories() {
	const container = document.getElementById("memory-list-container");
	if (!container) return;

	const search = document.getElementById("memory-search")?.value.trim() || "";
	const cat = document.getElementById("memory-category-filter")?.value || "";
	const chatId = document.getElementById("memory-chat-filter")?.value || "";
	const scope = document.getElementById("memory-scope-filter")?.value || "mine";

	const params = new URLSearchParams();
	if (search) params.append("search", search);
	if (cat) params.append("category", cat);
	if (chatId) params.append("chat_id", chatId);
	if (scope) params.append("scope", scope);

	try {
		container.innerHTML =
			'<div class="loading-spinner">Loading memories...</div>';
		const memories =
			(await apiFetch(`/api/memories?${params.toString()}`)) ?? [];
		_currentMemories = memories;
		renderMemoryList(memories);
	} catch (e) {
		container.innerHTML = `<div class="loading-spinner">Failed to load memories: ${escapeHtml(e.message)}</div>`;
	}
}

function renderMemoryList(memories) {
	const container = document.getElementById("memory-list-container");
	if (!container) return;

	if (!memories || memories.length === 0) {
		container.innerHTML = `
      <div class="loading-spinner" style="padding: 32px 16px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; opacity: 0.5;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <div>No memories found matching your criteria.</div>
      </div>
    `;
		return;
	}

	container.innerHTML = memories
		.map((m) => {
			const catClass = (m.category || "PROFILE").toLowerCase();
			const dateStr = new Date(m.created_at * 1000).toLocaleDateString(
				undefined,
				{
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				},
			);

			// Permission check to display action buttons
			const isOwner = currentRole === "owner";
			const isAdminOfChat = adminChatIds.includes(m.chat_id);
			const isMyMemory = currentUser && m.user_id === currentUser.id;
			const canEditDelete = isOwner || isAdminOfChat || isMyMemory;

			// Group title matching
			const targetChat = chatsData.find((c) => c.chat_id === m.chat_id);
			const chatLabel = targetChat ? targetChat.title : m.chat_id;

			return `
      <div class="memory-card" data-id="${m.id}">
        <div class="memory-card-header">
          <div class="memory-badges-wrap">
            <span class="category-tag cat-${catClass}">${escapeHtml(m.category || "PROFILE")}</span>
            <span class="chat-context-tag">${escapeHtml(chatLabel || "Direct")}</span>
          </div>
          <div class="memory-timestamp">${dateStr}</div>
        </div>
        
        <div class="memory-text-content">${escapeHtml(m.memory_text)}</div>

        <div class="memory-card-footer">
          <button class="btn-icon-action btn-copy" data-text="${escapeHtml(m.memory_text)}" title="Copy memory">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy</span>
          </button>

          ${
						canEditDelete
							? `
          <div class="memory-card-actions">
            <button class="btn-icon-action btn-edit" data-id="${m.id}" data-text="${escapeHtml(m.memory_text)}" data-category="${m.category}" title="Edit memory">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              <span>Edit</span>
            </button>
            <button class="btn-icon-action btn-del" data-id="${m.id}" title="Delete memory">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Delete</span>
            </button>
          </div>
          `
							: `<div></div>`
					}
        </div>
      </div>
    `;
		})
		.join("");

	// Attach card event listeners
	container.querySelectorAll(".btn-copy").forEach((btn) => {
		btn.addEventListener("click", () => {
			const text = btn.getAttribute("data-text");
			if (navigator.clipboard && text) {
				navigator.clipboard
					.writeText(text)
					.then(() => showToast("Copied to clipboard!", "info"));
			}
		});
	});

	container.querySelectorAll(".btn-del").forEach((btn) => {
		btn.addEventListener("click", async () => {
			const id = btn.getAttribute("data-id");
			if (!confirm("Are you sure you want to permanently delete this memory?"))
				return;

			try {
				await apiFetch(`/api/memories/${id}`, { method: "DELETE" });
				showToast("Memory deleted successfully.", "success");
				loadMemories();
			} catch (e) {
				showToast(`Failed to delete: ${e.message}`, "error");
			}
		});
	});

	container.querySelectorAll(".btn-edit").forEach((btn) => {
		btn.addEventListener("click", () => {
			const id = btn.getAttribute("data-id");
			const text = btn.getAttribute("data-text");
			const cat = btn.getAttribute("data-category");

			document.getElementById("modal-edit-id").value = id;
			document.getElementById("modal-edit-memory-text").value = text;
			document.getElementById("modal-edit-category").value = cat || "PROFILE";

			document.getElementById("modal-edit-memory")?.classList.add("active");
		});
	});
}

// Memory filter events
document
	.getElementById("memory-search")
	?.addEventListener("input", debounce(loadMemories, 300));
document
	.getElementById("memory-category-filter")
	?.addEventListener("change", loadMemories);
document
	.getElementById("memory-chat-filter")
	?.addEventListener("change", loadMemories);
document
	.getElementById("memory-scope-filter")
	?.addEventListener("change", loadMemories);

// Add Memory Modal
const modalAdd = document.getElementById("modal-add-memory");
document.getElementById("btn-add-memory")?.addEventListener("click", () => {
	const chatSelect = document.getElementById("modal-chat-id");
	if (chatSelect) {
		chatSelect.innerHTML = "";
		if (currentUser) {
			chatSelect.innerHTML += `<option value="${currentUser.id}">Personal Profile (Me)</option>`;
		}
		chatsData.forEach((c) => {
			const canPost =
				currentRole === "owner" ||
				adminChatIds.includes(c.chat_id) ||
				memberChatIds.includes(c.chat_id);
			if (canPost && c.chat_id !== currentUser?.id.toString()) {
				chatSelect.innerHTML += `<option value="${c.chat_id}">${escapeHtml(c.title || c.chat_id)}</option>`;
			}
		});
	}
	document.getElementById("modal-memory-text").value = "";
	modalAdd?.classList.add("active");
});

document
	.getElementById("modal-close-btn")
	?.addEventListener("click", () => modalAdd?.classList.remove("active"));
document
	.getElementById("modal-cancel-btn")
	?.addEventListener("click", () => modalAdd?.classList.remove("active"));

document
	.getElementById("modal-save-btn")
	?.addEventListener("click", async () => {
		const chatId = document.getElementById("modal-chat-id")?.value;
		const category = document.getElementById("modal-category")?.value;
		const memoryText = document
			.getElementById("modal-memory-text")
			?.value.trim();

		if (!chatId || !memoryText) {
			showToast("Please enter memory content.", "error");
			return;
		}

		try {
			await apiFetch("/api/memories", {
				method: "POST",
				body: JSON.stringify({ chatId, memoryText, category }),
			});
			modalAdd?.classList.remove("active");
			showToast("Memory saved successfully!", "success");
			loadMemories();
		} catch (e) {
			showToast(`Error saving memory: ${e.message}`, "error");
		}
	});

// Edit Memory Modal
const modalEdit = document.getElementById("modal-edit-memory");
document
	.getElementById("modal-edit-close-btn")
	?.addEventListener("click", () => modalEdit?.classList.remove("active"));
document
	.getElementById("modal-edit-cancel-btn")
	?.addEventListener("click", () => modalEdit?.classList.remove("active"));

document
	.getElementById("modal-edit-save-btn")
	?.addEventListener("click", async () => {
		const id = document.getElementById("modal-edit-id")?.value;
		const category = document.getElementById("modal-edit-category")?.value;
		const memoryText = document
			.getElementById("modal-edit-memory-text")
			?.value.trim();

		if (!id || !memoryText) {
			showToast("Please enter memory content.", "error");
			return;
		}

		try {
			await apiFetch(`/api/memories/${id}`, {
				method: "PATCH",
				body: JSON.stringify({ memoryText, category }),
			});
			modalEdit?.classList.remove("active");
			showToast("Memory updated successfully!", "success");
			loadMemories();
		} catch (e) {
			showToast(`Error updating memory: ${e.message}`, "error");
		}
	});

// Prune Memories Button (Admin & Owner)
document
	.getElementById("btn-prune-memories")
	?.addEventListener("click", async () => {
		if (!confirm("Prune expired short-lived memories now?")) return;
		try {
			const selectedChat = document.getElementById("memory-chat-filter")?.value;
			const body = selectedChat ? { chatId: selectedChat } : {};
			const res = await apiFetch("/api/memories/prune", {
				method: "POST",
				body: JSON.stringify(body),
			});
			showToast(`Pruned ${res.prunedCount} expired memories.`, "success");
			loadMemories();
		} catch (e) {
			showToast(`Failed to prune: ${e.message}`, "error");
		}
	});

// Export Memories
document
	.getElementById("btn-export-memories")
	?.addEventListener("click", async () => {
		try {
			const data = await apiFetch("/api/memories/export");
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `ket_memories_${Date.now()}.json`;
			a.click();
			URL.revokeObjectURL(url);
			showToast("Export completed!", "success");
		} catch (e) {
			showToast(`Export failed: ${e.message}`, "error");
		}
	});

// Import Memories
const fileImport = document.getElementById("file-import-memories");
document
	.getElementById("btn-import-memories")
	?.addEventListener("click", () => fileImport?.click());

fileImport?.addEventListener("change", async (e) => {
	const file = e.target.files?.[0];
	if (!file) return;

	try {
		const text = await file.text();
		const parsed = JSON.parse(text);
		const memoriesList = Array.isArray(parsed) ? parsed : parsed.memories;

		if (!Array.isArray(memoriesList)) {
			throw new Error("Invalid JSON: 'memories' array expected.");
		}

		const res = await apiFetch("/api/memories/import", {
			method: "POST",
			body: JSON.stringify({ memories: memoriesList }),
		});

		showToast(`Imported ${res.importedCount} memories!`, "success");
		loadMemories();
	} catch (err) {
		showToast(`Import failed: ${err.message}`, "error");
	} finally {
		fileImport.value = "";
	}
});

// ==========================================================================
// 3. GROUPS & PERMISSIONS
// ==========================================================================
async function loadChats() {
	const container = document.getElementById("chat-list-container");
	if (!container) return;

	try {
		container.innerHTML =
			'<div class="loading-spinner">Loading groups...</div>';
		const chats = (await apiFetch("/api/chats")) ?? [];
		chatsData = chats;

		// Populate memory filter dropdown
		const filterSelect = document.getElementById("memory-chat-filter");
		if (filterSelect) {
			const currentVal = filterSelect.value;
			filterSelect.innerHTML = '<option value="">All Groups</option>';
			chats.forEach((c) => {
				filterSelect.innerHTML += `<option value="${c.chat_id}">${escapeHtml(c.title || c.chat_id)}</option>`;
			});
			filterSelect.value = currentVal;
		}

		renderChatList(chats);
	} catch (e) {
		container.innerHTML = `<div class="loading-spinner">Failed to load groups: ${escapeHtml(e.message)}</div>`;
	}
}

function renderChatList(chats) {
	const container = document.getElementById("chat-list-container");
	if (!container) return;

	if (!chats || chats.length === 0) {
		container.innerHTML = `
      <div class="loading-spinner" style="padding: 24px;">
        <div>No registered groups found.</div>
      </div>
    `;
		return;
	}

	container.innerHTML = chats
		.map((c) => {
			const isOwner = currentRole === "owner";
			const isAdmin = c.isAdmin || isOwner;
			const probPct = Math.round((c.reply_probability ?? 0.05) * 100);

			return `
      <div class="chat-card" data-chat-id="${c.chat_id}">
        <div class="chat-card-top">
          <div class="chat-title-group">
            <span class="chat-title-text">${escapeHtml(c.title || `Group ${c.chat_id}`)}</span>
            <span class="chat-id-text">${escapeHtml(c.chat_id)}</span>
          </div>
          ${
						isOwner
							? `
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 11px; color: var(--text-muted);">Whitelist</span>
              <label class="switch">
                <input type="checkbox" class="chat-allow-toggle" data-chat-id="${c.chat_id}" ${c.is_allowed ? "checked" : ""}>
                <span class="slider"></span>
              </label>
            </div>
          `
							: c.is_allowed
								? `<span class="badge" style="background: rgba(16,185,129,0.15); color: #34d399; border-color: rgba(16,185,129,0.3);">Allowed</span>`
								: `<span class="badge" style="background: rgba(239,68,68,0.15); color: #f87171; border-color: rgba(239,68,68,0.3);">Inactive</span>`
					}
        </div>

        <div class="chat-stats-row">
          <div class="chat-stat-item">Messages: <strong>${c.stats?.totalMessages ?? 0}</strong></div>
          <div class="chat-stat-item">Users: <strong>${c.stats?.uniqueUsers ?? 0}</strong></div>
          <div class="chat-stat-item">Memories: <strong>${c.memoryCount ?? 0}</strong></div>
        </div>

        ${
					isAdmin
						? `
        <div class="chat-controls-row">
          <div class="prob-slider-wrap">
            <label>Reply Rate:</label>
            <input type="range" class="chat-prob-slider" data-chat-id="${c.chat_id}" min="0" max="100" value="${probPct}">
            <span class="prob-val-label" id="prob-label-${c.chat_id}">${probPct}%</span>
          </div>
        </div>
        `
						: ""
				}
      </div>
    `;
		})
		.join("");

	// Attach group allowlist toggle (Owner only)
	container.querySelectorAll(".chat-allow-toggle").forEach((toggle) => {
		toggle.addEventListener("change", async (e) => {
			const chatId = toggle.getAttribute("data-chat-id");
			const isAllowed = e.target.checked;

			try {
				await apiFetch(`/api/chats/${chatId}`, {
					method: "PATCH",
					body: JSON.stringify({ is_allowed: isAllowed }),
				});
				showToast(
					isAllowed ? "Group whitelisted!" : "Group removed from whitelist.",
					"info",
				);
			} catch (err) {
				e.target.checked = !isAllowed;
				showToast(`Failed to update group: ${err.message}`, "error");
			}
		});
	});

	// Attach group reply probability slider (Admin & Owner)
	container.querySelectorAll(".chat-prob-slider").forEach((slider) => {
		const chatId = slider.getAttribute("data-chat-id");
		const labelEl = document.getElementById(`prob-label-${chatId}`);

		slider.addEventListener("input", (e) => {
			if (labelEl) labelEl.textContent = `${e.target.value}%`;
		});

		slider.addEventListener(
			"change",
			debounce(async (e) => {
				const val = parseInt(e.target.value, 10) / 100;
				try {
					await apiFetch(`/api/chats/${chatId}`, {
						method: "PATCH",
						body: JSON.stringify({ reply_probability: val }),
					});
					showToast(`Reply rate updated to ${e.target.value}%.`, "success");
				} catch (err) {
					showToast(`Failed to update reply rate: ${err.message}`, "error");
				}
			}, 400),
		);
	});
}

// ==========================================================================
// 4. SYSTEM SETTINGS & LOGS (Owner Only)
// ==========================================================================
async function loadSettings() {
	if (currentRole !== "owner") return;

	try {
		const s = await apiFetch("/api/settings");
		const settingModel = document.getElementById("setting-model");
		const settingReplyProb = document.getElementById("setting-reply-prob");
		const settingReplyProbVal = document.getElementById(
			"setting-reply-prob-val",
		);
		const settingHistoryLimit = document.getElementById(
			"setting-history-limit",
		);
		const settingAgentSteps = document.getElementById("setting-agent-steps");
		const settingLogLevel = document.getElementById("setting-log-level");
		const settingWebSearch = document.getElementById("setting-web-search");

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
	} catch (e) {
		showToast(`Failed to load global settings: ${e.message}`, "error");
	}
}

document
	.getElementById("setting-reply-prob")
	?.addEventListener("input", (e) => {
		const valEl = document.getElementById("setting-reply-prob-val");
		if (valEl) valEl.textContent = `${e.target.value}%`;
	});

document
	.getElementById("btn-save-settings")
	?.addEventListener("click", async () => {
		const model = document.getElementById("setting-model")?.value;
		const replyProb =
			parseInt(
				document.getElementById("setting-reply-prob")?.value ?? "5",
				10,
			) / 100;
		const historyLimit = parseInt(
			document.getElementById("setting-history-limit")?.value ?? "10",
			10,
		);
		const agentSteps = parseInt(
			document.getElementById("setting-agent-steps")?.value ?? "3",
			10,
		);
		const logLevel = document.getElementById("setting-log-level")?.value;
		const webSearch = document.getElementById("setting-web-search")?.checked;

		try {
			await apiFetch("/api/settings", {
				method: "PATCH",
				body: JSON.stringify({
					gemini_model: model,
					default_reply_probability: replyProb,
					chat_history_limit: historyLimit,
					max_agent_steps: agentSteps,
					log_level: logLevel,
					enable_web_search: webSearch,
				}),
			});
			showToast("Global settings saved successfully!", "success");
		} catch (e) {
			showToast(`Error saving settings: ${e.message}`, "error");
		}
	});

document
	.getElementById("btn-clear-cache")
	?.addEventListener("click", async () => {
		try {
			await apiFetch("/api/settings/cache-clear", { method: "POST" });
			showToast("Memory embedding cache cleared!", "success");
		} catch (e) {
			showToast(`Failed to clear cache: ${e.message}`, "error");
		}
	});

// Logs Console
async function loadLogs() {
	if (currentRole !== "owner") return;

	const logConsole = document.getElementById("log-console");
	if (!logConsole) return;

	const logType = document.getElementById("log-file-select")?.value || "app";
	const search = document.getElementById("log-search")?.value.trim() || "";
	const activePill = document.querySelector("#log-level-pills .pill.active");
	const level = activePill?.getAttribute("data-level") || "ALL";

	const params = new URLSearchParams();
	if (logType === "error") params.append("type", "error");
	if (level !== "ALL") params.append("level", level);
	if (search) params.append("search", search);

	try {
		const res = await apiFetch(`/api/logs?${params.toString()}`);
		const logs = res?.logs || [];

		if (logs.length === 0) {
			logConsole.innerHTML =
				'<div class="loading-spinner" style="padding: 14px;">No matching log lines.</div>';
			return;
		}

		logConsole.innerHTML = logs
			.map(({ level, timestamp, message }) => {
				const lvl = level || "INFO";
				return `<div class="log-line ${lvl}"><span class="ts">${escapeHtml(timestamp)}</span> <span class="lvl">[${lvl}]</span> ${escapeHtml(message)}</div>`;
			})
			.join("");

		logConsole.scrollTop = logConsole.scrollHeight;
	} catch (e) {
		logConsole.innerHTML = `<div class="loading-spinner">Failed to load logs: ${escapeHtml(e.message)}</div>`;
	}
}

document
	.getElementById("btn-refresh-logs")
	?.addEventListener("click", loadLogs);
document
	.getElementById("log-file-select")
	?.addEventListener("change", loadLogs);
document
	.getElementById("log-search")
	?.addEventListener("input", debounce(loadLogs, 300));

document.querySelectorAll("#log-level-pills .pill").forEach((p) => {
	p.addEventListener("click", () => {
		document.querySelectorAll("#log-level-pills .pill").forEach((x) => {
			x.classList.remove("active");
		});
		p.classList.add("active");
		loadLogs();
	});
});

// Tool Traces
async function loadToolTraces() {
	if (currentRole !== "owner") return;
	const consoleEl = document.getElementById("trace-console");
	if (!consoleEl) return;

	try {
		const res = await apiFetch("/api/tool-traces");
		const traces = res?.traces || [];

		if (traces.length === 0) {
			consoleEl.innerHTML =
				'<div class="loading-spinner" style="padding: 12px;">No tool traces recorded yet.</div>';
			return;
		}

		consoleEl.innerHTML = traces
			.map(
				(t) => `
      <div style="margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #1f1f23;">
        <span style="color: var(--primary-color);">[${escapeHtml(t.toolName)}]</span> 
        <span style="color: var(--text-muted); font-size: 10px;">${new Date(t.timestamp).toLocaleTimeString()}</span>
        <div style="color: var(--text-main); margin-top: 2px;">Args: ${escapeHtml(JSON.stringify(t.args))}</div>
        ${t.result ? `<div style="color: var(--success-color); margin-top: 2px;">Result: ${escapeHtml(JSON.stringify(t.result).substring(0, 150))}...</div>` : ""}
      </div>
    `,
			)
			.join("");
	} catch (_e) {
		consoleEl.innerHTML = `<div class="loading-spinner">Failed to load traces.</div>`;
	}
}

document
	.getElementById("btn-refresh-traces")
	?.addEventListener("click", loadToolTraces);

// ==========================================================================
// 5. AI SANDBOX (Owner Only)
// ==========================================================================
document
	.getElementById("btn-run-sandbox")
	?.addEventListener("click", async () => {
		const promptInput = document.getElementById("sandbox-prompt");
		const statusEl = document.getElementById("sandbox-status");
		const outputEl = document.getElementById("sandbox-output");
		const runBtn = document.getElementById("btn-run-sandbox");

		const prompt = promptInput?.value.trim();
		if (!prompt) {
			showToast("Please enter a test prompt.", "error");
			return;
		}

		try {
			if (runBtn) runBtn.disabled = true;
			if (statusEl) statusEl.textContent = "Executing reasoning loop...";
			if (outputEl)
				outputEl.innerHTML =
					'<span style="color: var(--text-muted);">Calling Gemini API...</span>';

			const res = await apiFetch("/api/sandbox", {
				method: "POST",
				body: JSON.stringify({ prompt }),
			});

			if (statusEl)
				statusEl.textContent = `Completed (${res.executionTimeMs}ms • ${res.model})`;
			if (outputEl) outputEl.textContent = res.reply;
		} catch (e) {
			if (statusEl) statusEl.textContent = "Execution failed";
			if (outputEl) outputEl.textContent = `Error: ${e.message}`;
		} finally {
			if (runBtn) runBtn.disabled = false;
		}
	});

// ==========================================================================
// BOOTSTRAP INITIALIZATION
// ==========================================================================
const bootstrap = async () => {
	if (!initData) {
		blockAccess(
			"Telegram Access Only",
			"This dashboard is protected and can only be opened securely inside Telegram Mini App.",
		);
		return;
	}

	try {
		const auth = await apiFetch("/api/me");
		if (!auth?.valid) {
			blockAccess(
				"Unauthorized Session",
				"Invalid Telegram cryptographic signature. Please reopen the app from Telegram.",
			);
			return;
		}

		currentUser = auth.user;
		currentRole = auth.role || "user";
		adminChatIds = auth.adminChatIds || [];
		memberChatIds = auth.memberChatIds || [];

		// Set User Name in Header
		const userNameEl = document.getElementById("user-name");
		if (userNameEl && auth.user) {
			userNameEl.textContent =
				auth.user.first_name ?? auth.user.username ?? "User";
		}

		// Configure role-aware tabs and permissions
		setupRoleTabs(currentRole);

		// Initial Data Fetch
		await loadChats();
		await loadDashboardStats();
		await loadMemories();
		if (currentRole === "owner") {
			loadSettings();
		}
	} catch (_e) {
		blockAccess(
			"Access Denied",
			"Could not authenticate Telegram user session. Please reopen the bot inside Telegram.",
		);
	}
};

bootstrap();
