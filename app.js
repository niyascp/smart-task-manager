/**
 * SmartTask Pro - Frontend Application Logic & Gemini AI Integration
 * Pure vanilla JavaScript with zero frontend build dependencies.
 * All data is securely persisted in localStorage.
 * Gemini AI operations are delegated securely to the local backend server (/api/...).
 */

// ==========================================
// 1. Constants & State Variables
// ==========================================
const STORAGE_KEY = 'smarttask_app_data';
const THEME_KEY = 'smarttask_theme_mode';

// Default onboarding tasks for first-time visitors
const DEFAULT_SAMPLE_TASKS = [
  {
    id: 'sample-1',
    title: 'Welcome to SmartTask Pro! Click the checkbox on the left to mark complete ✅',
    priority: 'low',
    dueDate: getRelativeDateString(2),
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample-2',
    title: 'Click the ✨ button on this task to have Gemini AI break it down into steps',
    priority: 'high',
    dueDate: getRelativeDateString(0), // Due today
    completed: false,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'sample-3',
    title: 'Chat with Gemini AI in the sidebar to optimize your daily productivity 💡',
    priority: 'medium',
    dueDate: getRelativeDateString(-1), // Overdue example
    completed: true,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

// App State
let tasks = [];
let currentFilter = 'all'; // 'all' | 'pending' | 'completed'
let searchQuery = '';
let currentSort = 'newest';
let activeView = 'dashboard';

// AI Chat Memory (stored in-memory for session)
let aiChatHistory = [];
let isAiServerOnline = false;
let hasGeminiApiKey = false;

// Pending Action States (for user confirmation before applying)
let pendingDeleteTaskId = null;
let currentBreakdownSteps = [];
let currentPriorityAdjustments = [];

// ==========================================
// 2. DOM Elements Selection
// ==========================================
// Header & Layout
const welcomeGreeting = document.getElementById('welcomeGreeting');
const todayDate = document.getElementById('todayDate');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.getElementById('sidebar');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const navItems = document.querySelectorAll('.nav-item');
const sidebarTasksCount = document.getElementById('sidebarTasksCount');

// Status Pills & Alerts
const topAiStatusPill = document.getElementById('topAiStatusPill');
const topAiStatusText = document.getElementById('topAiStatusText');
const chatStatusIndicator = document.getElementById('chatStatusIndicator');
const chatStatusText = document.getElementById('chatStatusText');
const settingsAiStatusBadge = document.getElementById('settingsAiStatusBadge');
const settingsAiStatusText = document.getElementById('settingsAiStatusText');
const aiKeyAlert = document.getElementById('aiKeyAlert');

// View Panels
const viewDashboard = document.getElementById('viewDashboard');
const viewAssistant = document.getElementById('viewAssistant');
const viewSettings = document.getElementById('viewSettings');

// Stats Cards & Progress
const statTotal = document.getElementById('statTotal');
const statPending = document.getElementById('statPending');
const statCompleted = document.getElementById('statCompleted');
const statRate = document.getElementById('statRate');
const statRateLabel = document.getElementById('statRateLabel');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const progressBarContainer = document.getElementById('progressBarContainer');

// Task Form
const taskForm = document.getElementById('taskForm');
const taskTitleInput = document.getElementById('taskTitleInput');
const taskPriorityInput = document.getElementById('taskPriorityInput');
const taskDateInput = document.getElementById('taskDateInput');

// Filter & Search Controls
const filterTabBtns = document.querySelectorAll('.tab-btn');
const badgeAll = document.getElementById('badgeAll');
const badgePending = document.getElementById('badgePending');
const badgeCompleted = document.getElementById('badgeCompleted');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const sortSelect = document.getElementById('sortSelect');

// Task List & Empty State
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const emptyTitle = document.getElementById('emptyTitle');
const emptySubtitle = document.getElementById('emptySubtitle');

// Edit Modal
const editModal = document.getElementById('editModal');
const editTaskForm = document.getElementById('editTaskForm');
const editTaskId = document.getElementById('editTaskId');
const editTaskTitle = document.getElementById('editTaskTitle');
const editTaskPriority = document.getElementById('editTaskPriority');
const editTaskDate = document.getElementById('editTaskDate');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// Delete Confirmation Modal
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const deleteConfirmMessage = document.getElementById('deleteConfirmMessage');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');

// AI Chat Elements
const aiChatLog = document.getElementById('aiChatLog');
const aiChatForm = document.getElementById('aiChatForm');
const aiChatInput = document.getElementById('aiChatInput');
const aiChatSendBtn = document.getElementById('aiChatSendBtn');
const chipButtons = document.querySelectorAll('.chip-btn');

// AI Planning Action Buttons
const btnAiAnalyzeQueue = document.getElementById('btnAiAnalyzeQueue');
const btnAiGenerateSchedule = document.getElementById('btnAiGenerateSchedule');
const btnFilterHighFromAssistant = document.getElementById('btnFilterHighFromAssistant');
const btnClearCompleted = document.getElementById('btnClearCompleted');

// AI Breakdown Modal
const aiBreakdownModal = document.getElementById('aiBreakdownModal');
const breakdownSourceTaskTitle = document.getElementById('breakdownSourceTaskTitle');
const breakdownStepsList = document.getElementById('breakdownStepsList');
const cancelBreakdownBtn = document.getElementById('cancelBreakdownBtn');
const applyBreakdownBtn = document.getElementById('applyBreakdownBtn');
const closeBreakdownModalBtn = document.getElementById('closeBreakdownModalBtn');

// AI Priority Modal
const aiPriorityModal = document.getElementById('aiPriorityModal');
const aiPrioritySummaryText = document.getElementById('aiPrioritySummaryText');
const aiTopFocusBox = document.getElementById('aiTopFocusBox');
const aiTopFocusTask = document.getElementById('aiTopFocusTask');
const aiPriorityAdjustmentsList = document.getElementById('aiPriorityAdjustmentsList');
const cancelPriorityBtn = document.getElementById('cancelPriorityBtn');
const applyPriorityBtn = document.getElementById('applyPriorityBtn');
const closePriorityModalBtn = document.getElementById('closePriorityModalBtn');

// AI Schedule Modal
const aiScheduleModal = document.getElementById('aiScheduleModal');
const aiScheduleOverviewText = document.getElementById('aiScheduleOverviewText');
const aiScheduleBlocksList = document.getElementById('aiScheduleBlocksList');
const copyScheduleBtn = document.getElementById('copyScheduleBtn');
const closeScheduleBtn = document.getElementById('closeScheduleBtn');
const closeScheduleModalBtn = document.getElementById('closeScheduleModalBtn');

// Settings Elements
const btnSettingsThemeToggle = document.getElementById('btnSettingsThemeToggle');
const btnExportData = document.getElementById('btnExportData');
const importFileInput = document.getElementById('importFileInput');
const btnResetData = document.getElementById('btnResetData');

// Toast Feedback
const toastElement = document.getElementById('toast');
let toastTimer = null;

// ==========================================
// 3. Application Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initHeaderDate();
  loadTasksFromStorage();
  setupEventListeners();
  renderApp();
  checkAiServerHealth();
});

