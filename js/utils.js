import CONFIG from './config.js';

const UTILS = {
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `mb-2 p-3 rounded-lg shadow-lg text-white text-sm font-medium transform transition-all duration-300 translate-y-10 opacity-0 ${
      type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
    }`;
    toast.textContent = message;
    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);

    // Remove
    setTimeout(() => {
      toast.classList.add('opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  setLoading(isLoading) {
    const loader = document.getElementById('loading-state');
    const content = document.getElementById('content-area');
    if (isLoading) {
      loader.classList.remove('hidden');
      content.classList.add('hidden');
    } else {
      loader.classList.add('hidden');
      content.classList.remove('hidden');
    }
  },

  generateQR(elementId, amount, name = "Badminton") {
    const upiUrl = `upi://pay?pa=${CONFIG.UPI_ID}&pn=${encodeURIComponent(CONFIG.CLUB_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(name)}`;
    const container = document.getElementById(elementId);
    container.innerHTML = '';
    new QRCode(container, {
      text: upiUrl,
      width: 128,
      height: 128,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  },

  async sharePoster(posterElementId, summaryText) {
    const element = document.getElementById(posterElementId);
    try {
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], 'badminton-session.png', { type: 'image/png' });

      // Check for Web Share API support with files
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Badminton Session',
          text: summaryText
        });
      } else {
        // Fallback for browsers that don't support file sharing (like some desktop browsers or older mobile)
        const link = document.createElement('a');
        link.download = 'badminton-session.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        // Open WhatsApp with text summary
        const waUrl = `https://wa.me/?text=${encodeURIComponent(summaryText + "\n\n(Poster downloaded, please attach manually)")}`;
        window.open(waUrl, '_blank');
        this.showToast('Poster downloaded & WhatsApp opened', 'success');
      }
    } catch (error) {
      console.error('Sharing failed:', error);
      this.showToast('Sharing failed: ' + error.message, 'error');
    }
  },

  formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
};

export default UTILS;
