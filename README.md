# Smart Classroom – Real‑Time Engagement Analytics (Chrome Extension)

Smart Classroom is a **Chrome extension + dashboard** that gives teachers **real‑time visibility into student engagement** during Google Meet sessions.  
It runs entirely in the browser using **Edge AI** (TensorFlow.js + face-api.js), so **no video ever leaves the teacher’s machine**, preserving student privacy. [file:31][file:33][file:82]

---

## ✨ Key Features

- **Google Meet integration**
  - Injects a “Start Monitoring” and “See Results” button directly into the Meet UI.
  - Shows in‑Meet alert banners when class attention drops (top‑right corner overlay). [file:050b6e73-266f-4b6c-8f99-893b0fa6fb43][file:33]

- **Edge AI detection loop**
  - Captures frames from the Meet tab and runs face detection + facial landmarks + emotion recognition using face‑api.js. [file:33]
  - Computes Eye Aspect Ratio (EAR) to detect **sleepiness / eye closure**.
  - Classifies each student into **Focused / Sleepy / Distracted** on every iteration. [file:33]

- **Student‑level tracking**
  - Scrapes participant names from the Meet DOM and stores them in `chrome.storage.local`. [file:050b6e73-266f-4b6c-8f99-893b0fa6fb43]
  - Tracks faces across frames with spatial proximity matching so each bounding box is tied to the same student name over time. [file:33]

- **Teacher dashboard**
  - Separate popup window showing:
    - Live video with colored bounding boxes and per‑student labels.
    - **Emotion bar chart** (Happy / Sad / Fear) and **cognitive state doughnut chart** (Focused / Sleepy / Distracted) via Chart.js. [file:33]
    - Live summary cards with counts and an “Alert / OK” status based on class engagement ratio. [file:33]
  - CSV export of attendance / engagement via a small Node.js mock API (`server.js`). [file:33]

- **Bi‑directional alert system**
  - When the “Lazy Ratio” / class engagement threshold is crossed, the dashboard:
    - Shows a red alert banner in the dashboard UI.
    - Sends a `classAlert` message to the background worker, which forwards it to the Meet tab.
    - Content script renders a glowing “CLASS ATTENTION!” overlay with inattentive vs focused counts and timestamp. [file:33][file:050b6e73-266f-4b6c-8f99-893b0fa6fb43]

- **Privacy‑first design**
  - All models and computations run locally inside the browser (Manifest V3 extension).
  - No raw video frames are uploaded; only aggregate engagement metadata is stored transiently. [file:31][file:82]

---

## 🧱 Architecture Overview

The system is split into four main pieces:

1. **Chrome Extension (Manifest V3)**  
   - `manifest.json` – declares permissions (`tabCapture`, `scripting`, `storage`, etc.), content scripts for `https://meet.google.com/*`, and the background service worker. [file:82]  
   - `background.js` – opens/closes the dashboard window, stores Meet participant names, and forwards `classAlert` messages between dashboard and content script. [file:47]

2. **Meet Content Script**  
   - `content.js` + `content.css` – injected into Google Meet:
     - Adds **Start Monitoring / See Results** buttons and toast notifications.
     - Scrapes participant names every few seconds and sends them to `background.js`.
     - Listens for `classAlert` messages and shows the big corner alert banner on the Meet screen. [file:050b6e73-266f-4b6c-8f99-893b0fa6fb43]

3. **Dashboard (Teacher UI)**  
   - `dashboard.html` – layout for video canvas, charts, live summary, and save/report controls.
   - `dashboard.js` – core engagement loop:
     - Captures the Meet tab using `getDisplayMedia`.
     - Loads face-api models (TinyFaceDetector, landmarks, expressions). [file:33]
     - Runs detection, EAR calculation, emotion analysis, engagement classification, alert checks, and chart updates in an interval loop.
     - Maintains student tracking and sends alerts to both dashboard UI and Meet. [file:33]

4. **Detector / Reporting Utilities (Optional)**  
   - `detector.js` – separate analysis module for screenshots / offline tests.
   - `server.js` – simple Node.js mock API to receive exported attendance/engagement reports. [file:44][file:33]

---

## 🚀 Getting Started (Developer Setup)

### 1. Clone the repo