/**
 * Initializes light/dark theme preference
 */
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-mode');
    updateThemeIcon(false);
  } else {
    document.body.classList.add('dark-mode');
    updateThemeIcon(true);
  }
}

/**
 * Sets welcome message and formatted current date
 */
function initHeaderDate() {
  const now = new Date();
  const hours = now.getHours();
  let greeting = 'Good Day';
  if (hours < 12) {
    greeting = 'Good Morning';
  } else if (hours < 17) {
    greeting = 'Good Afternoon';
  } else {
    greeting = 'Good Evening';
  }

  if (welcomeGreeting) {
    welcomeGreeting.textContent = `${greeting}, Alex`;
  }

  if (todayDate) {
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    todayDate.textContent = now.toLocaleDateString(undefined, options);
  }
}

/**
 * Loads tasks from localStorage or seeds sample data
 */
function loadTasksFromStorage() {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (savedData) {
    try {
      tasks = JSON.parse(savedData);
    } catch (e) {
      console.error('Error parsing stored tasks, resetting to sample.', e);
      tasks = [...DEFAULT_SAMPLE_TASKS];
      saveTasksToStorage();
    }
  } else {
    tasks = [...DEFAULT_SAMPLE_TASKS];
    saveTasksToStorage();
  }
}

/**
 * Persists tasks array into localStorage
 */
function saveTasksToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ==========================================
// 4. Server Health & Gemini Connection Check
// ==========================================
async function checkAiServerHealth() {
  try {
    const res = await fetch('/api/health?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('Health check non-200');

    const data = await res.json();
    isAiServerOnline = true;
    hasGeminiApiKey = Boolean(data.hasApiKey);

    updateAiStatusUI(isAiServerOnline, hasGeminiApiKey, data.model);
  } catch (err) {
    isAiServerOnline = false;
    hasGeminiApiKey = false;
    updateAiStatusUI(false, false, null);
  }
}

function updateAiStatusUI(online, hasKey, modelName) {
  const pills = [topAiStatusPill, chatStatusIndicator, settingsAiStatusBadge];
  const texts = [topAiStatusText, chatStatusText, settingsAiStatusText];

  pills.forEach(pill => {
    if (!pill) return;
    pill.classList.remove('loading', 'connected', 'warning');
    if (!online) {
      pill.classList.add('warning');
    } else if (hasKey) {
      pill.classList.add('connected');
    } else {
      pill.classList.add('warning');
    }
  });

  const label = !online
    ? 'Server Offline (npm start)'
    : hasKey
      ? `Gemini Active (${modelName || '3.5-flash-lite'})`
      : 'Gemini Key Needed in .env';

  texts.forEach(txt => {
    if (txt) txt.textContent = label;
  });

  // Manage setup alert card
  if (aiKeyAlert) {
    if (!online) {
      // If server is completely offline, do not confuse user about API key
      aiKeyAlert.classList.add('hidden');
    } else if (hasKey) {
      // Key is configured and ready: hide alert
      aiKeyAlert.classList.add('hidden');
    } else {
      // Server is running but key is genuinely missing from .env: show alert
      aiKeyAlert.classList.remove('hidden');
    }
  }
}

// ==========================================
// 5. Event Listeners Setup
// ==========================================
function setupEventListeners() {
  // Mobile drawer controls
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.add('open');
      sidebarBackdrop.classList.add('active');
    });
  }

  const closeSidebar = () => {
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('active');
  };

  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

  // Sidebar navigation switching
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      const targetView = item.dataset.view;
      switchView(targetView);
      closeSidebar();
    });
  });

  // Theme toggle buttons (Top bar + Settings)
  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
  if (btnSettingsThemeToggle) btnSettingsThemeToggle.addEventListener('click', toggleTheme);

  // Task creation form
  if (taskForm) taskForm.addEventListener('submit', handleAddTask);

  // Filter tabs
  filterTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterTabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      currentFilter = btn.dataset.filter;
      renderApp();
    });
  });

  // Search input live filtering
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      if (searchQuery.length > 0) {
        clearSearchBtn.classList.remove('hidden');
      } else {
        clearSearchBtn.classList.add('hidden');
      }
      renderApp();
    });
  }

  // Clear search button
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      searchInput.focus();
      renderApp();
    });
  }

  // Sort dropdown
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderApp();
    });
  }

  // Edit modal
  if (editTaskForm) editTaskForm.addEventListener('submit', handleSaveEdit);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeEditModal);
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);

  // Delete modal confirmation
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  if (closeDeleteModalBtn) closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
  if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', executeTaskDelete);

  // AI Breakdown Modal
  if (cancelBreakdownBtn) cancelBreakdownBtn.addEventListener('click', closeBreakdownModal);
  if (closeBreakdownModalBtn) closeBreakdownModalBtn.addEventListener('click', closeBreakdownModal);
  if (applyBreakdownBtn) applyBreakdownBtn.addEventListener('click', applySelectedBreakdownSteps);

  // AI Priority Modal
  if (cancelPriorityBtn) cancelPriorityBtn.addEventListener('click', closePriorityModal);
  if (closePriorityModalBtn) closePriorityModalBtn.addEventListener('click', closePriorityModal);
  if (applyPriorityBtn) applyPriorityBtn.addEventListener('click', applySelectedPriorityAdjustments);

  // AI Schedule Modal
  if (closeScheduleBtn) closeScheduleBtn.addEventListener('click', closeScheduleModal);
  if (closeScheduleModalBtn) closeScheduleModalBtn.addEventListener('click', closeScheduleModal);
  if (copyScheduleBtn) copyScheduleBtn.addEventListener('click', copyScheduleToClipboard);

  // Close modals on backdrop click
  [editModal, deleteConfirmModal, aiBreakdownModal, aiPriorityModal, aiScheduleModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [editModal, deleteConfirmModal, aiBreakdownModal, aiPriorityModal, aiScheduleModal].forEach(m => {
        if (m) m.classList.add('hidden');
      });
      closeSidebar();
    }
  });

  // AI Chat form submit
  if (aiChatForm) {
    aiChatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = aiChatInput.value.trim();
      if (!text) return;
      sendAiChatMessage(text);
      aiChatInput.value = '';
    });
  }

  // Quick Prompt Chips
  chipButtons.forEach(chip => {
    chip.addEventListener('click', () => {
      const promptText = chip.dataset.prompt;
      if (promptText) {
        sendAiChatMessage(promptText);
      }
    });
  });

  // AI Tools Triggers
  if (btnAiAnalyzeQueue) btnAiAnalyzeQueue.addEventListener('click', handleAiAnalyzeQueue);
  if (btnAiGenerateSchedule) btnAiGenerateSchedule.addEventListener('click', handleAiGenerateSchedule);
  if (btnFilterHighFromAssistant) {
    btnFilterHighFromAssistant.addEventListener('click', () => {
      switchView('dashboard');
      currentFilter = 'pending';
      if (sortSelect) sortSelect.value = 'priority';
      currentSort = 'priority';
      syncFilterTabUI('pending');
      renderApp();
      showToast('Viewing pending high-priority tasks', 'info');
    });
  }

  if (btnClearCompleted) {
    btnClearCompleted.addEventListener('click', handleCleanCompletedTasks);
  }

  // Settings: Export JSON
  if (btnExportData) btnExportData.addEventListener('click', handleExportTasks);

  // Settings: Import JSON
  if (importFileInput) importFileInput.addEventListener('change', handleImportTasks);

  // Settings: Reset sample data
  if (btnResetData) {
    btnResetData.addEventListener('click', () => {
      if (confirm('Reset your task list to default starter tasks? Current tasks will be replaced.')) {
        tasks = [...DEFAULT_SAMPLE_TASKS];
        saveTasksToStorage();
        renderApp();
        showToast('Task list reset to starter data.', 'info');
      }
    });
  }
}

