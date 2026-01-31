const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

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
let errorLogs = [];

// Data storage
const DATA_FILE = path.join(__dirname, 'collected_data.json');
const ERRORS_FILE = path.join(__dirname, 'error_logs.json');

// Load existing data on startup
try {
    if (fs.existsSync(DATA_FILE)) {
        collectedData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        console.log(`Loaded ${collectedData.length} existing data entries`);
    }
} catch (e) {
    console.error('Error loading data file:', e);
}

try {
    if (fs.existsSync(ERRORS_FILE)) {
        errorLogs = JSON.parse(fs.readFileSync(ERRORS_FILE, 'utf8'));
        console.log(`Loaded ${errorLogs.length} existing error logs`);
    }
} catch (e) {
    console.error('Error loading errors file:', e);
}

// Save data to file
function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(collectedData, null, 2));
        console.log(`💾 Saved ${collectedData.length} data entries`);
    } catch (e) {
        console.error('Error saving data:', e);
    }
}

function saveErrors() {
    try {
        fs.writeFileSync(ERRORS_FILE, JSON.stringify(errorLogs, null, 2));
        console.log(`💾 Saved ${errorLogs.length} error logs`);
    } catch (e) {
        console.error('Error saving errors:', e);
    }
}

// --- API ENDPOINTS ---

// 1. Extension asks: "Give me a job"
app.get('/get-task', (req, res) => {
    if (tasksQueue.length === 0) {
        return res.json({ task: null });
    }
    const url = tasksQueue.shift(); // Remove first URL from list
    console.log(`📋 Assigning task: ${url}`);
    res.json({ task: url });
});

// 2. Extension says: "Here is the data"
app.post('/submit-data', (req, res) => {
    const data = req.body;
    console.log("📥 Received scraping data:", {
        target_url: data.target_url,
        posts_scraped: data.posts_scraped,
        commenters_found: data.commenters_found,
        results_count: data.results ? data.results.length : 0
    });

    // Add timestamp if not present
    if (!data.received_at) {
        data.received_at = new Date().toISOString();
    }

    collectedData.push(data);
    saveData();

    res.json({ status: "success", message: "Data stored successfully" });
});

// 3. Extension reports an error
app.post('/submit-error', (req, res) => {
    const errorData = req.body;
    console.log("❌ Received error report:", errorData);

    errorData.received_at = new Date().toISOString();
    errorLogs.push(errorData);
    saveErrors();

    res.json({ status: "success", message: "Error logged" });
});

// 4. Get statistics
app.get('/stats', (req, res) => {
    const stats = {
        total_tasks_processed: collectedData.length,
        total_errors: errorLogs.length,
        tasks_remaining: tasksQueue.length,
        last_updated: new Date().toISOString(),
        recent_data: collectedData.slice(-5), // Last 5 entries
        recent_errors: errorLogs.slice(-5) // Last 5 errors
    };
    res.json(stats);
});

// 5. Get all collected data
app.get('/data', (req, res) => {
    res.json({
        count: collectedData.length,
        data: collectedData
    });
});

// 6. Get error logs
app.get('/errors', (req, res) => {
    res.json({
        count: errorLogs.length,
        errors: errorLogs
    });
});

// 7. Add new tasks (for manual addition)
app.post('/add-tasks', (req, res) => {
    const { urls } = req.body;
    if (!Array.isArray(urls)) {
        return res.status(400).json({ error: "URLs must be an array" });
    }

    const validUrls = urls.filter(url =>
        url && typeof url === 'string' && url.includes('facebook.com')
    );

    tasksQueue.push(...validUrls);
    console.log(`➕ Added ${validUrls.length} new tasks`);

    res.json({
        status: "success",
        added: validUrls.length,
        queue_length: tasksQueue.length
    });
});

// 8. Clear data (for testing)
app.post('/clear-data', (req, res) => {
    collectedData = [];
    errorLogs = [];
    saveData();
    saveErrors();
    console.log("🗑️ Cleared all data");
    res.json({ status: "success", message: "Data cleared" });
});

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
        <h1>Facebook Scraper Server</h1>
        <p>Status: Running</p>
        <p>Data collected: ${collectedData.length}</p>
        <p>Errors logged: ${errorLogs.length}</p>
        <p>Tasks remaining: ${tasksQueue.length}</p>
        <br>
        <a href="/stats">View Statistics</a> |
        <a href="/data">View Data</a> |
        <a href="/errors">View Errors</a>
    `);
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 View stats at http://localhost:${PORT}/stats`);
});