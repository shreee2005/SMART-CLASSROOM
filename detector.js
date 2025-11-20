const canvas = document.getElementById('canvas');
const statusText = document.querySelector('h1');
const modelPath = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

console.log("Detector: Starting up. Attempting model load.");

statusText.textContent = 'Loading models from internet...';

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
  faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelPath),
  faceapi.nets.faceExpressionNet.loadFromUri(modelPath)
]).then(() => {
  console.log("Detector: All face-api models loaded successfully.");
  start();
}).catch(error => {
  statusText.textContent = 'Models failed to load. See console for details.';
  console.error('Detector: Model loading error:', error);
});

async function start() {
  statusText.textContent = 'Models Loaded. Getting image and names...';
  console.log('Detector: Attempting to retrieve data from chrome.storage.local.');
  chrome.storage.local.get({
    'capturedImage': null,
    'participantNames': []
  }, result => {
    if (result.capturedImage) {
      const names = result.participantNames;
      console.log(`Detector: Screenshot retrieved. Found ${names.length} participant name(s).`);
      runAnalysis(result.capturedImage, names);
      chrome.storage.local.remove(['capturedImage', 'participantNames']);
    } else {
      statusText.textContent = 'Error: Could not retrieve screenshot.';
      console.warn('Detector: No screenshot found in chrome.storage.local.');
    }
  });
}

async function runAnalysis(imageUrl, participantNames) {
  console.log('Detector: Starting analysis on image.');
  const image = new Image();
  image.src = imageUrl;

  image.onload = async () => {
    statusText.textContent = 'Analyzing faces...';
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, image.width, image.height);

    let detections;
    try {
      detections = await faceapi.detectAllFaces(image, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceExpressions();
      console.log(`Detector: Face detection complete. ${detections.length} face(s) found.`);
    } catch (err) {
      console.error('Detector: Error during face detection:', err);
      statusText.textContent = 'Face detection failed.';
      return;
    }

    if (detections && Array.isArray(detections) && detections.length > 0) {
      document.querySelector('h1').textContent = "Analysis Report";
      const reportContainer = document.getElementById('reportContainer');
      reportContainer.innerHTML = '';
      const EAR_THRESHOLD = 0.2;
      const MAR_THRESHOLD = 0.75;

      detections.forEach((detection, i) => {
        const studentName = participantNames[i] ? participantNames[i].split(' (You)')[0] : `Student ${i + 1}`;
        let studentStatus = 'Engaged';
        let statusColor = 'green';
        const expressions = detection.expressions;
        const dominantExpression = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);

        if (dominantExpression === 'neutral' || dominantExpression === 'sad' || dominantExpression === 'disgusted') {
          studentStatus = `Neutral / Bored (${dominantExpression})`;
          statusColor = 'orange';
          chrome.runtime.sendMessage({
            type: 'LAZY_STUDENT_ALERT',
            name: studentName,
            reason: `potential disengagement (${dominantExpression})`
          });
        }

        const landmarks = detection.landmarks;
        const avgEAR = (getEyeAspectRatio(landmarks.getLeftEye()) + getEyeAspectRatio(landmarks.getRightEye())) / 2;
        const mar = getMouthAspectRatio(landmarks.getMouth());

        if (avgEAR < EAR_THRESHOLD) {
          studentStatus = 'Sleepy (Eyes Closed)';
          statusColor = 'red';
          chrome.runtime.sendMessage({
            type: 'LAZY_STUDENT_ALERT',
            name: studentName,
            reason: `eyes closed detected (EAR=${avgEAR.toFixed(2)})`
          });
        }

        if (mar > MAR_THRESHOLD) {
          studentStatus = 'Yawning';
          statusColor = 'red';
          chrome.runtime.sendMessage({
            type: 'LAZY_STUDENT_ALERT',
            name: studentName,
            reason: `yawning detected (MAR=${mar.toFixed(2)})`
          });
        }

        const box = detection.detection.box;
        const drawOptions = {
          label: `${studentName}: ${studentStatus}`,
          boxColor: statusColor,
          lineWidth: 2
        };
        new faceapi.draw.DrawBox(box, drawOptions).draw(canvas);

        const reportCard = document.createElement('div');
        reportCard.className = 'report-card';
        reportCard.style.borderLeftColor = statusColor;
        reportCard.innerHTML =
          `Name: <b>${studentName}</b><br>Status: <b>${studentStatus}</b><br>Expression: ${dominantExpression} (${Math.round(expressions[dominantExpression] * 100)}%)<br>EAR: ${avgEAR.toFixed(2)}<br>MAR: ${mar.toFixed(2)}`;
        reportContainer.appendChild(reportCard);
      });
    } else {
      document.querySelector('h1').textContent = 'No faces detected.';
      console.warn('Detector: No faces detected in image.');
    }
    document.getElementById('downloadBtn').style.display = 'block';
  };
  image.onerror = () => {
    statusText.textContent = 'Could not load the screenshot image.';
    console.error('Detector: Image failed to load from URL:', imageUrl);
  };
}

// Live analysis handler (for future use if you add frame streaming)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "PROCESS_FRAME") {
    analyzeFrameLive(request.imageData);
  }
});

async function analyzeFrameLive(imageData) {
  const image = new Image();
  image.src = imageData;
  image.onload = async () => {
    const canvasTmp = document.createElement('canvas');
    canvasTmp.width = image.width;
    canvasTmp.height = image.height;
    const ctx = canvasTmp.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);

    const detections = await faceapi.detectAllFaces(canvasTmp, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceExpressions();

    const EAR_THRESHOLD = 0.2;
    const MAR_THRESHOLD = 0.75;

    detections.forEach((detection, i) => {
      const expressions = detection.expressions;
      const dominantExpression = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
      const landmarks = detection.landmarks;
      const avgEAR = (getEyeAspectRatio(landmarks.getLeftEye()) + getEyeAspectRatio(landmarks.getRightEye())) / 2;
      const mar = getMouthAspectRatio(landmarks.getMouth());

      let emotion = null, reason = null;
      if (avgEAR < EAR_THRESHOLD) {
        emotion = 'Sleepy';
        reason = `eyes closed (EAR=${avgEAR.toFixed(2)})`;
      } else if (dominantExpression === 'neutral' && expressions.neutral > 0.7) {
        emotion = 'Bored';
        reason = `neutral (${(expressions['neutral']*100).toFixed(1)}%)`;
      } else if (mar > MAR_THRESHOLD) {
        emotion = 'Yawning';
        reason = `yawning (MAR=${mar.toFixed(2)})`;
      } else if (dominantExpression === 'sad' || dominantExpression === 'disgusted') {
        emotion = dominantExpression.charAt(0).toUpperCase() + dominantExpression.slice(1);
        reason = `expression ${dominantExpression} (${(expressions[dominantExpression]*100).toFixed(1)}%)`;
      }

      if (emotion) {
        chrome.runtime.sendMessage({
          type: 'EMOTION_ALERT',
          name: `Person ${i+1}`,
          emotion: emotion,
          reason: reason
        });
      }
    });
  };
}

// Utility functions
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

document.getElementById('downloadBtn').addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'analyzed-screenshot.png';
  link.href = canvas.toDataURL();
  link.click();
  console.log('Detector: Screenshot downloaded.');
});