/**
 * Handles switching active view panel
 */
function switchView(viewName) {
  activeView = viewName;

  navItems.forEach(nav => {
    nav.classList.toggle('active', nav.dataset.view === viewName);
  });

  if (viewDashboard) viewDashboard.classList.toggle('hidden', viewName !== 'dashboard' && viewName !== 'tasks');
  if (viewAssistant) viewAssistant.classList.toggle('hidden', viewName !== 'assistant');
  if (viewSettings) viewSettings.classList.toggle('hidden', viewName !== 'settings');

  if (viewName === 'tasks') {
    const taskWorkspace = document.querySelector('.tasks-workspace');
    if (taskWorkspace) taskWorkspace.scrollIntoView({ behavior: 'smooth' });
  }

  if (viewName === 'assistant') {
    checkAiServerHealth();
  }
}

function syncFilterTabUI(filterName) {
  filterTabBtns.forEach(btn => {
    const isTarget = btn.dataset.filter === filterName;
    btn.classList.toggle('active', isTarget);
    btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  });
}

// ==========================================
// 6. Gemini AI Features
// ==========================================

/**
 * Sends a message to the Gemini productivity chat
 */
async function sendAiChatMessage(userMessage) {
  // Append user message to log
  appendChatMessage('user', userMessage);

  // Show typing indicator
  const typingEl = appendChatTypingIndicator();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        history: aiChatHistory
      })
    });

    typingEl.remove();

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with ${response.status}`);
    }

    const data = await response.json();
    const replyText = data.reply || 'No response generated.';

    appendChatMessage('ai', replyText);

    // Save in chat history
    aiChatHistory.push({ role: 'user', text: userMessage });
    aiChatHistory.push({ role: 'model', text: replyText });
  } catch (error) {
    if (typingEl) typingEl.remove();
    console.error('AI chat error:', error);
    appendChatMessage('ai', `⚠️ **Could not reach Gemini AI:** ${error.message}\n\nPlease verify that the local server is running (\`node server.js\`) and your \`GEMINI_API_KEY\` is set in \`.env\`.`);
  }
}

function appendChatMessage(role, text) {
  const msgEl = document.createElement('div');
  msgEl.className = `chat-message ${role}`;

  const avatarText = role === 'user' ? 'YOU' : 'AI';
  const formattedText = formatMarkdown(text);

  msgEl.innerHTML = `
    <div class="chat-avatar">${avatarText}</div>
    <div class="chat-content">
      ${formattedText}
    </div>
  `;

  aiChatLog.appendChild(msgEl);
  aiChatLog.scrollTop = aiChatLog.scrollHeight;
}

function appendChatTypingIndicator() {
  const typingEl = document.createElement('div');
  typingEl.className = 'chat-message ai';
  typingEl.innerHTML = `
    <div class="chat-avatar">AI</div>
    <div class="chat-content chat-typing">
      <span></span><span></span><span></span>
    </div>
  `;
  aiChatLog.appendChild(typingEl);
  aiChatLog.scrollTop = aiChatLog.scrollHeight;
  return typingEl;
}

/**
 * AI Tool: Breaks down selected task into 3-5 subtasks
 */
async function handleAiBreakdown(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  showToast(`Gemini is breaking down "${truncateText(task.title, 25)}"... ✨`, 'info');

  try {
    const response = await fetch('/api/ai/breakdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskTitle: task.title,
        priority: task.priority,
        dueDate: task.dueDate
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Server error breaking down task');
    }

    const data = await response.json();
    currentBreakdownSteps = data.steps || [];

    if (currentBreakdownSteps.length === 0) {
      showToast('Gemini could not generate subtasks for this item.', 'warning');
      return;
    }

    // Render in confirmation modal
    breakdownSourceTaskTitle.textContent = `"${task.title}"`;
    breakdownStepsList.innerHTML = '';

    currentBreakdownSteps.forEach((step, index) => {
      const stepRow = document.createElement('div');
      stepRow.className = 'ai-step-item';
      stepRow.innerHTML = `
        <label class="task-checkbox-container">
          <input type="checkbox" class="task-checkbox step-check" data-index="${index}" checked />
        </label>
        <span class="ai-step-title">${escapeHtml(step.title)}</span>
        <span class="badge badge-priority-${step.priority}">
          ${step.priority === 'high' ? '🔥 High' : step.priority === 'low' ? '🌱 Low' : '⚡ Med'}
        </span>
      `;
      breakdownStepsList.appendChild(stepRow);
    });

    aiBreakdownModal.classList.remove('hidden');
  } catch (error) {
    console.error('Breakdown error:', error);
    showToast(`AI Breakdown error: ${error.message}`, 'danger');
  }
}

