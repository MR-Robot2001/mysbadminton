import CONFIG from './config.js';
import API from './api.js';
import AUTH from './auth.js';
import UI from './ui.js';
import UTILS from './utils.js';

const App = {
  state: {
    sessionId: null,
    sessionDetails: null,
    confirmedNames: [],
    pollTab: 'today',
    currentAdminTab: 'sessions',
    activeBillingSession: null,
    sessionResult: null
  },

  async init() {
    window.addEventListener('hashchange', () => this.router());
    this.setupNav();
    this.router();
  },

  setupNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const route = e.currentTarget.dataset.route;
        window.location.hash = route;
      });
    });
  },

  async router() {
    const hash = window.location.hash || '#poll';
    const params = new URLSearchParams(window.location.search);
    this.state.sessionId = params.get('sid');

    UTILS.setLoading(true);
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
      if (hash.startsWith(`#${btn.dataset.route}`)) {
        btn.classList.add('text-blue-600');
        btn.classList.remove('text-slate-400');
      } else {
        btn.classList.remove('text-blue-600');
        btn.classList.add('text-slate-400');
      }
    });

    if (hash.startsWith('#poll')) {
      await this.renderPoll();
    } else if (hash.startsWith('#admin')) {
      if (AUTH.isLoggedIn()) {
        await this.renderAdmin();
      } else {
        this.renderLogin();
      }
    } else if (hash.startsWith('#history')) {
      if (AUTH.checkAuth()) await this.renderHistory();
    }

    lucide.createIcons();
    UTILS.setLoading(false);
  },

  async renderPoll() {
    const container = document.getElementById('content-area');
    if (this.state.sessionId) {
      try {
        this.state.sessionDetails = await API.getSessionDetails(this.state.sessionId);
        if (!this.state.sessionDetails) {
          this.state.sessionId = null;
          return this.renderPoll();
        }
        this.state.confirmedNames = await API.getAttendance(this.state.sessionId);
        container.innerHTML = UI.pollView(this.state.sessionDetails);
        this.setupPollHandlers();
        this.updateConfirmedList();
      } catch (e) {
        UTILS.showToast('Error loading session', 'error');
        this.state.sessionId = null;
        this.renderPoll();
      }
    } else {
      container.innerHTML = UI.pollView(null);
      this.setupSelectionHandlers();
      this.loadAvailableSessions();
    }
  },

  setupPollHandlers() {
    document.getElementById('poll-yes').onclick = () => this.handlePoll('YES');
    document.getElementById('poll-no').onclick = () => this.handlePoll('NO');
    document.getElementById('btn-change-session').onclick = () => {
      const url = new URL(window.location);
      url.searchParams.delete('sid');
      window.history.pushState({}, '', url);
      this.state.sessionId = null;
      this.renderPoll();
    };
  },

  setupSelectionHandlers() {
    document.getElementById('poll-tab-today').onclick = () => {
      this.state.pollTab = 'today';
      this.updateSelectionTabs();
      this.loadAvailableSessions();
    };
    document.getElementById('poll-tab-tomorrow').onclick = () => {
      this.state.pollTab = 'tomorrow';
      this.updateSelectionTabs();
      this.loadAvailableSessions();
    };
    this.updateSelectionTabs();
  },

  updateSelectionTabs() {
    const todayBtn = document.getElementById('poll-tab-today');
    const tomorrowBtn = document.getElementById('poll-tab-tomorrow');
    if (this.state.pollTab === 'today') {
      todayBtn.className = 'flex-1 py-3 text-sm font-bold bg-blue-600 text-white shadow-md rounded-xl';
      tomorrowBtn.className = 'flex-1 py-3 text-sm font-bold text-slate-400';
    } else {
      tomorrowBtn.className = 'flex-1 py-3 text-sm font-bold bg-blue-600 text-white shadow-md rounded-xl';
      todayBtn.className = 'flex-1 py-3 text-sm font-bold text-slate-400';
    }
  },

  async loadAvailableSessions() {
    const list = document.getElementById('available-sessions-list');
    list.innerHTML = '<div class="loader mx-auto"></div>';
    try {
      const offset = this.state.pollTab === 'today' ? 0 : 1;
      const sessions = await API.getScheduled(offset);
      list.innerHTML = sessions.length > 0 
        ? sessions.map(s => `
            <button class="w-full p-5 bg-white border border-slate-100 rounded-3xl shadow-sm text-left hover:border-blue-300 transition-all select-session-btn" data-id="${s.id}">
              <div class="flex justify-between items-center">
                <div>
                  <div class="text-xs font-bold text-blue-600 uppercase mb-1">${UTILS.formatDate(s.date)}</div>
                  <div class="text-xl font-extrabold text-slate-900">${s.time}</div>
                </div>
                <i data-lucide="chevron-right" class="text-slate-300"></i>
              </div>
            </button>
          `).join('')
        : `<p class="text-center text-slate-400 py-10 italic">No sessions scheduled for ${this.state.pollTab}</p>`;
      lucide.createIcons();
      document.querySelectorAll('.select-session-btn').forEach(btn => {
        btn.onclick = async () => {
          UTILS.setLoading(true);
          const sid = btn.dataset.id;
          const url = new URL(window.location);
          url.searchParams.set('sid', sid);
          window.history.pushState({}, '', url);
          this.state.sessionId = sid;
          await this.renderPoll();
          lucide.createIcons();
          UTILS.setLoading(false);
        };
      });
    } catch (e) {
      list.innerHTML = '<p class="text-rose-500 text-center">Failed to load sessions</p>';
    }
  },

  renderLogin() {
    const container = document.getElementById('content-area');
    container.innerHTML = UI.loginView();
    document.getElementById('btn-login').onclick = () => {
      const u = document.getElementById('login-username').value.trim();
      const p = document.getElementById('login-password').value.trim();
      if (AUTH.login(u, p)) {
        this.router();
        UTILS.showToast('Login successful');
      } else {
        UTILS.showToast('Invalid credentials', 'error');
      }
    };
  },

  async renderAdmin() {
    const container = document.getElementById('content-area');
    document.getElementById('admin-indicator').classList.remove('hidden');
    const billingConfirmedNames = this.state.activeBillingSession 
      ? await API.getAttendance(this.state.activeBillingSession.id)
      : [];
    container.innerHTML = UI.adminDashboardView(billingConfirmedNames, this.state.activeBillingSession);
    this.setupAdminHandlers();
    this.switchAdminTab(this.state.currentAdminTab);
  },

  setupAdminHandlers() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.onclick = (e) => this.switchAdminTab(e.target.dataset.tab);
    });
    const dateInput = document.getElementById('new-session-date');
    if (dateInput) dateInput.valueAsDate = new Date();
    const createBtn = document.getElementById('btn-create-session');
    if (createBtn) createBtn.onclick = () => this.handleCreateSession();
    const reconcileBtn = document.getElementById('btn-reconcile');
    if (reconcileBtn) reconcileBtn.onclick = () => this.handleReconciliation();
    const generateBtn = document.getElementById('btn-generate-split');
    if (generateBtn) generateBtn.onclick = () => this.handleGenerateBill();
    const changeBillingBtn = document.getElementById('btn-change-billing-session');
    if (changeBillingBtn) changeBillingBtn.onclick = () => {
      this.state.activeBillingSession = null;
      this.renderAdmin();
    };
    const shareBtn = document.getElementById('btn-share-wa');
    if (shareBtn) shareBtn.onclick = () => this.handleSharePoster();
    this.loadAdminSessions();
  },

  switchAdminTab(tab) {
    this.state.currentAdminTab = tab;
    document.querySelectorAll('.admin-tab').forEach(t => {
      t.classList.toggle('tab-active', t.dataset.tab === tab);
      t.classList.toggle('text-slate-400', t.dataset.tab !== tab);
    });
    document.querySelectorAll('.admin-tab-content').forEach(c => {
      c.classList.toggle('hidden', !c.id.includes(tab));
    });

    if (tab === 'sessions') this.loadAdminSessions();
    if (tab === 'billing' && !this.state.activeBillingSession) this.loadBillingSessionSelection();
    if (tab === 'tracker') this.loadTracker();
    if (tab === 'history') this.loadHistory();
    lucide.createIcons();
  },

  async loadBillingSessionSelection() {
    const list = document.getElementById('billing-session-selection-list');
    if (!list) return;
    list.innerHTML = '<div class="loader mx-auto"></div>';
    try {
      const today = await API.getScheduled(0);
      const tomorrow = await API.getScheduled(1);
      const sessions = [...today, ...tomorrow];

      list.innerHTML = sessions.length > 0 
        ? sessions.map(s => `
            <button class="w-full p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex justify-between items-center select-billing-btn" data-id="${s.id}">
              <div class="text-left">
                <div class="text-[10px] font-bold text-blue-600 uppercase">${UTILS.formatDate(s.date)}</div>
                <div class="font-bold text-slate-900">${s.time}</div>
              </div>
              <i data-lucide="chevron-right" class="text-slate-300"></i>
            </button>
          `).join('')
        : '<p class="text-center text-slate-400 text-xs py-10 italic">No active sessions waiting for bills</p>';

      document.querySelectorAll('.select-billing-btn').forEach(btn => {
        btn.onclick = async () => {
          UTILS.setLoading(true);
          const sid = btn.dataset.id;
          this.state.activeBillingSession = sessions.find(s => s.id === sid);
          await this.renderAdmin();
          UTILS.setLoading(false);
        };
      });
    } catch (e) {
      list.innerHTML = '<p class="text-rose-500 text-center text-xs">Failed to load active sessions</p>';
    }
  },

  async handleCreateSession() {
    const date = document.getElementById('new-session-date').value;
    const time = document.getElementById('new-session-time').value.trim();
    if (!date || !time) return UTILS.showToast('Please fill all fields', 'error');
    UTILS.setLoading(true);
    try {
      const sid = await API.createSession(date, time);
      const url = `${window.location.origin}${window.location.pathname}?sid=${sid}#poll`;
      await navigator.clipboard.writeText(url);
      UTILS.showToast('Session created & link copied!');
      this.loadAdminSessions();
    } catch (e) {
      UTILS.showToast('Creation failed', 'error');
    } finally {
      UTILS.setLoading(false);
    }
  },

  async loadAdminSessions() {
    const list = document.getElementById('admin-sessions-list');
    if (!list) return;
    list.innerHTML = '<div class="loader mx-auto"></div>';
    try {
      const today = await API.getScheduled(0);
      const tomorrow = await API.getScheduled(1);
      const sessions = [...today, ...tomorrow];
      list.innerHTML = sessions.length > 0 
        ? sessions.map(s => `
            <div class="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex justify-between items-center">
              <div>
                <div class="text-[10px] font-bold text-blue-600 uppercase">${UTILS.formatDate(s.date)}</div>
                <div class="font-bold text-slate-900">${s.time}</div>
              </div>
              <div class="flex gap-2">
                <button class="copy-link-btn p-2 text-blue-600 bg-blue-50 rounded-lg" data-id="${s.id}">
                  <i data-lucide="link" class="w-4 h-4"></i>
                </button>
                <button class="select-billing-btn p-2 text-emerald-600 bg-emerald-50 rounded-lg" data-id="${s.id}">
                  <i data-lucide="file-text" class="w-4 h-4"></i>
                </button>
              </div>
            </div>
          `).join('')
        : '<p class="text-center text-slate-400 text-xs py-4">No active sessions found</p>';
      lucide.createIcons();
      document.querySelectorAll('.copy-link-btn').forEach(btn => {
        btn.onclick = () => {
          const url = `${window.location.origin}${window.location.pathname}?sid=${btn.dataset.id}#poll`;
          navigator.clipboard.writeText(url);
          UTILS.showToast('Link copied!');
        };
      });
      document.querySelectorAll('.select-billing-btn').forEach(btn => {
        btn.onclick = async () => {
          this.state.activeBillingSession = sessions.find(s => s.id === btn.dataset.id);
          this.state.currentAdminTab = 'billing';
          this.renderAdmin();
        };
      });
    } catch (e) {
      list.innerHTML = '<p class="text-rose-500 text-center text-xs">Load failed</p>';
    }
  },

  async handlePoll(status) {
    const name = document.getElementById('poll-name').value.trim();
    if (!name) return UTILS.showToast('Please enter name', 'error');
    UTILS.setLoading(true);
    try {
      await API.poll(name, status, this.state.sessionId);
      localStorage.setItem(CONFIG.USER_NAME_KEY, name);
      UTILS.showToast(status === 'YES' ? 'Confirmed!' : 'Removed');
      await this.renderPoll();
    } catch (e) {
      UTILS.showToast('Poll failed', 'error');
    } finally {
      UTILS.setLoading(false);
    }
  },

  updateConfirmedList() {
    const list = document.getElementById('confirmed-names-list');
    if (!list) return;
    list.innerHTML = this.state.confirmedNames.length > 0 
      ? this.state.confirmedNames.map(name => `
          <span class="px-3 py-1 bg-blue-50 text-blue-600 text-sm font-medium rounded-full border border-blue-100 animate-fade-in">${name}</span>
        `).join('')
      : '<p class="text-slate-400 text-sm italic">No one yet.</p>';
  },

  handleReconciliation() {
    const actualCount = parseInt(document.getElementById('bill-count').value);
    const pollCount = this.state.confirmedNames.length;
    const reconArea = document.getElementById('reconciliation-area');
    reconArea.classList.remove('hidden');
    if (actualCount > pollCount) {
      reconArea.innerHTML = UI.reconciliationUI('A', [], actualCount - pollCount);
    } else if (actualCount < pollCount) {
      reconArea.innerHTML = UI.reconciliationUI('B', this.state.confirmedNames);
    } else {
      reconArea.innerHTML = UI.reconciliationUI('C');
    }
  },

  async handleGenerateBill() {
    const court = parseFloat(document.getElementById('bill-court').value) || 0;
    const shuttle = parseFloat(document.getElementById('bill-shuttle').value) || 0;
    const finalCount = parseInt(document.getElementById('bill-count').value);
    if (finalCount <= 0) return UTILS.showToast('Invalid count', 'error');
    UTILS.setLoading(true);
    try {
      let finalNames = [...this.state.confirmedNames];
      const extras = Array.from(document.querySelectorAll('.extra-player-input')).map(i => i.value.trim()).filter(v => v);
      if (extras.length > 0) {
        await API.addExtraPlayers(extras, this.state.activeBillingSession.id);
        finalNames.push(...extras);
      }
      const toRemove = Array.from(document.querySelectorAll('.remove-player-checkbox:checked')).map(c => c.value);
      if (toRemove.length > 0) {
        await API.removePlayers(toRemove, this.state.activeBillingSession.id);
        finalNames = finalNames.filter(n => !toRemove.includes(n));
      }
      const total = court + shuttle;
      const perHead = Math.round((total / finalCount) * 100) / 100;
      const sessionData = {
        courtCharge: court,
        shuttleCharge: shuttle,
        expectedCount: this.state.confirmedNames.length,
        finalCount: finalCount,
        total: total,
        perHead: perHead,
        players: finalNames,
        sessionId: this.state.activeBillingSession.id
      };
      await API.syncSession(sessionData);
      this.state.sessionResult = sessionData;
      this.updatePoster(sessionData);
      document.getElementById('poster-preview-container').classList.remove('hidden');
      UTILS.showToast('Bill Created!');
    } catch (e) {
      UTILS.showToast('Failed to sync', 'error');
    } finally {
      UTILS.setLoading(false);
    }
  },

  updatePoster(data) {
    document.getElementById('poster-club-name').textContent = CONFIG.CLUB_NAME;
    document.getElementById('poster-date').textContent = `${UTILS.formatDate(this.state.activeBillingSession.date)} (${this.state.activeBillingSession.time})`;
    document.getElementById('poster-court').textContent = `₹${data.courtCharge}`;
    document.getElementById('poster-shuttle').textContent = `₹${data.shuttleCharge}`;
    document.getElementById('poster-count').textContent = data.finalCount;
    document.getElementById('poster-amount').textContent = `₹${data.perHead}`;
    document.getElementById('poster-names').textContent = data.players.join(', ');
    UTILS.generateQR('poster-qr', data.perHead, `${CONFIG.CLUB_NAME} ${this.state.activeBillingSession.time}`);
  },

  async handleSharePoster() {
    if (!this.state.sessionResult) return;
    const s = this.state.sessionResult;
    const summaryText = `🏸 *${CONFIG.CLUB_NAME}*
📅 ${UTILS.formatDate(this.state.activeBillingSession.date)} (${this.state.activeBillingSession.time})
💰 *Each Pays: ₹${s.perHead}*
📊 *Breakdown:*
• Court: ₹${s.courtCharge}
• Shuttle: ₹${s.shuttleCharge}
• Total: ₹${s.total}
• Players: ${s.finalCount}
👥 *Players:* ${s.players.join(', ')}
Scan QR to pay. 🙏`;
    await UTILS.sharePoster('poster-template', summaryText);
  },

  async loadTracker() {
    const list = document.getElementById('tracker-list');
    list.innerHTML = '<div class="loader mx-auto"></div>';
    try {
      const data = await API.getTracker();
      const paidCount = data.filter(p => p.paid).length;
      document.getElementById('btn-send-reminder').onclick = () => this.handleReminders(data);
      
      const bulkBar = document.getElementById('bulk-action-bar');
      const selectAll = document.getElementById('select-all-tracker');
      const selectedCountText = document.getElementById('selected-count');
      const btnBulkPaid = document.getElementById('btn-bulk-paid');
      const btnBulkUnpaid = document.getElementById('btn-bulk-unpaid');
      
      if (bulkBar) {
        bulkBar.classList.toggle('hidden', data.length === 0);
        selectAll.checked = false;
        selectedCountText.textContent = '0 Selected';
      }

      list.innerHTML = `
        <div class="bg-blue-50 p-4 rounded-2xl mb-4 flex justify-between items-center">
          <span class="text-sm font-bold text-blue-800">Active Bills (Last 48h)</span>
          <span class="text-blue-600 font-extrabold">${paidCount} / ${data.length}</span>
        </div>
        ${data.length === 0 ? '<p class="text-center text-slate-400 py-10">No sessions with bills in last 48h</p>' : ''}
        ${data.map((p, idx) => `
          <div class="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100">
            <input type="checkbox" class="tracker-checkbox w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                   data-name="${p.name}" data-sid="${p.sessionId}">
            <div class="flex-grow flex flex-col">
              <span class="font-bold text-sm">${p.name}</span>
              <div class="flex gap-2 text-[10px]">
                <span class="text-slate-400 font-bold">₹${p.amount}</span>
                <span class="text-blue-500 uppercase">${p.sessionTime}</span>
                <span class="text-slate-400">${UTILS.formatDate(p.date)}</span>
              </div>
            </div>
            <button class="toggle-paid p-2 rounded-xl transition-all ${p.paid ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}" 
                    data-name="${p.name}" data-sid="${p.sessionId}" data-paid="${p.paid}">
              <i data-lucide="${p.paid ? 'check-circle' : 'circle'}"></i>
            </button>
          </div>
        `).join('')}
      `;
      lucide.createIcons();

      const checkboxes = document.querySelectorAll('.tracker-checkbox');
      const updateSelectedCount = () => {
        const checked = document.querySelectorAll('.tracker-checkbox:checked').length;
        selectedCountText.textContent = `${checked} Selected`;
        selectAll.checked = checked === checkboxes.length && checkboxes.length > 0;
      };

      if (selectAll) {
        selectAll.onclick = () => {
          checkboxes.forEach(cb => cb.checked = selectAll.checked);
          updateSelectedCount();
        };
      }

      checkboxes.forEach(cb => {
        cb.onchange = updateSelectedCount;
      });

      const handleBulkUpdate = async (paid) => {
        const selected = Array.from(document.querySelectorAll('.tracker-checkbox:checked')).map(cb => ({
          name: cb.dataset.name,
          sessionId: cb.dataset.sid
        }));
        if (selected.length === 0) return UTILS.showToast('Select players first');
        
        UTILS.setLoading(true);
        try {
          await API.markMultiplePaid(selected, paid);
          UTILS.showToast(`Updated ${selected.length} players`);
          await this.loadTracker();
        } catch (e) {
          UTILS.showToast('Bulk update failed', 'error');
        } finally {
          UTILS.setLoading(false);
        }
      };

      if (btnBulkPaid) btnBulkPaid.onclick = () => handleBulkUpdate(true);
      if (btnBulkUnpaid) btnBulkUnpaid.onclick = () => handleBulkUpdate(false);

      document.querySelectorAll('.toggle-paid').forEach(btn => {
        btn.onclick = async () => {
          btn.innerHTML = '<div class="loader w-4 h-4"></div>';
          try {
            await API.markPaid(btn.dataset.name, btn.dataset.paid !== 'true', btn.dataset.sid);
            await this.loadTracker();
          } catch (e) {
            UTILS.showToast('Update failed', 'error');
            await this.loadTracker();
          }
        };
      });
    } catch (e) {
      list.innerHTML = '<p class="text-rose-500 text-center">Failed to load tracker</p>';
    }
  },

  handleReminders(data) {
    const pending = data.filter(p => !p.paid).map(p => `${p.name} (${p.sessionTime})`);
    if (pending.length === 0) return UTILS.showToast('Everyone has paid!');
    const text = `🔔 *Payment Reminder*\nPending (Last 48h):\n${pending.join('\n')}\n\nPlease pay if not done. 🙏`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  },

  async loadHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;
    list.innerHTML = '<div class="loader mx-auto"></div>';
    try {
      const history = await API.getHistory();
      list.innerHTML = history.map(h => `
        <div class="glass-card p-4 rounded-2xl shadow-sm border border-slate-100">
          <div class="flex justify-between items-start mb-2">
            <div>
              <span class="font-bold text-slate-900">${UTILS.formatDate(h.date)}</span>
              <span class="block text-[10px] text-blue-500 font-bold uppercase">${h.sessionTime}</span>
            </div>
            <span class="text-blue-600 font-bold">₹${h.perHead} / head</span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-[10px] text-slate-500">
            <div>Players: <span class="text-slate-900 font-medium">${h.final}</span></div>
            <div>Court: <span class="text-slate-900 font-medium">${h.court}</span></div>
            <div>Shuttle: <span class="text-slate-900 font-medium">${h.shuttle}</span></div>
          </div>
        </div>
      `).join('');
    } catch (e) {
      list.innerHTML = '<p class="text-rose-500 text-center">History failed</p>';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
