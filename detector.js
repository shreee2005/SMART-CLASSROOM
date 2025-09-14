const canvas = document.getElementById('canvas');
const statusText = document.querySelector('h1');
// The new model path is a URL
const modelPath = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

statusText.textContent = 'Loading models from internet...';

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
  faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
  faceapi.nets.faceRecognitionNet.loadFromUri(modelPath)
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
async function runAnalysis(imageUrl) {
    const image = new Image();
    image.src = imageUrl;
    image.onload = async () => {
        statusText.textContent = 'Analyzing faces...';
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, image.width, image.height);
        const detections = await faceapi.detectAllFaces(image, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
        if (detections.length > 0) {
            statusText.textContent = `Analysis Complete: Found ${detections.length} face(s).`;
            faceapi.draw.drawDetections(canvas, detections);
        } else {
            statusText.textContent = 'No faces detected.';
        }
        document.getElementById('downloadBtn').style.display = 'block';
    };
}
document.getElementById('downloadBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'analyzed-screenshot.png';
    link.href = canvas.toDataURL();
    link.click();
});