function closeBreakdownModal() {
  aiBreakdownModal.classList.add('hidden');
  currentBreakdownSteps = [];
}

/**
 * Applies selected breakdown steps after user confirmation
 */
function applySelectedBreakdownSteps() {
  const checkedBoxes = breakdownStepsList.querySelectorAll('.step-check:checked');
  if (checkedBoxes.length === 0) {
    showToast('Please select at least one step to add.', 'info');
    return;
  }

  let addedCount = 0;
  checkedBoxes.forEach(box => {
    const idx = parseInt(box.dataset.index, 10);
    const step = currentBreakdownSteps[idx];
    if (step) {
      const newSubtask = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        title: step.title,
        priority: step.priority || 'medium',
        dueDate: '',
        completed: false,
        createdAt: new Date().toISOString()
      };
      tasks.unshift(newSubtask);
      addedCount++;
    }
  });

  saveTasksToStorage();
  renderApp();
  closeBreakdownModal();
  showToast(`Added ${addedCount} subtasks to your queue! 🎉`, 'success');
}

/**
 * AI Tool: Analyzes queue and recommends priority adjustments
 */
async function handleAiAnalyzeQueue() {
  const pendingTasks = tasks.filter(t => !t.completed);
  if (pendingTasks.length === 0) {
    showToast('You have no pending tasks to analyze! Great job.', 'info');
    return;
  }

  showToast('Gemini is analyzing your task priorities... 🎯', 'info');

  try {
    const response = await fetch('/api/ai/analyze-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: pendingTasks })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Server error analyzing queue');
    }

    const data = await response.json();
    currentPriorityAdjustments = data.adjustments || [];

    // Populate modal
    aiPrioritySummaryText.textContent = data.summary || 'Workload analyzed.';

    if (data.topFocusTask) {
      aiTopFocusBox.classList.remove('hidden');
      aiTopFocusTask.textContent = data.topFocusTask;
    } else {
      aiTopFocusBox.classList.add('hidden');
    }

    aiPriorityAdjustmentsList.innerHTML = '';

    if (currentPriorityAdjustments.length === 0) {
      aiPriorityAdjustmentsList.innerHTML = `
        <div class="ai-adjustment-item">
          <span class="text-hint">✅ Your current task priorities look optimal. No adjustments needed!</span>
        </div>
      `;
      applyPriorityBtn.classList.add('hidden');
    } else {
      applyPriorityBtn.classList.remove('hidden');
      currentPriorityAdjustments.forEach((adj, idx) => {
        const item = document.createElement('div');
        item.className = 'ai-adjustment-item';
        item.innerHTML = `
          <label class="task-checkbox-container">
            <input type="checkbox" class="task-checkbox priority-adj-check" data-index="${idx}" checked />
          </label>
          <div class="ai-adjustment-details">
            <span class="ai-adjustment-title">${escapeHtml(adj.title)}</span>
            <span class="ai-adjustment-reason">${escapeHtml(adj.reason || '')}</span>
          </div>
          <span class="badge badge-priority-${adj.suggestedPriority}">
            ➜ ${adj.suggestedPriority.toUpperCase()}
          </span>
        `;
        aiPriorityAdjustmentsList.appendChild(item);
      });
    }

    aiPriorityModal.classList.remove('hidden');
  } catch (error) {
    console.error('Priority analysis error:', error);
    showToast(`AI analysis error: ${error.message}`, 'danger');
  }
}

function closePriorityModal() {
  aiPriorityModal.classList.add('hidden');
  currentPriorityAdjustments = [];
}

/**
 * Applies selected priority adjustments after user confirmation
 */
function applySelectedPriorityAdjustments() {
  const checkedBoxes = aiPriorityAdjustmentsList.querySelectorAll('.priority-adj-check:checked');
  if (checkedBoxes.length === 0) {
    showToast('No adjustments selected.', 'info');
    closePriorityModal();
    return;
  }

  let updatedCount = 0;
  checkedBoxes.forEach(box => {
    const idx = parseInt(box.dataset.index, 10);
    const adj = currentPriorityAdjustments[idx];
    if (adj) {
      const task = tasks.find(t => t.id === adj.id || t.title.toLowerCase() === adj.title.toLowerCase());
      if (task) {
        task.priority = adj.suggestedPriority;
        updatedCount++;
      }
    }
  });

  saveTasksToStorage();
  renderApp();
  closePriorityModal();
  showToast(`Updated priorities for ${updatedCount} task${updatedCount !== 1 ? 's' : ''}! 🎯`, 'success');
}

/**
 * AI Tool: Generates daily time-blocked schedule
 */
