// background.js – SIMPLE, STABLE VERSION

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1) Open dashboard popup when user clicks "See Results"
  if (request.action === 'startMonitoring') {
    const dashboardUrl = chrome.runtime.getURL('dashboard.html');

    chrome.windows.create(
      {
        url: dashboardUrl,
        type: 'popup',
        width: 1000,
        height: 700
      },
      () => {
        // Tell content.js it worked
        sendResponse({ success: true });
      }
    );

    // Keep message channel open for async sendResponse
    return true;
  }

  // 2) Store participant names coming from content.js
  if (request.action === 'meetParticipants') {
    chrome.storage.local.set({
      meetParticipants: request.participants || []
    });
    sendResponse && sendResponse({ success: true });
    return;
  }

  // 3) Forward class alerts from dashboard to ALL Meet tabs
  if (request.action === 'classAlert') {
    chrome.tabs.query({ url: '*://meet.google.com/*' }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, request);
      });
    });
    sendResponse && sendResponse({ success: true });
    return;
  }
});
