const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Mock student roster with face descriptors (128-dim vectors)
app.get('/api/students', (req, res) => {
  res.json([
    { label: "Student1", descriptor: new Array(128).fill(0.5) },
    { label: "Student2", descriptor: new Array(128).fill(0.6) },
    { label: "Student3", descriptor: new Array(128).fill(0.4) }
  ]);
});

app.post('/api/attendance', (req, res) => {
  const { presentStudentNames } = req.body;
  console.log('Attendance saved:', presentStudentNames);
  res.json({ message: `${presentStudentNames.length} students marked present` });
});

app.listen(port, () => {
  console.log(`Smart Classroom API running at http://localhost:${port}`);
});
app.post('/api/frames', (req, res) => {
  console.log('📸 Frame:', req.body.timestamp, 'Lazy:', req.body.lazyCount);
  res.json({ success: true });
});

app.post('/api/alerts', (req, res) => {
  console.log('🚨', req.body.message);
  res.json({ success: true });
});