const SERVER_URL = "http://localhost:3000"; 
// ^ If deploying to friends, this must be your PUBLIC IP or Domain (e.g., https://my-api.com)

// Run every 1 minute to check for work (Prevent spamming)
chrome.alarms.create("checkScheduler", { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "checkScheduler") {
        fetchTask();
    }
});

async function fetchTask() {
    try {
        // 1. Ask Server for URL
        const response = await fetch(`${SERVER_URL}/get-task`);
        const data = await response.json();

        if (data.task) {
            // 2. Open a new tab with that URL
            chrome.tabs.create({ url: data.task, active: true }, (tab) => {
                // 3. Inject a script to tell content.js to start scraping
                // We use storage to flag that this tab needs scraping
                chrome.storage.local.set({ [tab.id]: "SCRAPE_PENDING" });
            });
        } else {
            console.log("No tasks available.");
        }
    } catch (error) {
        console.error("Server error:", error);
    }
}

// Listen for messages from content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "DATA_COLLECTED") {
        // 4. Send data to server
        fetch(`${SERVER_URL}/submit-data`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request.payload)
        }).then(() => {
            // 5. Close the tab after success
            chrome.tabs.remove(sender.tab.id);
        });
    }
});