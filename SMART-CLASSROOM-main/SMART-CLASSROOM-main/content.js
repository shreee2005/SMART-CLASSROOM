// content.js – stable version with Meet corner alerts + See Results

(function () {
  const notification = document.createElement('div');
  notification.id = 'smart-notification';
  document.body.appendChild(notification);

  function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }

  function safeSendMessage(message, cb) {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        if (cb) cb(null);
        return;
      }
      chrome.runtime.sendMessage(message, (response) => {
        const lastError = chrome.runtime && chrome.runtime.lastError;
        if (
          lastError &&
          lastError.message &&
          lastError.message.includes('Extension context invalidated')
        ) {
          if (cb) cb(null);
          return;
        }
        if (cb) cb(response || null);
      });
    } catch (_) {
      if (cb) cb(null);
    }
  }

 function showMeetScreenAlert(data) {
  const existingAlert = document.querySelector('#meet-corner-alert');
  if (existingAlert) existingAlert.remove();

  const alert = document.createElement('div');
  alert.id = 'meet-corner-alert';
  alert.style.cssText = `
    position: fixed !important;
    top: 20px !important;
    right: 20px !important;
    z-index: 100000 !important;
    width: 380px !important;
    max-width: 90vw !important;
    padding: 25px !important;
    border-radius: 20px !important;
    background: linear-gradient(135deg,#FF6B6B,#FF8E53,#FFD93D) !important;
    color: white !important;
    text-align: center !important;
    font-family: Arial,sans-serif !important;
    font-size: 20px !important;
    font-weight: bold !important;
    box-shadow: 0 20px 50px rgba(255,107,107,0.9) !important;
    border: 3px solid rgba(255,255,255,0.5) !important;
    animation: slideInTopRight 0.6s ease-out !important;
  `;

  const namesText = Array.isArray(data.names) && data.names.length
    ? data.names.join(', ')
    : 'Students';

  alert.innerHTML = `
    <div style="font-size:40px;margin-bottom:15px;">🚨</div>
    <div style="font-size:26px;margin-bottom:12px;">CLASS ATTENTION!</div>
    <div style="font-size:18px;margin-bottom:8px;">
      ${namesText}
    </div>
    <div style="font-size:20px;line-height:1.4;">
      <strong>${data.notAttentive}</strong> not attentive<br>
      <span style="color:#FFD93D;font-size:18px;">vs <strong>${data.focused}</strong> focused</span>
    </div>
    <div style="font-size:16px;opacity:0.95;margin-top:18px;">
      ${data.time}
    </div>
  `;

  document.body.appendChild(alert);

  setTimeout(() => {
    alert.style.animation = 'slideOutTopRight 0.6s ease-out forwards';
    setTimeout(() => {
      if (alert.parentNode) alert.remove();
    }, 600);
  }, 8000);

  if (!document.querySelector('#meet-corner-css')) {
    const style = document.createElement('style');
    style.id = 'meet-corner-css';
    style.textContent = `
      @keyframes slideInTopRight {
        0% { transform: translateX(450px); opacity:0; }
        100% { transform: translateX(0); opacity:1; }
      }
      @keyframes slideOutTopRight {
        to { transform: translateX(450px); opacity:0; }
      }
    `;
    document.head.appendChild(style);
  }
}

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        if (request.action === 'classAlert' && request.data) {
          showMeetScreenAlert(request.data);
          sendResponse && sendResponse({ received: true });
          return true;
        }
      } catch (e) {
        console.log('Message handler error:', e);
      }
    });
  }

  setInterval(() => {
    try {
      const selectors =
        '[data-self-name], [jsname="FzT7wc"], .N5ZEOf span, span.notranslate';
      const raw = document.querySelectorAll(selectors);
      const names = Array.from(raw)
        .map((el) => el.textContent && el.textContent.trim())
        .filter(
          (name) =>
            name &&
            name.length > 1 &&
            name.length < 30 &&
            !/you|join|more/i.test(name)
        );

      const unique = [...new Set(names)].slice(0, 12);
      if (unique.length === 0) return;

      safeSendMessage(
        { action: 'meetParticipants', participants: unique },
        () => {}
      );
    } catch (e) {
      console.log('Name scraping skipped:', e);
    }
  }, 5000);

  // --- Buttons: Start Monitoring / See Results ---
  function createButton(text, id) {
    const btn = document.createElement('button');
    btn.id = id;
    btn.className = 'smart-class-btn';
    btn.textContent = text;
    return btn;
  }

  const startBtn = createButton('Start Monitoring', 'start-monitor-btn');
  document.body.appendChild(startBtn);

  startBtn.addEventListener('click', () => {
    showNotification('Monitoring is started');
    startBtn.remove();

    const resultBtn = createButton('See Results', 'see-results-btn');
    document.body.appendChild(resultBtn);

    resultBtn.addEventListener('click', () => {
      resultBtn.textContent = 'Opening...';

      safeSendMessage({ action: 'startMonitoring' }, (response) => {
        if (response && response.success) {
          resultBtn.textContent = 'See Results';
          showNotification('Dashboard opened!');
        } else {
          console.error('Failed to open dashboard or context invalid.');
          resultBtn.textContent = 'Error';
        }
      });
    });
  });

  if (!document.querySelector('#smart-styles')) {
    const style = document.createElement('style');
    style.id = 'smart-styles';
    style.textContent = `
      #smart-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 99999;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 25px;
        border-radius: 25px;
        font-weight: bold;
        font-size: 16px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        transform: translateX(400px);
        opacity: 0;
        transition: all 0.3s ease;
      }
      #smart-notification.show {
        transform: translateX(0);
        opacity: 1;
      }
      .smart-class-btn {
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 99999;
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
        border: none;
        padding: 15px 25px;
        border-radius: 25px;
        font-weight: bold;
        font-size: 16px;
        cursor: pointer;
        box-shadow: 0 5px 15px rgba(76,175,80,0.4);
        transition: all 0.3s ease;
      }
      .smart-class-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(76,175,80,0.6);
      }
    `;
    document.head.appendChild(style);
  }

  console.log('Smart Classroom content.js loaded safely');
})();
