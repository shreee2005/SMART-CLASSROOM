chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === 'EMOTION_ALERT') {
    const notificationId = `student-alert-${request.name}-${Date.now()}`;
    const options = {
      type: 'basic',
      iconUrl: 'icon48.jpg',
      title: `${request.name}: ${request.emotion}`,
      message: request.reason,
      requireInteraction: false
    };
    chrome.notifications.create(notificationId, options, (id) => {
      if (chrome.runtime.lastError) {
        console.error('Notification error:', chrome.runtime.lastError);
      } else {
        console.log(`Notification: ${request.name} - ${request.emotion}, reason: ${request.reason}`);
      }
    });
  }
});

console.log("Background: ready for emotion notifications.");
