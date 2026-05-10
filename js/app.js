import CONFIG from './config.js';
import API from './api.js';
import AUTH from './auth.js';
import UI from './ui.js';
import UTILS from './utils.js';

const App = {
  state: {
    confirmedNames: [],
    reconciledNames: [],
    sessionResult: null,
    currentTab: 'billing',
    pollTab: 'today'
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
    const contentArea = document.getElementById('content-area');
    
    // Reset state for new view
    UTILS.setLoading(true);
    
    // Update Nav Icons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      if (`#${btn.dataset.route}` === hash) {
        btn.classList.add('text-blue-600');
        btn.classList.remove('text-slate-400');
      } else {
        btn.classList.remove('text-blue-600');
        btn.classList.add('text-slate-400');
      }
    });

    if (hash === '#poll') {
      await this.renderPoll();
    } else if (hash === '#admin') {
      if (AUTH.isLoggedIn()) {
        await this.renderAdmin();
      } else {
        this.renderLogin();
      }
    } else if (hash === '#history') {
      if (AUTH.checkAuth()) await this.renderHistory();
    }

    lucide.createIcons();
    UTILS.setLoading(false);
  },

  // --- Views ---

  async renderPoll() {
    const container = document.getElementById('content-area');
    container.innerHTML = UI.pollView(this.state.pollTab);
    
    // Switch Tabs
    document.querySelectorAll('.poll-date-tab').forEach(btn => {
      btn.onclick = (e) => {
        this.state.pollTab = e.target.dataset.tab;
        this.renderPoll();
      };
    });

    // Load confirmed names for selected date
    const offset = this.state.pollTab === 'today' ? 0 : 1;
    try {
      this.state.confirmedNames = await API.getAttendance(offset);
      this.updateConfirmedList();
    } catch (e) {
      UTILS.showToast('Failed to load attendance', 'error');
    }

    // Handlers
    document.getElementById('poll-yes').onclick = () => this.handlePoll('YES');
    document.getElementById('poll-no').onclick = () => this.handlePoll('NO');
    lucide.createIcons();
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
    document.getElementById('nav-history').classList.remove('hidden');

    try {
      this.state.confirmedNames = await API.getAttendance(0); // Today's attendance
      this.state.reconciledNames = [...this.state.confirmedNames];
      container.innerHTML = UI.adminDashboardView(this.state.confirmedNames);
      this.setupAdminHandlers();
    } catch (e) {
      console.error("Admin render failed:", e);
      UTILS.showToast('Admin load failed', 'error');
    }
  },

  async renderHistory() {
    const container = document.getElementById('content-area');
    try {
      const history = await API.getHistory();
      container.innerHTML = `
        <div class="space-y-4 animate-fade-in">
          <h2 class="text-2xl font-bold px-1">History</h2>
          <div class="space-y-3">
            ${history.map(h => `
              <div class="glass-card p-4 rounded-2xl shadow-sm border border-slate-100">
                <div class="flex justify-between items-start mb-2">
                  <span class="font-bold text-slate-900">${UTILS.formatDate(h.date)}</span>
                  <span class="text-blue-600 font-bold">₹${h.perHead} / head</span>
                </div>
                <div class="grid grid-cols-3 gap-2 text-xs text-slate-500">
                  <div>Players: <span class="text-slate-900 font-medium">${h.final}</span></div>
                  <div>Court: <span class="text-slate-900 font-medium">${h.court}</span></div>
                  <div>Shuttle: <span class="text-slate-900 font-medium">${h.shuttle}</span></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (e) {
      UTILS.showToast('History failed to load', 'error');
    }
  },

  // --- Handlers & Logic ---

  async handlePoll(status) {
    const nameInput = document.getElementById('poll-name');
    const name = nameInput.value.trim();

    if (!name) {
      UTILS.showToast('Please enter your name', 'error');
      return;
    }

    UTILS.setLoading(true);
    const offset = this.state.pollTab === 'today' ? 0 : 1;
    try {
      await API.poll(name, status, offset);
      localStorage.setItem(CONFIG.USER_NAME_KEY, name);
      UTILS.showToast(status === 'YES' ? 'Vote confirmed!' : 'Vote removed');
      await this.renderPoll(); // Refresh
    } catch (e) {
      UTILS.showToast('Polling failed', 'error');
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
      : '<p class="text-slate-400 text-sm italic">No one yet. Be the first!</p>';
  },

  setupAdminHandlers() {
    // Tab switching
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.onclick = (e) => {
        const target = e.target.dataset.tab;
        this.switchAdminTab(target);
      };
    });

    // Reconciliation
    document.getElementById('btn-reconcile').onclick = () => this.handleReconciliation();

    // Generate Bill
    document.getElementById('btn-generate-split').onclick = () => this.handleGenerateBill();

    // Share WA
    document.getElementById('btn-share-wa').onclick = () => this.handleSharePoster();

    // Tracker Handlers (delegated)
    this.switchAdminTab('billing'); // Default
  },

  switchAdminTab(tab) {
    this.state.currentTab = tab;
    document.querySelectorAll('.admin-tab').forEach(t => {
      t.classList.toggle('tab-active', t.dataset.tab === tab);
      t.classList.toggle('text-slate-400', t.dataset.tab !== tab);
    });
    document.querySelectorAll('.admin-tab-content').forEach(c => {
      c.classList.toggle('hidden', !c.id.includes(tab));
    });

    if (tab === 'tracker') this.loadTracker();
    if (tab === 'history') this.renderHistory();
    lucide.createIcons();
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
    
    if (finalCount <= 0) {
      UTILS.showToast('Count must be > 0', 'error');
      return;
    }

    UTILS.setLoading(true);
    try {
      // 1. Finalize Names
      let finalNames = [...this.state.confirmedNames];
      
      // Handle Case A (Additions)
      const extraInputs = document.querySelectorAll('.extra-player-input');
      const extras = Array.from(extraInputs).map(i => i.value.trim()).filter(v => v);
      if (extras.length > 0) {
        await API.addExtraPlayers(extras);
        finalNames.push(...extras);
      }

      // Handle Case B (Removals)
      const removeChecks = document.querySelectorAll('.remove-player-checkbox:checked');
      const toRemove = Array.from(removeChecks).map(c => c.value);
      if (toRemove.length > 0) {
        await API.removePlayers(toRemove);
        finalNames = finalNames.filter(n => !toRemove.includes(n));
      }

      // 2. Calculate
      const total = court + shuttle;
      const perHead = Math.round((total / finalCount) * 100) / 100;

      const sessionData = {
        courtCharge: court,
        shuttleCharge: shuttle,
        expectedCount: this.state.confirmedNames.length,
        finalCount: finalCount,
        total: total,
        perHead: perHead,
        players: finalNames
      };

      // 3. Sync to Backend
      await API.syncSession(sessionData);
      this.state.sessionResult = sessionData;

      // 4. Update Poster Template
      this.updatePoster(sessionData);
      
      document.getElementById('poster-preview-container').classList.remove('hidden');
      UTILS.showToast('Bill & QR Generated!');
      
    } catch (e) {
      UTILS.showToast('Bill generation failed', 'error');
    } finally {
      UTILS.setLoading(false);
    }
  },

  updatePoster(data) {
    document.getElementById('poster-club-name').textContent = CONFIG.CLUB_NAME;
    document.getElementById('poster-date').textContent = UTILS.formatDate(new Date());
    document.getElementById('poster-court').textContent = `₹${data.courtCharge}`;
    document.getElementById('poster-shuttle').textContent = `₹${data.shuttleCharge}`;
    document.getElementById('poster-count').textContent = data.finalCount;
    document.getElementById('poster-amount').textContent = `₹${data.perHead}`;
    document.getElementById('poster-names').textContent = data.players.join(', ');
    
    UTILS.generateQR('poster-qr', data.perHead, `Badminton ${UTILS.formatDate(new Date())}`);
  },

  async handleSharePoster() {
    if (!this.state.sessionResult) return;
    const s = this.state.sessionResult;
    
    // Detailed breakdown for WhatsApp caption
    const summaryText = `🏸 *${CONFIG.CLUB_NAME}*
📅 ${UTILS.formatDate(new Date())}

💰 *Each Pays: ₹${s.perHead}*

📊 *Breakdown:*
• Court: ₹${s.courtCharge}
• Shuttle: ₹${s.shuttleCharge}
• Total: ₹${s.total}
• Players: ${s.finalCount}

👥 *Players:*
${s.players.join(', ')}

Please scan the QR code in the image above to pay via any UPI App. 🙏`;
    
    await UTILS.sharePoster('poster-template', summaryText);
  },

  async loadTracker() {
    const list = document.getElementById('tracker-list');
    list.innerHTML = '<div class="loader mx-auto"></div>';
    
    try {
      const data = await API.getTracker();
      const paidCount = data.filter(p => p.paid).length;
      
      document.getElementById('btn-send-reminder').onclick = () => this.handleReminders(data);

      list.innerHTML = `
        <div class="bg-blue-50 p-4 rounded-2xl mb-4 flex justify-between items-center">
          <span class="text-sm font-bold text-blue-800">Payments Received</span>
          <span class="text-blue-600 font-extrabold">${paidCount} / ${data.length}</span>
        </div>
        ${data.length === 0 ? '<p class="text-center text-slate-400 py-10">No active session found</p>' : ''}
        ${data.map(p => `
          <div class="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
            <div class="flex flex-col">
              <span class="font-bold">${p.name}</span>
              <span class="text-xs text-slate-400">₹${p.amount}</span>
            </div>
            <button class="toggle-paid p-2 rounded-xl transition-all ${p.paid ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}" 
                    data-name="${p.name}" data-paid="${p.paid}">
              <i data-lucide="${p.paid ? 'check-circle' : 'circle'}"></i>
            </button>
          </div>
        `).join('')}
      `;

      if (paidCount === data.length && data.length > 0) {
        list.insertAdjacentHTML('afterbegin', `
          <div class="bg-emerald-500 text-white p-4 rounded-2xl mb-4 text-center animate-bounce">
            <h4 class="font-bold">🎉 All Paid!</h4>
          </div>
        `);
      }

      // Re-init icons and add toggles
      lucide.createIcons();
      document.querySelectorAll('.toggle-paid').forEach(btn => {
        btn.onclick = async (e) => {
          const btnEl = e.currentTarget;
          const name = btnEl.dataset.name;
          const currentPaid = btnEl.dataset.paid === 'true';
          
          btnEl.innerHTML = '<div class="loader w-4 h-4"></div>';
          try {
            await API.markPaid(name, !currentPaid);
            this.loadTracker(); // Reload
          } catch (e) {
            UTILS.showToast('Update failed', 'error');
            this.loadTracker();
          }
        };
      });
    } catch (e) {
      list.innerHTML = '<p class="text-rose-500 text-center">Failed to load tracker</p>';
    }
  },

  handleReminders(data) {
    const pending = data.filter(p => !p.paid).map(p => p.name);
    if (pending.length === 0) {
      UTILS.showToast('Everyone has paid!');
      return;
    }
    const amount = data[0].amount;
    const text = `🔔 *Payment Reminder*\nPending for today:\n${pending.join('\n')}\n\nAmount: *₹${amount} each*.\nPlease pay if not done. 🙏`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }
};

// Start App
document.addEventListener('DOMContentLoaded', () => App.init());
