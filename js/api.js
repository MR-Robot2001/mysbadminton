import CONFIG from './config.js';

const API = {
  async request(action, method = 'GET', data = null) {
    const url = new URL(CONFIG.SCRIPT_URL);
    
    let options = {
      method: 'POST', // Always use POST for GAS to avoid redirect issues with complex data
      body: JSON.stringify({ action, ...data })
    };

    if (method === 'GET') {
      url.searchParams.append('action', action);
      if (data) {
        Object.keys(data).forEach(key => url.searchParams.append(key, data[key]));
      }
      options = { method: 'GET' };
    }

    try {
      const response = await fetch(url.toString(), options);
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }
      return result.data;
    } catch (error) {
      console.error(`API Error (${action}):`, error);
      throw error;
    }
  },

  // Public Actions
  poll(name, status, offset = 0) {
    return this.request('poll', 'POST', { name, status, offset });
  },

  getAttendance(offset = 0) {
    return this.request('getToday', 'GET', { offset });
  },

  // Admin Actions
  addExtraPlayers(names) {
    return this.request('addExtraPlayers', 'POST', { names });
  },

  removePlayers(names) {
    return this.request('removePlayers', 'POST', { names });
  },

  syncSession(sessionData) {
    return this.request('syncSession', 'POST', { sessionData });
  },

  markPaid(name, paid) {
    return this.request('markPaid', 'POST', { name, paid });
  },

  getTracker() {
    return this.request('getTracker', 'GET');
  },

  getHistory() {
    return this.request('getHistory', 'GET');
  }
};

export default API;
