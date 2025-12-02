chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startMonitoring') {
    // We don't generate the stream here anymore.
    // We just open the dashboard.
    const dashboardUrl = chrome.runtime.getURL('dashboard.html');

    chrome.windows.create({
      url: dashboardUrl,
      type: 'popup',
      width: 1000,
      height: 700,
    }, (window) => {
      sendResponse({ success: true });
    });

    return true;
  }
  
   if (request.action === 'meetParticipants') {
    chrome.storage.local.set({meetParticipants: request.participants});
  }
  
});