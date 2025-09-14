chrome.action.onClicked.addListener(async (tab) => {
  if (tab.active) {
    try {
      const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      chrome.storage.local.set({ capturedImage: screenshotDataUrl }, () => {
        chrome.tabs.create({ url: 'result.html' });
      });
    } catch (error) {
      console.error('Failed to capture tab:', error);
    }
  }
});
