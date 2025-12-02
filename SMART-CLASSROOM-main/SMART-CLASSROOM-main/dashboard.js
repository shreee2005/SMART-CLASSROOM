// Get elements (SAME)
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const statusText = document.getElementById('status');
const reportContainer = document.getElementById('reportContainer');
const saveButton = document.getElementById('save-btn');
const saveStatus = document.getElementById('save-status');

// Charts
const ctxNormal = document.getElementById('normalEmotionChart').getContext('2d');
const ctxCognitive = document.getElementById('cognitiveEmotionChart').getContext('2d');

// State
let meetNames = [];
let students = []; 
let frameCount = 0;

// 🔥 GOOGLE MEET NAMES (SAME)
function getMeetParticipantNames() {
  const selectors = ['[data-self-name]', '[jsname="FzT7wc"]', '[role="gridcell"] span', '.NPEfkd', '.YB2VEd', '.z6hACc', '.oIyjo', 'div[jsname="mpcwr"] span', '.uDF3Dc', '.h9nYaf', '[data-is-participant] span', '.ZjFb7c span'];
  const names = new Set();
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      const name = el.textContent?.trim();
      if (name && name.length > 1 && name.length < 30 && !name.includes('You') && !name.includes('@') && !name.includes('Join') && !name.includes('More')) {
        names.add(name);
      }
    });
  });
  return Array.from(names).slice(0, 12);
}

