(function() {
  // --- Helper: Create a Notification Banner ---
  const notification = document.createElement('div');
  notification.id = 'smart-notification';
  document.body.appendChild(notification);

  function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');
    // Hide after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }
  // content.js - Send names to dashboard
  setInterval(() => {
  const names = [];
  document.querySelectorAll('[data-self-name], [jsname="FzT7wc"], .N5ZEOf span').forEach(el => {
    const name = el.textContent?.trim();
    if (name && name.length > 1 && !name.includes('You')) names.push(name);
  });
  
  // Send to dashboard via chrome.runtime
  chrome.runtime.sendMessage({action: 'meetParticipants', participants: [...new Set(names)]});
  }, 5000);

  function createButton(text, id) {
    const btn = document.createElement('button');
    btn.id = id;
    btn.className = 'smart-class-btn'; // Uses the class from CSS
    btn.textContent = text;
    return btn;
  }

  // --- 1. Initial State: Show "Start Monitoring" ---
  const startBtn = createButton('Start Monitoring', 'start-monitor-btn');
  document.body.appendChild(startBtn);

  // --- 2. Event Listener for Start ---
  startBtn.addEventListener('click', () => {
    
    // A. Show the notification
    showNotification("Monitoring is started");

    // B. Remove the Start button
    startBtn.remove();

    // C. Create and Add the "See Results" button
    const resultBtn = createButton('See Results', 'see-results-btn');
    document.body.appendChild(resultBtn);

    // D. Add listener for the new button
    // This is where we actually trigger the extension dashboard
    resultBtn.addEventListener('click', () => {
      
      resultBtn.textContent = 'Opening...';
      
      // Send the message to background.js to open the window
      chrome.runtime.sendMessage({ action: 'startMonitoring' }, (response) => {
        if (response && response.success) {
            resultBtn.textContent = 'See Results'; // Reset text
        } else {
            console.error('Failed to open dashboard.');
            resultBtn.textContent = 'Error';
        }
      });
    });
  });

})();