async function handleAiGenerateSchedule() {
  const pendingTasks = tasks.filter(t => !t.completed);
  if (pendingTasks.length === 0) {
    showToast('No pending tasks to schedule. Queue is clear!', 'info');
    return;
  }

  showToast('Gemini is generating your time-blocked schedule... 📅', 'info');

  try {
    const response = await fetch('/api/ai/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: pendingTasks })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Server error creating schedule');
    }

    const data = await response.json();
    const blocks = data.blocks || [];

    aiScheduleOverviewText.textContent = data.overview || 'Here is your proposed daily schedule:';
    aiScheduleBlocksList.innerHTML = '';

    if (blocks.length === 0) {
      aiScheduleBlocksList.innerHTML = `<p class="text-hint">No schedule blocks generated.</p>`;
    } else {
      blocks.forEach(b => {
        const blockEl = document.createElement('div');
        blockEl.className = 'ai-schedule-block';
        blockEl.innerHTML = `
          <span class="ai-schedule-time">⏱️ ${escapeHtml(b.time || '')}</span>
          <span class="ai-schedule-activity">${escapeHtml(b.activity || '')}</span>
          ${b.focusTip ? `<span class="ai-schedule-tip">💡 ${escapeHtml(b.focusTip)}</span>` : ''}
        `;
        aiScheduleBlocksList.appendChild(blockEl);
      });
    }

    aiScheduleModal.classList.remove('hidden');
  } catch (error) {
    console.error('Schedule error:', error);
    showToast(`AI Schedule error: ${error.message}`, 'danger');
  }
}

function closeScheduleModal() {
  aiScheduleModal.classList.add('hidden');
}

function copyScheduleToClipboard() {
  const blocks = aiScheduleBlocksList.querySelectorAll('.ai-schedule-block');
  if (blocks.length === 0) return;

  const lines = ['📅 Today\'s SmartTask Schedule:'];
  blocks.forEach(b => {
    const time = b.querySelector('.ai-schedule-time')?.textContent.trim();
    const activity = b.querySelector('.ai-schedule-activity')?.textContent.trim();
    lines.push(`• ${time}: ${activity}`);
  });

  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    showToast('Schedule copied to clipboard! 📋', 'success');
  }).catch(() => {
    showToast('Could not copy to clipboard automatically.', 'info');
  });
}

// ==========================================
// 7. Core Task CRUD Operations
// ==========================================

/**
 * Handles adding a new task
 */
function handleAddTask(e) {
  e.preventDefault();

  const title = taskTitleInput.value.trim();
  const priority = taskPriorityInput.value;
  const dueDate = taskDateInput.value;

  if (!title) {
    showToast('Please enter a task description.', 'danger');
    taskTitleInput.focus();
    return;
  }

  const newTask = {
    id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    title: title,
    priority: priority,
    dueDate: dueDate,
    completed: false,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(newTask);
  saveTasksToStorage();

  taskTitleInput.value = '';
  taskDateInput.value = '';
  taskPriorityInput.value = 'medium';

  renderApp();
  showToast('Task added to your queue! 🎉', 'success');
}

/**
 * Toggles a task between completed and pending
 */
function toggleTaskCompletion(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  task.completed = !task.completed;
  saveTasksToStorage();
  renderApp();

  if (task.completed) {
    showToast('Great progress! Task marked completed ✨', 'success');
  } else {
    showToast('Task moved back to pending queue.', 'info');
  }
}

/**
 * Opens delete confirmation modal
 */
function promptDeleteTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  pendingDeleteTaskId = taskId;
  if (deleteConfirmMessage) {
    deleteConfirmMessage.textContent = `Are you sure you want to delete "${truncateText(task.title, 40)}"? This action cannot be undone.`;
  }
  deleteConfirmModal.classList.remove('hidden');
}

function closeDeleteModal() {
  pendingDeleteTaskId = null;
  deleteConfirmModal.classList.add('hidden');
}

function executeTaskDelete() {
  if (!pendingDeleteTaskId) return;

  const taskIndex = tasks.findIndex(t => t.id === pendingDeleteTaskId);
  if (taskIndex !== -1) {
    const deletedTitle = tasks[taskIndex].title;
    tasks.splice(taskIndex, 1);
    saveTasksToStorage();
    renderApp();
    showToast(`Deleted "${truncateText(deletedTitle, 25)}"`, 'danger');
  }

  closeDeleteModal();
}

/**
 * Opens the Edit Modal
 */
function openEditModal(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  editTaskId.value = task.id;
  editTaskTitle.value = task.title;
  editTaskPriority.value = task.priority;
  editTaskDate.value = task.dueDate || '';

  editModal.classList.remove('hidden');
  editTaskTitle.focus();
}

function closeEditModal() {
  editModal.classList.add('hidden');
  editTaskForm.reset();
}

