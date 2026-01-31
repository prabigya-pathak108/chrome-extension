console.log("Scraper loaded on page.");

// Wait for page to fully load
window.addEventListener('load', () => {
    setTimeout(startScraping, 5000); // Wait 5 seconds for Facebook to render completely
});

async function startScraping() {
    console.log("Starting scrape process...");

    // 1. Human Simulation: Scroll to bottom to trigger lazy loading
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 2000)); // Wait 2s
    window.scrollTo(0, 0); // Scroll back up

    // 2. Extract Data (This is the TRICKY part - selectors might need changing)
    // We try to grab the Page Title as the name for safety
    const name = document.title; 
    
    // Example: Try to find text that looks like a follower count or intro
    // Since FB classes are random strings like "x1lliihq", we just dump the body text
    // A smarter way is to look for specific ARIA labels
    const rawBodyText = document.body.innerText; 
    
    // Simple logic to find email (regex)
    const emailMatch = rawBodyText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    const email = emailMatch ? emailMatch[0] : "Not found";

    const payload = {
        url: window.location.href,
        name: name,
        email: email,
        scraped_at: new Date().toISOString()
    };

    console.log("Scraped:", payload);

    // 3. Send data back to Background Script
    chrome.runtime.sendMessage({
        type: "DATA_COLLECTED",
        payload: payload
    });
}