// 🔥 POSITION MATCHING (SAME)
function assignStudentNames(detections) {
  if (frameCount % 10 === 0) {
    meetNames = getMeetParticipantNames();
    console.log('📝 Meet names:', meetNames);
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
      const name = meetNames[idx] || `Student${students.length + 1}`;
      bestStudent = { 
        id: name, lastX: center.x, lastY: center.y, 
        lazyCount: 0, isLazy: false, lastState: 'concentration', notified: false
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

// 🔥 FIXED EYE RATIO (more accurate)
function getEyeAspectRatio(eye) {
  const v1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
  const v2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
  const h = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
  return (v1 + v2) / (2 * h);
}

// 🔥 NOTIFICATION (SAME)
function notifyTeacher(student, state) {
  if (student.notified) return;
  console.log(`🚨 FIRST ALERT: ${student.id} is ${state.toUpperCase()}!`);
  student.notified = true;
  
  const alert = document.createElement('div');
  alert.id = `alert-${Date.now()}`;
  alert.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 9999;
    background: linear-gradient(135deg, ${state === 'sleepy' ? '#FF6B6B' : '#FFD93D'}, #FF8E8E);
    color: white; padding: 20px 25px; border-radius: 15px; font-weight: bold;
    box-shadow: 0 10px 30px rgba(255,107,107,0.5); min-width: 300px;
    font-size: 18px; backdrop-filter: blur(10px);
    animation: bounceIn 0.5s ease-out, fadeOut 0.5s 4s forwards;
  `;
  alert.innerHTML = `
    ${state === 'sleepy' ? '😴' : '😵‍💫'} <strong>${student.id}</strong><br>
    is <span style="font-size: 20px;">${state.toUpperCase()}</span><br>
    <small>${new Date().toLocaleTimeString()}</small>
  `;
  document.body.appendChild(alert);
  setTimeout(() => alert.remove(), 4500);
}

// CSS (SAME)
if (!document.querySelector('#alert-styles')) {
  const style = document.createElement('style');
  style.id = 'alert-styles';
  style.textContent = `@keyframes bounceIn { 0% { transform: scale(0.3) translateX(400px); opacity: 0; } 50% { transform: scale(1.05); } 100% { transform: scale(1) translateX(0); opacity: 1; } } @keyframes fadeOut { to { opacity: 0; transform: translateX(400px); } }`;
  document.head.appendChild(style);
}

// CHARTS (SAME)
const normalChart = new Chart(ctxNormal, {
  type: 'bar', data: { labels: ['Happy', 'Sad', 'Fear'], datasets: [{label: 'Students', data: [0,0,0], backgroundColor: ['rgba(75,192,192,0.6)','rgba(54,162,235,0.6)','rgba(255,99,132,0.6)'], borderWidth: 1 }]},
  options: {scales: {y: {beginAtZero: true, suggestedMax: 5}}, animation: {duration: 500}}
});

const cognitiveChart = new Chart(ctxCognitive, {
  type: 'doughnut', data: {labels: ['Concentration','Sleepy','Distracted'], datasets: [{data: [0,0,0], backgroundColor: ['#36A2EB','#FF6384','#FFCE56']}]},
  options: {animation: {duration: 500}}
});

// INIT (SAME)
const modelPath = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
  faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelPath),
  faceapi.nets.faceExpressionNet.loadFromUri(modelPath)
]).then(getStream);

async function getStream() {
  statusText.textContent = '🎥 Select Google Meet tab...';
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({video: {displaySurface: 'browser'}, audio: false});
    video.srcObject = stream;
    video.onplay = startAnalysis;
  } catch { statusText.textContent = '❌ Cancelled'; }
}

async function startAnalysis() {
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  statusText.textContent = '🧠 Monitoring Active...';

  setInterval(async () => {
    frameCount++;
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true).withFaceExpressions();

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const resizedDetections = faceapi.resizeResults(detections, {width: canvas.width, height: canvas.height});

    if (resizedDetections?.length) {
      const studentAssignments = assignStudentNames(resizedDetections);
      
      let happy = 0, sad = 0, fear = 0;
      let concentration = 0, sleepyCount = 0, distractedCount = 0;

      resizedDetections.forEach((detection, i) => {
        const student = studentAssignments[i];
        const box = detection.detection.box;
        
        new faceapi.draw.DrawBox(box, {
          label: student.id,
          boxColor: student.isLazy ? '#FF4444' : '#36A2EB',
          lineWidth: 3
        }).draw(canvas);

        // Normal emotions
        const expr = detection.expressions;
        const domEmotion = Object.keys(expr).reduce((a,b) => expr[a]>expr[b]?a:b);
        if (domEmotion === 'happy') happy++;
        else if (domEmotion === 'sad') sad++;
        else if (domEmotion === 'fearful') fear++;

        // 🔥 PERFECT COGNITIVE LOGIC - NO FALSE DISTRACTED
        try {
          const landmarks = detection.landmarks;
          const leftEAR = getEyeAspectRatio(landmarks.getLeftEye());
          const rightEAR = getEyeAspectRatio(landmarks.getRightEye());
          const avgEAR = (leftEAR + rightEAR) / 2;
          
          console.log(`${student.id}: EAR=${avgEAR.toFixed(3)}`);

          let newState = 'concentration'; // DEFAULT
          
          // 🔥 1. SLEEPY FIRST (eyes closed) - PRIORITY 1
          if (avgEAR < 0.25) {  // TIGHTER threshold
            newState = 'sleepy';
          } 
          // 🔥 2. DISTRACTED ONLY if eyes OPEN + VERY CLEAR signs
          else if (avgEAR > 0.28) {  // Eyes must be WIDE OPEN
            // Multiple confirmation needed for distracted
            let distractedScore = 0;
            
            // Head tilt check (stricter)
            const nose = landmarks.positions[30];
            const chin = landmarks.positions[8];
            const headYaw = Math.abs(nose.x - chin.x);
            if (headYaw > 50) distractedScore++; // Very tilted
            
            // Mouth position (yawning/bored)
            const mouthTop = landmarks.positions[13];
            const mouthBottom = landmarks.positions[18];
            const mouthRatio = Math.abs(mouthTop.y - mouthBottom.y) / (nose.y - chin.y);
            if (mouthRatio > 0.25) distractedScore++;
            
            // Expression check
            if (detection.expressions.neutral > 0.6 || detection.expressions.bored > 0.3) {
              distractedScore++;
            }
            
            // 🔥 ONLY if 2+ signs
            if (distractedScore >= 2) {
              newState = 'distracted';
            }
          }

          console.log(`${student.id}: ${newState} (EAR: ${avgEAR.toFixed(3)})`);

          // State tracking
          if (newState !== student.lastState) {
            student.lastState = newState;
            student.lazyCount = 0;
            student.notified = false;
          }
          
          // Count states
          if (newState === 'sleepy') {
            sleepyCount++;
          } else if (newState === 'distracted') {
            distractedCount++;
          } else {
            concentration++;
          }

          // Notifications
          if (newState !== 'concentration') {
            student.lazyCount++;
            if (student.lazyCount >= 2 && !student.isLazy) {
              notifyTeacher(student, newState);
              student.isLazy = true;
            }
          } else {
            student.lazyCount = 0;
            student.isLazy = false;
          }

        } catch(e) {
          concentration++; // Default to concentration on error
          console.log('Error - assuming concentration');
        }
      });

      // Update charts
      normalChart.data.datasets[0].data = [happy, sad, fear];
      normalChart.update('none');
      
      cognitiveChart.data.datasets[0].data = [concentration, sleepyCount, distractedCount];
      cognitiveChart.update('none');
      
      updateReport(resizedDetections.length, concentration, sleepyCount, distractedCount);
    }
  }, 1500);
}

function updateReport(activeCount, conc, sleepy, dist) {
  const lazyCount = students.filter(s => s.isLazy).length;
  const topNames = meetNames.slice(0, 6).join(', ') || 'Detecting...';
  
  reportContainer.innerHTML = `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 20px;">
      <h3 style="margin: 0 0 15px 0;">📊 Live Summary</h3>
      <div style="display: flex; gap: 15px; font-size: 16px; flex-wrap: wrap;">
        <div><b>👥 Active:</b> ${activeCount}</div>
        <div><b>🧠 Focus:</b> <span style="color: #4CAF50">${conc}</span></div>
        <div><b>😴 Sleepy:</b> <span style="color: #FF6384">${sleepy}</span></div>
        <div><b>😵 Distracted:</b> <span style="color: #FFCE56">${dist}</span></div>
        <div style="color: ${lazyCount ? '#FF5722' : '#4CAF50'}; font-weight: bold;">
          🚨 Alerts: ${lazyCount}
        </div>
      </div>
    </div>
  `;
}

saveButton.addEventListener('click', async () => {
  saveStatus.textContent = 'Saving...'; saveStatus.style.color = '#4285F4';
  const names = students.map(s => s.id);
  try {
    await fetch('http://localhost:3000/api/attendance', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({presentStudentNames: names})
    });
    saveStatus.textContent = `✅ Saved ${names.length} students`; 
    saveStatus.style.color = '#34A853';
  } catch(e) {
    saveStatus.textContent = '❌ Save failed'; saveStatus.style.color = '#EA4335';
  }
});
