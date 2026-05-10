import CONFIG from './config.js';
import UTILS from './utils.js';

const UI = {
  pollView() {
    const savedName = localStorage.getItem(CONFIG.USER_NAME_KEY) || "";
    return `
      <div class="space-y-6 animate-fade-in">
        <div class="text-center py-8">
          <h2 class="text-3xl font-extrabold text-slate-900 mb-2">Coming Today?</h2>
          <p class="text-slate-500">${UTILS.formatDate(new Date())}</p>
        </div>
        
        <div class="glass-card p-6 rounded-3xl shadow-sm space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Your Name</label>
            <input type="text" id="poll-name" value="${savedName}" placeholder="Enter full name" 
                   class="w-full p-4 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all">
          </div>
          
          <div class="grid grid-cols-2 gap-4 pt-2">
            <button id="poll-yes" class="p-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-2">
              <i data-lucide="check-circle"></i> YES
            </button>
            <button id="poll-no" class="p-4 bg-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-all flex items-center justify-center gap-2">
              <i data-lucide="x-circle"></i> NO
            </button>
          </div>
        </div>

        <div id="attendance-list-public" class="space-y-3">
          <h3 class="text-sm font-bold text-slate-400 uppercase ml-1">Confirmed Players</h3>
          <div id="confirmed-names-list" class="flex flex-wrap gap-2">
            <!-- Names injected here -->
          </div>
        </div>
      </div>
    `;
  },

  loginView() {
    return `
      <div class="max-w-xs mx-auto space-y-6 pt-12 animate-fade-in">
        <div class="text-center">
          <h2 class="text-2xl font-bold text-slate-900">Admin Login</h2>
          <p class="text-slate-500 text-sm">Protected Section</p>
        </div>
        <div class="glass-card p-6 rounded-3xl shadow-sm space-y-4">
          <input type="text" id="login-username" placeholder="Username" class="w-full p-4 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none">
          <input type="password" id="login-password" placeholder="Password" class="w-full p-4 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none">
          <button id="btn-login" class="w-full p-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all">Login</button>
        </div>
      </div>
    `;
  },

  adminDashboardView(confirmedNames) {
    return `
      <div class="space-y-6 animate-fade-in">
        <!-- Tabs -->
        <div class="flex border-b bg-white -mx-4 px-4 sticky top-14 z-40">
          <button class="flex-1 py-4 text-sm font-bold admin-tab tab-active" data-tab="billing">Billing</button>
          <button class="flex-1 py-4 text-sm font-bold admin-tab text-slate-400" data-tab="tracker">Tracker</button>
          <button class="flex-1 py-4 text-sm font-bold admin-tab text-slate-400" data-tab="history">History</button>
        </div>

        <!-- Billing Section -->
        <div id="tab-billing" class="admin-tab-content space-y-6">
          <div class="glass-card p-6 rounded-3xl shadow-sm space-y-4">
            <h3 class="text-lg font-bold">Session Billing</h3>
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Court Charge</label>
                  <input type="number" id="bill-court" placeholder="0" class="w-full p-4 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Shuttle Charge</label>
                  <input type="number" id="bill-shuttle" placeholder="0" class="w-full p-4 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Actual Players Count</label>
                <div class="flex gap-2">
                  <input type="number" id="bill-count" value="${confirmedNames.length}" class="flex-grow p-4 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none">
                  <button id="btn-reconcile" class="p-4 bg-blue-100 text-blue-600 rounded-2xl font-bold">Reconcile</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Reconciliation UI (Dynamic) -->
          <div id="reconciliation-area" class="hidden glass-card p-6 rounded-3xl shadow-sm border-2 border-blue-100">
            <!-- Content Injected by JS -->
          </div>

          <button id="btn-generate-split" class="w-full p-5 bg-blue-600 text-white font-extrabold rounded-2xl shadow-xl shadow-blue-200 active:scale-95 transition-all">
            GENERATE BILL & QR
          </button>

          <!-- Poster Preview (Hidden until generated) -->
          <div id="poster-preview-container" class="hidden space-y-4">
             <div class="flex justify-between items-center">
                <h3 class="text-sm font-bold text-slate-400 uppercase">Poster Preview</h3>
                <button id="btn-share-wa" class="flex items-center gap-2 text-blue-600 font-bold text-sm">
                  <i data-lucide="share-2" class="w-4 h-4"></i> Share to WhatsApp
                </button>
             </div>
             <div id="poster-rendering-box" class="flex justify-center bg-slate-200 p-4 rounded-3xl overflow-hidden">
                <!-- Poster HTML will be cloned here for visual preview if needed, or we just show a 'Generated' message -->
                <p class="text-slate-500 text-xs italic">Poster ready for sharing</p>
             </div>
          </div>
        </div>

        <!-- Tracker Section -->
        <div id="tab-tracker" class="admin-tab-content hidden space-y-4">
          <div class="flex justify-between items-center px-1">
            <h3 class="text-lg font-bold">Payment Tracker</h3>
            <button id="btn-send-reminder" class="text-blue-600 text-sm font-bold flex items-center gap-1">
              <i data-lucide="bell" class="w-4 h-4"></i> Send Reminders
            </button>
          </div>
          <div id="tracker-list" class="space-y-2">
            <!-- Rows injected here -->
          </div>
        </div>

        <!-- History Section -->
        <div id="tab-history" class="admin-tab-content hidden space-y-4">
          <h3 class="text-lg font-bold px-1">Past Sessions</h3>
          <div id="history-list" class="space-y-3">
            <!-- Cards injected here -->
          </div>
        </div>
      </div>
    `;
  },

  reconciliationUI(caseType, names, countDiff = 0) {
    let content = '';
    if (caseType === 'A') {
      content = `
        <p class="text-sm font-medium text-blue-800 mb-3">Add ${countDiff} extra players:</p>
        <div id="extra-players-inputs" class="space-y-2">
          ${Array(countDiff).fill(0).map((_, i) => `
            <input type="text" class="extra-player-input w-full p-3 bg-white border border-blue-200 rounded-xl outline-none" placeholder="Extra Player ${i+1} Name">
          `).join('')}
        </div>
      `;
    } else if (caseType === 'B') {
      content = `
        <p class="text-sm font-medium text-blue-800 mb-3">Select absent players to remove:</p>
        <div class="space-y-2">
          ${names.map(name => `
            <label class="flex items-center gap-3 p-3 bg-white border border-blue-100 rounded-xl">
              <input type="checkbox" class="remove-player-checkbox w-5 h-5 rounded text-blue-600" value="${name}">
              <span class="text-sm">${name}</span>
            </label>
          `).join('')}
        </div>
      `;
    } else {
      content = `<p class="text-sm text-emerald-600 font-medium">Player count matches attendance list perfectly!</p>`;
    }
    return content;
  }
};

export default UI;
