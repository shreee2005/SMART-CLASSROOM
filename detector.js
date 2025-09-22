const canvas = document.getElementById('canvas');
const statusText = document.querySelector('h1');
// The new model path is a URL
const modelPath = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

statusText.textContent = 'Loading models from internet...';

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
  // FIX: Changed faceLandmark68Net to faceLandmark68TinyNet
  faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelPath), 
  faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
  faceapi.nets.faceExpressionNet.loadFromUri(modelPath)
]).then(start)
.catch(error => {
    statusText.textContent = 'Models failed to load from internet.';
    console.error(error);
});

async function start() {
    // This is the full code from our "Fresh Start" guide. It will now work.
    statusText.textContent = 'Models Loaded. Getting image...';
    chrome.storage.local.get(['capturedImage'], (result) => {
        if (result.capturedImage) {
            runAnalysis(result.capturedImage);
            chrome.storage.local.remove(['capturedImage']);
        }
    });
}
// In detector.js

async function runAnalysis(imageUrl) {
    const image = new Image();
    image.src = imageUrl;
    image.onload = async () => {
        statusText.textContent = 'Analyzing faces...';
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, image.width, image.height);

        const detections = await faceapi.detectAllFaces(image, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks(true)
            .withFaceExpressions();

        // Add this console.log for debugging. Check your browser's developer console
        // to see what the value is. It should be an array [].
        console.log('Detections result:', detections);

        // This is a safer way to check the result before using it
        // In detector.js, find the "if (detections &&..." block and replace it with this:

if (detections && Array.isArray(detections) && detections.length > 0) {
    // Drawing on canvas remains the same
    faceapi.draw.drawDetections(canvas, detections);
    faceapi.draw.drawFaceExpressions(canvas, detections);
    // You can also draw landmarks to see the points!
    faceapi.draw.drawFaceLandmarks(canvas, detections);

    // --- NEW DETAILED ANALYSIS ---
    let engagedStudents = 0;
    let sleepyOrBoredStudents = 0;
    let eyesClosedCount = 0;
    const EAR_THRESHOLD = 0.2; // You can tune this value

    detections.forEach(detection => {
        // 1. Expression Analysis
        const expressions = detection.expressions;
        const dominantExpression = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);

        if (dominantExpression === 'happy' || dominantExpression === 'surprised') {
            engagedStudents++;
        } else if (dominantExpression === 'neutral' || dominantExpression === 'sad') {
            sleepyOrBoredStudents++;
        }

        // 2. Eye Aspect Ratio (EAR) Analysis for Sleepiness
        const landmarks = detection.landmarks;
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();

        const leftEAR = getEyeAspectRation(leftEye);
        const rightEAR = getEyeAspectRation(rightEye);

        // If the average EAR of both eyes is below the threshold, count as closed.
        if ((leftEAR + rightEAR) / 2 < EAR_THRESHOLD) {
            eyesClosedCount++;
        }
    });

    // --- POPULATE THE REPORT ---
    const reportContainer = document.getElementById('reportContainer');
    reportContainer.innerHTML = `
        <h3>Overall Summary</h3>
        <p><b>Total Students Detected:</b> ${detections.length}</p>
        <p><b>Engaged (Happy/Surprised):</b> ${engagedStudents}</p>
        <p><b>Neutral/Sad:</b> ${sleepyOrBoredStudents}</p>
        <p style="color:red;"><b>Potentially Sleepy (Eyes Closed): ${eyesClosedCount}</b></p>
    `;

    // We no longer need to update the h1 tag this way
    document.querySelector('h1').textContent = "Analysis Complete";


} else {
    statusText.textContent = 'No faces detected.';
}
        document.getElementById('downloadBtn').style.display = 'block';
    };
    // It's also good practice to handle image loading errors
    image.onerror = () => {
        statusText.textContent = 'Could not load the screenshot image.';
    }
}
document.getElementById('downloadBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'analyzed-screenshot.png';
    link.href = canvas.toDataURL();
    link.click();
});

// Add this function anywhere in detector.js
function getDistance(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// Add this function in detector.js as well
function getEyeAspectRation(eyeLandmarks) {
  // Points for vertical eye distance
  const v1 = getDistance(eyeLandmarks[1], eyeLandmarks[5]);
  const v2 = getDistance(eyeLandmarks[2], eyeLandmarks[4]);
  // Point for horizontal eye distance
  const h1 = getDistance(eyeLandmarks[0], eyeLandmarks[3]);

  // Calculate Eye Aspect Ratio
  const ear = (v1 + v2) / (2 * h1);
  return ear;
}