function handleSaveEdit(e) {
  e.preventDefault();

  const id = editTaskId.value;
  const updatedTitle = editTaskTitle.value.trim();
  const updatedPriority = editTaskPriority.value;
  const updatedDueDate = editTaskDate.value;

  if (!updatedTitle) {
    showToast('Task description cannot be empty.', 'danger');
    editTaskTitle.focus();
    return;
  }

  const task = tasks.find(t => t.id === id);
  if (task) {
    task.title = updatedTitle;
    task.priority = updatedPriority;
    task.dueDate = updatedDueDate;
    saveTasksToStorage();
    renderApp();
    closeEditModal();
    showToast('Task updated successfully! ✏️', 'success');
  }
}

function handleCleanCompletedTasks() {
  const completedCount = tasks.filter(t => t.completed).length;
  if (completedCount === 0) {
    showToast('No completed tasks to clean.', 'info');
    return;
  }

  if (confirm(`Clean up and remove ${completedCount} completed task${completedCount > 1 ? 's' : ''}?`)) {
    tasks = tasks.filter(t => !t.completed);
    saveTasksToStorage();
    renderApp();
    showToast(`Cleaned ${completedCount} completed task(s). Queue is clutter-free! 🧹`, 'success');
  }
}

// ==========================================
// 8. UI Rendering & Statistics
// ==========================================

function renderApp() {
  renderStats();
  renderTaskList();
}

function renderStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;

  if (statTotal) statTotal.textContent = total;
  if (statPending) statPending.textContent = pending;
  if (statCompleted) statCompleted.textContent = completed;
  if (sidebarTasksCount) sidebarTasksCount.textContent = total;

  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  if (statRate) statRate.textContent = `${percent}%`;
  if (progressBar) progressBar.style.width = `${percent}%`;
  if (progressText) progressText.textContent = `${percent}% Completed`;
  if (progressBarContainer) progressBarContainer.setAttribute('aria-valuenow', percent);

  if (statRateLabel) {
    if (percent === 100 && total > 0) {
      statRateLabel.textContent = 'All Done! 🌟';
      statRateLabel.className = 'metric-trend success';
    } else if (percent >= 50) {
      statRateLabel.textContent = 'Great pace';
      statRateLabel.className = 'metric-trend success';
    } else {
      statRateLabel.textContent = 'In progress';
      statRateLabel.className = 'metric-trend highlight';
    }
  }

  if (badgeAll) badgeAll.textContent = total;
  if (badgePending) badgePending.textContent = pending;
  if (badgeCompleted) badgeCompleted.textContent = completed;
}

function renderTaskList() {
  let filtered = tasks.filter(task => {
    if (currentFilter === 'pending') return !task.completed;
    if (currentFilter === 'completed') return task.completed;
    return true;
  });

  if (searchQuery) {
    filtered = filtered.filter(task =>
      task.title.toLowerCase().includes(searchQuery)
    );
  }

  filtered.sort((a, b) => {
    if (currentSort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (currentSort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (currentSort === 'dueDate') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (currentSort === 'priority') {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return 0;
  });

  taskList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    updateEmptyStateMessage();
  } else {
    emptyState.classList.add('hidden');
    filtered.forEach(task => {
      const li = createTaskElement(task);
      taskList.appendChild(li);
    });
  }
}

/**
 * Creates list item element for a task row with AI Breakdown button
 */
function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = `task-item ${task.completed ? 'completed' : ''}`;
  li.dataset.id = task.id;

  const dateInfo = formatDueDate(task.dueDate, task.completed);
  const priorityLabels = {
    high: '🔥 High',
    medium: '⚡ Medium',
    low: '🌱 Low'
  };

  li.innerHTML = `
    <label class="task-checkbox-container" title="${task.completed ? 'Mark as pending' : 'Mark as completed'}">
      <input 
        type="checkbox" 
        class="task-checkbox" 
        ${task.completed ? 'checked' : ''} 
        aria-label="Toggle ${escapeHtml(task.title)}"
      />
    </label>

    <div class="task-details">
      <div class="task-text">${escapeHtml(task.title)}</div>
      <div class="task-meta">
        <span class="badge badge-priority-${task.priority}">
          ${priorityLabels[task.priority] || task.priority}
        </span>
        ${dateInfo.html}
      </div>
    </div>

    <div class="task-actions">
      <!-- AI Breakdown Button -->
      <button 
        type="button" 
        class="btn-action ai-btn" 
        title="Break down with Gemini AI" 
        aria-label="Break down task with Gemini AI: ${escapeHtml(task.title)}"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      </button>

      <button 
        type="button" 
        class="btn-action edit-btn" 
        title="Edit task" 
        aria-label="Edit task: ${escapeHtml(task.title)}"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>

      <button 
        type="button" 
        class="btn-action delete-btn" 
        title="Delete task" 
        aria-label="Delete task: ${escapeHtml(task.title)}"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `;

  // Attach event handlers
  const checkbox = li.querySelector('.task-checkbox');
  checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));

  const aiBtn = li.querySelector('.ai-btn');
  aiBtn.addEventListener('click', () => handleAiBreakdown(task.id));

  const editBtn = li.querySelector('.edit-btn');
  editBtn.addEventListener('click', () => openEditModal(task.id));

  const deleteBtn = li.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', () => promptDeleteTask(task.id));

  return li;
}

