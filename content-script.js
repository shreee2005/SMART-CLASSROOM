console.log('Content Script: Running on Google Meet page.');

// Load face-api if not already present (for extensions, bundle face-api.min.js and reference in manifest)
if (typeof faceapi === "undefined") {
  // If using CDN
  const script = document.createElement('script');
  script.src = 'face-api.min.js';
  document.head.appendChild(script);
  script.onload = () => {
    console.log('face-api.js loaded in content script');
  };
}

const MODEL_PATH = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

// Load face-api models once
let modelsLoaded = false;
async function loadModels() {
  if (!modelsLoaded && typeof faceapi !== "undefined") {
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_PATH);
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_PATH);
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_PATH);
    modelsLoaded = true;
    console.log("Content Script: face-api models loaded");
  }
}

// Utility functions for EAR/MAR
function getDistance(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}
function getEyeAspectRatio(eyeLandmarks) {
  const v1 = getDistance(eyeLandmarks[1], eyeLandmarks[5]);
  const v2 = getDistance(eyeLandmarks[2], eyeLandmarks[4]);
  const h1 = getDistance(eyeLandmarks[0], eyeLandmarks[3]);
  return (v1 + v2) / (2 * h1);
}
function getMouthAspectRatio(mouthLandmarks) {
  const innerMouth = mouthLandmarks.slice(12, 20);
  const v1 = getDistance(innerMouth[2], innerMouth[6]);
  const h1 = getDistance(innerMouth[0], innerMouth[4]);
  return v1 / h1;
}

// Main participant frame analysis loop
async function analyzeVideoParticipants() {
  await loadModels();
  const videos = document.querySelectorAll('video');
  const EAR_THRESHOLD = 0.2;
  const MAR_THRESHOLD = 0.75;

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    if (video.readyState === 4 && !video.paused && !video.ended && video.videoWidth > 0 && video.videoHeight > 0) {
      // Create temporary canvas for each frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

      // Run face detection and emotion analysis
      const detections = await faceapi.detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceExpressions();

      detections.forEach((detection, idx) => {
        const expressions = detection.expressions;
        const dominant = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
        const landmarks = detection.landmarks;
        const avgEAR = (getEyeAspectRatio(landmarks.getLeftEye()) + getEyeAspectRatio(landmarks.getRightEye())) / 2;
        const mar = getMouthAspectRatio(landmarks.getMouth());

        let status = "Engaged", statusColor = "green", alertReason = "";
        if (dominant === "neutral" && expressions["neutral"] > 0.7) {
          status = "Bored";
          statusColor = "orange";
          alertReason = `Neutral (${(expressions["neutral"] * 100).toFixed(1)}%)`;
        }
        if (avgEAR < EAR_THRESHOLD) {
          status = "Sleepy";
          statusColor = "red";
          alertReason = `Eyes closed (EAR=${avgEAR.toFixed(2)})`;
        }
        if (mar > MAR_THRESHOLD) {
          status = "Yawning";
          statusColor = "red";
          alertReason = `Yawning (MAR=${mar.toFixed(2)})`;
        }
        if (dominant === "sad" || dominant === "disgusted") {
          status = "Low Mood";
          statusColor = "orange";
          alertReason = `${dominant} (${(expressions[dominant] * 100).toFixed(1)}%)`;
        }

        // Send engagement notification (to background.js for Chrome notification)
        chrome.runtime.sendMessage({
          type: "EMOTION_ALERT",
          name: `Participant-${i + 1}`,
          emotion: status,
          reason: alertReason
        });
      });
    }
  }
}

// Analyze every 5 seconds
setInterval(analyzeVideoParticipants, 5000);

// Add participant name gathering logic (for other features)
function getVisibleParticipantNames() {
  const names = [];
  document.querySelectorAll('span.notranslate, [data-participant-list] [data-name], [data-participant-id] [data-full-name]').forEach(el => {
    let name = el.getAttribute('data-name') || el.textContent.trim();
    if (name && name.length && !name.includes('Presenting')) {
      if (name.includes('(You)')) name = name.replace('(You)', '').trim();
      if (name !== 'You' && name.length > 0) names.push(name);
    }
  });
  return names;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GATHER_NAMES') {
    const participantNames = getVisibleParticipantNames();
    console.log('Content Script: Found and saved names:', participantNames);
    chrome.storage.local.set({ 'participantNames': participantNames }, () => {
      sendResponse({ success: true, count: participantNames.length, names: participantNames });
    });
    return true;
  }
});

