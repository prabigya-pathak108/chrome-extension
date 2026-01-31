const SERVER_URL = "http://localhost:3000"; 
// const SERVER_URL = "https://chrome-extension-v97t.onrender.com";
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

// Handle navigation requests from content script
function handleNavigationRequest(request, sender, sendResponse) {
    if (request.type === "NAVIGATE_TO_URL") {
        chrome.tabs.update(sender.tab.id, { url: request.url }, (tab) => {
            if (chrome.runtime.lastError) {
                console.error("Navigation error:", chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ success: true });
            }
        });
        return true; // Will respond asynchronously
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
        })
        .then(response => response.json())
        .then(() => {
            console.log("Data submitted successfully");
            // 5. Close the tab after success
            chrome.tabs.remove(sender.tab.id);
        })
        .catch(error => {
            console.error("Error submitting data:", error);
            // Don't close tab on error, let user handle it
        });
        
    } else if (request.type === "SCRAPING_ERROR") {
        console.error("Scraping error:", request.error, "URL:", request.url);
        // Handle scraping errors - could notify server or retry
        fetch(`${SERVER_URL}/submit-error`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                error: request.error,
                url: request.url,
                timestamp: new Date().toISOString()
            })
        }).catch(err => console.error("Error reporting scraping error:", err));
        
        // Close tab on error after a delay
        setTimeout(() => {
            chrome.tabs.remove(sender.tab.id);
        }, 5000);
        
    } else if (request.type === "NAVIGATE_TO_URL") {
        return handleNavigationRequest(request, sender, sendResponse);
    }
});

// Listen for tab updates to trigger scraping when page loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('facebook.com')) {
        // Check if this tab was created for scraping
        chrome.storage.local.get([tabId.toString()], (result) => {
            if (result[tabId]) {
                // Clear the flag
                chrome.storage.local.remove([tabId.toString()]);
                
                // Tell content script to start scraping
                chrome.tabs.sendMessage(tabId, { type: "START_SCRAPING" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error sending start message:", chrome.runtime.lastError);
                    }
                });
            }
        });
    }
});