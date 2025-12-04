document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const status = document.getElementById('status');
  
  chrome.runtime.sendMessage({action: 'getStatus'}, (response) => {
    updateStatus(response.active);
  });
  
  startBtn.onclick = () => {
    chrome.runtime.sendMessage({action: 'startMonitoring'}, () => {
      updateStatus(true);
    });
  };
  
  stopBtn.onclick = () => {
    chrome.runtime.sendMessage({action: 'stopMonitoring'}, () => {
      updateStatus(false);
    });
  };
  
  function updateStatus(active) {
    if (active) {
      status.textContent = 'Monitoring ACTIVE';
      status.className = 'status active';
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
    } else {
      status.textContent = 'Monitoring OFF';
      status.className = 'status inactive';
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
    }
  }
});