function updateEmptyStateMessage() {
  if (searchQuery) {
    emptyTitle.textContent = 'No matching tasks';
    emptySubtitle.textContent = `No tasks matched "${searchQuery}". Try a different keyword or clear search.`;
  } else if (currentFilter === 'pending') {
    emptyTitle.textContent = 'All caught up! 🎉';
    emptySubtitle.textContent = 'You have zero pending tasks. Take a break or add a new goal above!';
  } else if (currentFilter === 'completed') {
    emptyTitle.textContent = 'No completed tasks yet';
    emptySubtitle.textContent = 'Mark tasks as completed using the checkboxes and they will appear here.';
  } else {
    emptyTitle.textContent = 'Your task queue is empty';
    emptySubtitle.textContent = 'Use the quick add form above to plan your next productivity milestone.';
  }
}

// ==========================================
// 9. Date Helper Functions
// ==========================================
function formatDueDate(dateString, isCompleted) {
  if (!dateString) return { html: '' };

  const [year, month, day] = dateString.split('-').map(Number);
  const taskDate = new Date(year, month - 1, day);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = taskDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const formattedStr = taskDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: taskDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  });

  let statusClass = '';
  let statusLabel = formattedStr;

  if (!isCompleted) {
    if (diffDays < 0) {
      statusClass = 'overdue';
      statusLabel = `⚠️ Overdue (${formattedStr})`;
    } else if (diffDays === 0) {
      statusClass = 'today';
      statusLabel = `📅 Due Today`;
    } else if (diffDays === 1) {
      statusLabel = `📅 Due Tomorrow`;
    }
  }

  const html = `
    <span class="task-date-tag ${statusClass}" title="Due date: ${formattedStr}">
      ${statusLabel}
    </span>
  `;

  return { html };
}

function getRelativeDateString(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ==========================================
// 10. Theme Toggle & Toast Notifications
// ==========================================
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  updateThemeIcon(isDark);
  showToast(isDark ? 'Dark theme enabled 🌙' : 'Light theme enabled ☀️', 'info');
}

function updateThemeIcon(isDark) {
  if (!themeIcon) return;
  if (isDark) {
    themeIcon.innerHTML = `
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    `;
  } else {
    themeIcon.innerHTML = `
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    `;
  }
}

function showToast(message, type = 'info') {
  if (toastTimer) clearTimeout(toastTimer);

  toastElement.className = `toast toast-${type}`;
  toastElement.textContent = message;
  toastElement.classList.remove('hidden');

  toastTimer = setTimeout(() => {
    toastElement.classList.add('hidden');
  }, 2600);
}

// ==========================================
// 11. Backup & Restore (JSON Export / Import)
// ==========================================
function handleExportTasks() {
  if (tasks.length === 0) {
    showToast('No tasks to export.', 'info');
    return;
  }

  const exportData = {
    appName: 'SmartTask Pro',
    exportedAt: new Date().toISOString(),
    taskCount: tasks.length,
    tasks: tasks
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `smarttask-backup-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  showToast('Task backup downloaded successfully! 📁', 'success');
}

function handleImportTasks(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      const importedTasks = Array.isArray(parsed) ? parsed : parsed.tasks;

      if (!Array.isArray(importedTasks)) {
        throw new Error('Invalid JSON format: missing tasks array.');
      }

      let addedCount = 0;
      importedTasks.forEach(item => {
        if (item.title) {
          tasks.unshift({
            id: item.id || 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            title: item.title,
            priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
            dueDate: item.dueDate || '',
            completed: Boolean(item.completed),
            createdAt: item.createdAt || new Date().toISOString()
          });
          addedCount++;
        }
      });

      saveTasksToStorage();
      renderApp();
      showToast(`Successfully imported ${addedCount} tasks! 🎉`, 'success');
    } catch (err) {
      console.error('Import error:', err);
      showToast('Could not import file: Invalid JSON format.', 'danger');
    } finally {
      e.target.value = '';
    }
  };
  reader.readAsText(file);
}

// ==========================================
// 12. Utilities
// ==========================================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncateText(str, maxLength) {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

/**
 * Basic markdown formatter for Gemini chat output
 */
function formatMarkdown(text) {
  if (!text) return '';
  let formatted = escapeHtml(text);

  // Bold text: **text**
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Bullet points: * or -
  formatted = formatted.replace(/(?:^|\n)[*-]\s+(.+)/g, '<br>&bull; $1');

  // Newlines
  formatted = formatted.replace(/\n\n/g, '<br><br>');
  formatted = formatted.replace(/\n/g, '<br>');

  return `<p>${formatted}</p>`;
}
