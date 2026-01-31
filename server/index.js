const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors()); // Allow extensions to talk to us
app.use(bodyParser.json());

// --- DATABASE SIMULATION ---
// In real life, fetch this from MongoDB/MySQL
let tasksQueue = [
    "https://www.facebook.com/zuck",
    "https://www.facebook.com/meta",
    // Add more URLs here
];

let collectedData = [];

// --- API ENDPOINTS ---

// 1. Extension asks: "Give me a job"
app.get('/get-task', (req, res) => {
    if (tasksQueue.length === 0) {
        return res.json({ task: null });
    }
    const url = tasksQueue.shift(); // Remove first URL from list
    console.log(`Assigning task: ${url}`);
    res.json({ task: url });
});

// 2. Extension says: "Here is the data"
app.post('/submit-data', (req, res) => {
    const data = req.body;
    console.log("Received Data:", data);
    collectedData.push(data);
    
    // Save to file or DB here
    
    res.json({ status: "success" });
});

const PORT = 3000;
app.get('/', (req, res) => {
    res.send('<h1>Server is Running!</h1><p>The scraping bot is active.</p>');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});