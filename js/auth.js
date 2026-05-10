import CONFIG from './config.js';

const AUTH = {
  login(username, password) {
    const hash = window.CryptoJS.SHA256(password).toString();
    
    if (username.toLowerCase() === CONFIG.ADMIN_USERNAME.toLowerCase() && hash === CONFIG.ADMIN_PASSWORD_HASH) {
      const token = btoa(username + ":" + Date.now());
      localStorage.setItem(CONFIG.SESSION_KEY, token);
      return true;
    }
    return false;
  },

  logout() {
    localStorage.removeItem(CONFIG.SESSION_KEY);
    window.location.hash = '#poll';
  },

  isLoggedIn() {
    return !!localStorage.getItem(CONFIG.SESSION_KEY);
  },

  checkAuth() {
    if (!this.isLoggedIn()) {
      window.location.hash = '#admin';
      return false;
    }
    return true;
  }
};

export default AUTH;
