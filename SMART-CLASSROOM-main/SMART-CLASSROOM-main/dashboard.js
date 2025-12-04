// dashboard.js - RATIO ALERTS + MEET SCREEN FORWARDING
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const statusText = document.getElementById('status');
const reportContainer = document.getElementById('reportContainer');
const saveButton = document.getElementById('save-btn');
const saveStatus = document.getElementById('save-status');

const ctxNormal = document.getElementById('normalEmotionChart').getContext('2d');
const ctxCognitive = document.getElementById('cognitiveEmotionChart').getContext('2d');

let meetNames = [];
let students = [];
let frameCount = 0;
let lastAlertTime = 0; 

function updateMeetNames() {
  chrome.storage.local.get('meetParticipants', (result) => {
    meetNames = result.meetParticipants || [];
    console.log('Meet names:', meetNames);
  });
}
updateMeetNames();
setInterval(updateMeetNames, 3000);

function showDashboardAlert(notAttentiveCount, focusedCount, notAttentiveNames = []) {
  const alert = document.createElement('div');
  alert.id = `dashboard-alert-${Date.now()}`;
  alert.style.cssText = `
    position: fixed !important;
    top: 20px !important;
    right: 20px !important;
    z-index: 100000 !important;
    width: 380px !important;
    max-width: 90vw !important;
    padding: 25px !important;
    border-radius: 20px !important;
    background: linear-gradient(135deg, #FF6B6B, #FF8E53, #FFD93D) !important;
    color: white !important;
    text-align: center !important;
    font-family: Arial, sans-serif !important;
    font-size: 20px !important;
    font-weight: bold !important;
    box-shadow: 0 20px 50px rgba(255,107,107,0.9) !important;
    border: 3px solid rgba(255,255,255,0.5) !important;
    animation: slideInTopRight 0.6s cubic-bezier(0.25,0.46,0.45,0.94) !important;
  `;

  const namesText = notAttentiveNames.length
    ? notAttentiveNames.join(', ')
    : 'Students';

  alert.innerHTML = `
    <div style="font-size: 40px; margin-bottom: 15px;">🚨</div>
    <div style="font-size: 26px; margin-bottom: 12px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
      CLASS ATTENTION!
    </div>
    <div style="font-size: 18px; margin-bottom: 10px;">
      ${namesText}
    </div>
    <div style="font-size: 20px; line-height: 1.4;">
      <strong>${notAttentiveCount}</strong> not attentive<br>
      <span style="color: #FFD93D; font-size: 18px;">
        vs <strong>${focusedCount}</strong> focused
      </span>
    </div>
    <div style="font-size: 16px; opacity: 0.95; margin-top: 18px;">
      ${new Date().toLocaleTimeString()}
    </div>
  `;

  document.body.appendChild(alert);

  setTimeout(() => {
    alert.style.animation = 'slideOutTopRight 0.6s cubic-bezier(0.68,-0.55,0.265,1.55) forwards';
    setTimeout(() => {
      if (alert.parentNode) alert.remove();
    }, 600);
  }, 8000);

  if (!document.querySelector('#corner-styles')) {
    const style = document.createElement('style');
    style.id = 'corner-styles';
    style.textContent = `
      @keyframes slideInTopRight {
        0% { transform: translateX(450px) translateY(-20px); opacity: 0; }
        100% { transform: translateX(0) translateY(0); opacity: 1; }
      }
      @keyframes slideOutTopRight {
        0% { transform: translateX(0) translateY(0); opacity: 1; }
        100% { transform: translateX(450px) translateY(-20px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}



function assignStudentNames(detections) {
  if (frameCount % 10 === 0) {
    console.log('Meet names:', meetNames);
  }
  
  const assignments = [];
  const centers = detections.map(d => ({
    x: d.detection.box.x + d.detection.box.width / 2,
    y: d.detection.box.y + d.detection.box.height / 2
  }));

  centers.forEach((center, idx) => {
    let bestStudent = null;
    let bestDist = Infinity;
    
    students.forEach(student => {
      const dist = Math.hypot(center.x - student.lastX, center.y - student.lastY);
      if (dist < bestDist && dist < 120) {
        bestDist = dist;
        bestStudent = student;
      }
    });
    
    if (!bestStudent) {
      const name = meetNames[idx % meetNames.length] || `Student ${students.length + 1}`;
      bestStudent = {
        id: name,
        lastX: center.x,
        lastY: center.y,
        state: 'concentration'
      };
      students.push(bestStudent);
    } else {
      bestStudent.lastX = center.x;
      bestStudent.lastY = center.y;
    }
    
    assignments.push(bestStudent);
  });
  return assignments;
}

function getEyeAspectRatio(eye) {
  const v1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
  const v2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
  const h = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
  return (v1 + v2) / 2 / h;
}

function sendAlertToMeetScreen(notAttentiveCount, focusedCount, notAttentiveNames = []) {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({
      action: 'classAlert',
      data: {
        notAttentive: notAttentiveCount,
        focused: focusedCount,
        time: new Date().toLocaleTimeString(),
        names: notAttentiveNames
      }
    });
    console.log('📱 Alert sent to Meet screen:', notAttentiveCount, 'vs', focusedCount, notAttentiveNames);
  }
}


function showDashboardAlert(notAttentiveCount, focusedCount) {
  const alert = document.createElement('div');
  alert.id = `dashboard-alert-${Date.now()}`;
  alert.style.cssText = `
    position: fixed !important;
    top: 20px !important;
    right: 20px !important;
    z-index: 100000 !important;
    width: 380px !important;
    max-width: 90vw !important;
    padding: 25px !important;
    border-radius: 20px !important;
    background: linear-gradient(135deg, #FF6B6B, #FF8E53, #FFD93D) !important;
    color: white !important;
    text-align: center !important;
    font-family: Arial, sans-serif !important;
    font-size: 20px !important;
    font-weight: bold !important;
    box-shadow: 0 20px 50px rgba(255,107,107,0.9) !important;
    border: 3px solid rgba(255,255,255,0.5) !important;
    animation: slideInTopRight 0.6s cubic-bezier(0.25,0.46,0.45,0.94) !important;
  `;
  
  alert.innerHTML = `
    <div style="font-size: 40px; margin-bottom: 15px;">🚨</div>
    <div style="font-size: 26px; margin-bottom: 12px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">CLASS ATTENTION!</div>
    <div style="font-size: 20px; line-height: 1.4;">
      <strong>${notAttentiveCount}</strong> not attentive<br>
      <span style="color: #FFD93D; font-size: 18px;">vs <strong>${focusedCount}</strong> focused</span>
    </div>
    <div style="font-size: 16px; opacity: 0.95; margin-top: 18px;">
      ${new Date().toLocaleTimeString()}
    </div>
  `;
  
  document.body.appendChild(alert);

  setTimeout(() => {
    alert.style.animation = 'slideOutTopRight 0.6s cubic-bezier(0.68,-0.55,0.265,1.55) forwards';
    setTimeout(() => {
      if (alert.parentNode) alert.remove();
    }, 600);
  }, 8000);

  if (!document.querySelector('#corner-styles')) {
    const style = document.createElement('style');
    style.id = 'corner-styles';
    style.textContent = `
      @keyframes slideInTopRight {
        0% { 
          transform: translateX(450px) translateY(-20px); 
          opacity: 0; 
        }
        100% { 
          transform: translateX(0) translateY(0); 
          opacity: 1; 
        }
      }
      @keyframes slideOutTopRight {
        0% { 
          transform: translateX(0) translateY(0); 
          opacity: 1; 
        }
        100% { 
          transform: translateX(450px) translateY(-20px); 
          opacity: 0; 
        }
      }
    `;
    document.head.appendChild(style);
  }
}


function checkClassRatio(sleepyCount, distractedCount, focusedCount, notAttentiveNames = []) {
  const notAttentiveCount = sleepyCount + distractedCount;
  const now = Date.now();

  if (now - lastAlertTime < 30000 || focusedCount >= notAttentiveCount) return false;

  console.log(`🚨 RATIO ALERT: ${notAttentiveCount} > ${focusedCount}`, notAttentiveNames);
  lastAlertTime = now;

  showDashboardAlert(notAttentiveCount, focusedCount, notAttentiveNames);
  sendAlertToMeetScreen(notAttentiveCount, focusedCount, notAttentiveNames);

  return true;
}

const normalChart = new Chart(ctxNormal, {
  type: 'bar',
  data: { labels: ['Happy', 'Sad', 'Fear'], datasets: [{ label: 'Students', data: [0,0,0], backgroundColor: ['rgba(75,192,192,0.6)','rgba(54,162,235,0.6)','rgba(255,99,132,0.6)'], borderWidth: 1 }] },
  options: { scales: { y: { beginAtZero: true, suggestedMax: 5 } }, animation: { duration: 500 } }
});

const cognitiveChart = new Chart(ctxCognitive, {
  type: 'doughnut',
  data: { labels: ['Focused','Sleepy','Distracted'], datasets: [{ data: [0,0,0], backgroundColor: ['#36A2EB','#FF6384','#FFCE56'] }] },
  options: { animation: { duration: 500 } }
});

const modelPath = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
  faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelPath),
  faceapi.nets.faceExpressionNet.loadFromUri(modelPath)
]).then(getStream);

async function getStream() {
  statusText.textContent = 'Select Google Meet tab...';
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser' }, audio: false });
    video.srcObject = stream;
    video.onplay = startAnalysis;
  } catch {
    statusText.textContent = 'Cancelled';
  }
}

async function startAnalysis() {
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  statusText.textContent = 'Monitoring Active...';
  
  setInterval(async () => {
    frameCount++;
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true).withFaceExpressions();
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const resizedDetections = faceapi.resizeResults(detections, { width: canvas.width, height: canvas.height });
    
    if (resizedDetections?.length) {
      const studentAssignments = assignStudentNames(resizedDetections);
      let happy = 0, sad = 0, fear = 0;
      let focusedCount = 0, sleepyCount = 0, distractedCount = 0;
      
      resizedDetections.forEach((detection, i) => {
        const student = studentAssignments[i];
        const box = detection.detection.box;
        
        new faceapi.draw.DrawBox(box, { 
          label: student.id, 
          boxColor: student.state === 'concentration' ? '#36A2EB' : '#FF4444', 
          lineWidth: 3 
        }).draw(canvas);
        
        const expr = detection.expressions;
        const domEmotion = Object.keys(expr).reduce((a,b) => expr[a] > expr[b] ? a : b);
        if (domEmotion === 'happy') happy++;
        else if (domEmotion === 'sad') sad++;
        else if (domEmotion === 'fearful') fear++;

        try {
          const landmarks = detection.landmarks;
          const leftEAR = getEyeAspectRatio(landmarks.getLeftEye());
          const rightEAR = getEyeAspectRatio(landmarks.getRightEye());
          const avgEAR = (leftEAR + rightEAR) / 2;
          
          let newState = 'concentration';
          if (avgEAR < 0.28) newState = 'sleepy';
          else if (avgEAR > 0.30) {
            let distractedScore = 0;
            const nose = landmarks.positions[30];
            const chin = landmarks.positions[8];
            if (Math.abs(nose.x - chin.x) > 50) distractedScore++;
            if (detection.expressions.neutral > 0.6) distractedScore++;
            if (distractedScore >= 2) newState = 'distracted';
          }
          
          student.state = newState;
          
          if (newState === 'sleepy') sleepyCount++;
          else if (newState === 'distracted') distractedCount++;
          else focusedCount++;
          
        } catch {
          focusedCount++;
        }
      });

        const notAttentiveCount = sleepyCount + distractedCount;


        const notAttentiveNames = students
          .filter(s => s.state === 'sleepy' || s.state === 'distracted')
          .map(s => s.id);

        checkClassRatio(sleepyCount, distractedCount, focusedCount, notAttentiveNames);

        checkClassRatio(sleepyCount, distractedCount, focusedCount);

      normalChart.data.datasets[0].data = [happy, sad, fear];
      normalChart.update('none');
      cognitiveChart.data.datasets[0].data = [focusedCount, sleepyCount, distractedCount];
      cognitiveChart.update('none');
      updateReport(resizedDetections.length, focusedCount, sleepyCount, distractedCount);
    }
  }, 1500);
}

function updateReport(activeCount, focused, sleepy, distracted) {
  const notAttentive = sleepy + distracted;
  reportContainer.innerHTML = `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 20px;">
      <h3 style="margin: 0 0 15px 0">Live Summary</h3>
      <div style="display: flex; gap: 15px; font-size: 16px; flex-wrap: wrap;">
        <div><b>Active:</b> ${activeCount}</div>
        <div><b>Focused:</b> <span style="color: #4CAF50">${focused}</span></div>
        <div><b>Sleepy:</b> <span style="color: #FF6384">${sleepy}</span></div>
        <div><b>Distracted:</b> <span style="color: #FFCE56">${distracted}</span></div>
        <div style="${notAttentive > focused ? 'color: #FF5722; font-size: 18px; animation: blink 1s infinite;' : 'color: #4CAF50; font-weight: bold;' }">
          ${notAttentive > focused ? '🚨 ALERT' : 'Status'}: ${notAttentive}/${focused}
        </div>
      </div>
    </div>
    <style>
      @keyframes blink { 50% { opacity: 0.5; } }
    </style>
  `;
}

saveButton.addEventListener('click', async () => {
  saveStatus.textContent = 'Saving...';
  saveStatus.style.color = '#4285F4';
  const names = students.map(s => s.id);
  try {
    await fetch('http://localhost:3000/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presentStudentNames: names })
    });
    saveStatus.textContent = `Saved ${names.length} students`;
    saveStatus.style.color = '#34A853';
  } catch {
    saveStatus.textContent = 'Save failed';
    saveStatus.style.color = '#EA4335';
  }
});
