// Facebook Scraper Content Script
console.log("Facebook Scraper loaded on page.");

// Configuration
const CONFIG = {
    SCROLL_PAUSE_TIME: 2000,
    MAX_SCROLLS: 10,
    COMMENT_LOAD_ATTEMPTS: 20,
    HUMAN_DELAY_MIN: 1000,
    HUMAN_DELAY_MAX: 3000,
    SESSION_MAX_ACTIONS: 50,
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    RATE_LIMIT_COOLDOWN: 5 * 60 * 1000, // 5 minutes
    BAN_COOLDOWN: 30 * 60 * 1000 // 30 minutes
};

// Session tracking
let sessionData = {
    startTime: Date.now(),
    actionCount: 0,
    lastActionTime: 0,
    userAgents: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
};

// Utility functions
function randomDelay(min = CONFIG.HUMAN_DELAY_MIN, max = CONFIG.HUMAN_DELAY_MAX) {
    return Math.random() * (max - min) + min;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function simulateHumanBehavior() {
    // Random mouse movements
    const actions = [
        () => {
            // Simulate mouse movement
            const event = new MouseEvent('mousemove', {
                clientX: Math.random() * window.innerWidth,
                clientY: Math.random() * window.innerHeight
            });
            document.dispatchEvent(event);
        },
        () => {
            // Random scroll
            const scrollAmount = (Math.random() - 0.5) * 400;
            window.scrollBy(0, scrollAmount);
        },
        () => {
            // Random pause
            return sleep(randomDelay(500, 1500));
        }
    ];

    const numActions = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numActions; i++) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        action();
    }
}

function rateLimitCheck() {
    const now = Date.now();

    // Reset session if too long
    if (now - sessionData.startTime > CONFIG.SESSION_TIMEOUT) {
        console.log("🔄 Session timeout - resetting counters");
        sessionData.startTime = now;
        sessionData.actionCount = 0;
    }

    // Check rate limit
    if (sessionData.actionCount >= CONFIG.SESSION_MAX_ACTIONS) {
        console.log(`🚦 Rate limit reached. Waiting ${CONFIG.RATE_LIMIT_COOLDOWN/1000}s...`);
        return new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_COOLDOWN))
            .then(() => {
                sessionData.actionCount = 0;
                sessionData.startTime = Date.now();
                return true;
            });
    }

    // Minimum delay between actions
    const timeSinceLastAction = now - sessionData.lastActionTime;
    const minDelay = randomDelay(3000, 8000);

    if (timeSinceLastAction < minDelay) {
        const waitTime = minDelay - timeSinceLastAction;
        return sleep(waitTime);
    }

    sessionData.lastActionTime = now;
    sessionData.actionCount++;
    return Promise.resolve(true);
}

function isValidProfileUrl(url, mode = 'strict') {
    if (!url || typeof url !== 'string') return false;
    if (!url.startsWith('http')) return false;
    if (!url.includes('facebook.com')) return false;

    if (mode === 'commenter') {
        const excludePatterns = [
            '/photo', '/video', '/watch', '/groups', '/events',
            '/pages', '/help', '/privacy', '/terms', '/ads',
            '/business', '/marketplace', '/gaming', '/saved',
            'comment_id=', 'reply_comment_id=', '/share/',
            'facebook.com/share', '/hashtag/', '/stories/',
            '/reel', '/p.php', '/l.php', '/onthisday', '/posts/',
            '/story.php', '/friends', '/login', '/checkpoint',
            '/settings', '/notifications', '/messages', '/bookmarks',
            '/ad_campaign', '/login_alerts', '/recover', '/security',
            '/policies', '/campaign', '/ajax', '/dialog', '/sharer',
            '/plugins', '/connect', 'ft_ent_identifier=', 'pfbid=',
            'fbid=', 'story_fbid=', '/dialog/', 'modal=', 'popup=',
            'photo.php', 'video.php', '/reels', '/reviews',
            '/mentions', '/tagged', '/photos', '/videos', '/live',
            '/shop', '/community', '/notes', '/offers', '/followers',
            '/following', '/likes', '/about', 'discover_public_figures',
            'public_figures'
        ];

        const urlLower = url.toLowerCase();
        for (const pattern of excludePatterns) {
            if (urlLower.includes(pattern)) return false;
        }

        try {
            const pathPart = url.split('facebook.com/')[1].split('/')[0].split('?')[0];
            return pathPart.length >= 3 && pathPart.length <= 50;
        } catch (e) {
            return false;
        }
    }

    // Strict validation
    const excludePatterns = [
        '/photo', '/video', '/watch', '/groups', '/events',
        '/pages', '/help', '/privacy', '/terms', '/ads',
        '/business', '/marketplace', '/gaming', '/saved',
        'comment_id=', 'reply_comment_id=', '/share/',
        'facebook.com/share', 'facebook.com/$', 'facebook.com/?',
        '/hashtag/', '/stories/', '/reel', '/p.php',
        '/l.php', '/onthisday', '/posts/', '/story.php',
        '/friends', '/login', '/checkpoint', '/settings',
        '/notifications', '/messages', '/bookmarks',
        '/ad_campaign', '/login_alerts', '/recover',
        '/security', '/policies', '/campaign', '/ajax',
        '/dialog', '/sharer', '/plugins', '/connect',
        'ft_ent_identifier=', 'pfbid=', 'fbid=', 'story_fbid=',
        '/dialog/', 'modal=', 'popup=', 'photo.php', 'video.php',
        '/followers', '/following', '/likes', '/about',
        'discover_public_figures', 'public_figures',
        '/reels', '/reviews', '/mentions', '/tagged',
        '/photos', '/videos', '/live', '/shop',
        '/community', '/notes', '/offers'
    ];

    const urlLower = url.toLowerCase();
    for (const pattern of excludePatterns) {
        if (urlLower.includes(pattern)) return false;
    }

    try {
        const cleanUrl = url.split('?')[0].split('#')[0].replace(/\/$/, '');
        if (cleanUrl.includes('facebook.com/')) {
            const pathParts = cleanUrl.split('facebook.com/')[1].split('/');
            const username = pathParts[0];

            const reserved = [
                'home', 'search', 'find-friends', 'people', 'pages',
                'latest', 'feed', 'browse', 'onthisday', 'events',
                'groups', 'watch', 'gaming', 'marketplace', 'saved',
                'messages', 'notifications', 'login', 'checkpoint',
                'settings', 'privacy', 'terms', 'about', 'ads',
                'business', 'help', 'developers', 'policies',
                'discover', 'discover_public_figures', 'public',
                'reel', 'reels', 'stories', 'live', 'shop'
            ];

            if (reserved.includes(username.toLowerCase())) return false;
            return username.length >= 3 && username.length <= 50;
        }
    } catch (e) {
        return false;
    }

    return false;
}

function cleanFacebookUrl(url) {
    try {
        let cleaned = url.split('?')[0].split('#')[0].replace(/\/$/, '');
        if (isValidProfileUrl(cleaned)) {
            return cleaned;
        }
    } catch (e) {}
    return null;
}

function extractPostUrl(postElement) {
    try {
        // Look for timestamp/permalink links
        const timestampLinks = postElement.querySelectorAll('a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid"]');
        for (const link of timestampLinks) {
            const href = link.getAttribute('href');
            if (href && href.includes('facebook.com')) {
                let cleanHref = href;
                if (!href.includes('story_fbid') && href.includes('?')) {
                    cleanHref = href.split('?')[0];
                }
                if (!href.includes('profile.php') || !href.includes('story_fbid')) {
                    return cleanHref;
                }
            }
        }

        // Look for aria-label time links
        const timeLinks = postElement.querySelectorAll('a[aria-label*="ago"], a[aria-label*="hour"], a[aria-label*="minute"]');
        for (const link of timeLinks) {
            const href = link.getAttribute('href');
            if (href && href.includes('facebook.com')) {
                let cleanHref = href;
                if (!href.includes('story_fbid') && href.includes('?')) {
                    cleanHref = href.split('?')[0];
                }
                return cleanHref;
            }
        }

        // Look for role links with post paths
        const roleLinks = postElement.querySelectorAll('a[role="link"][href*="/posts/"], a[role="link"][href*="/permalink/"], a[role="link"][href*="story.php"]');
        if (roleLinks.length > 0) {
            const href = roleLinks[0].getAttribute('href');
            if (href && href.includes('facebook.com')) {
                let cleanHref = href;
                if (!href.includes('story_fbid') && href.includes('?')) {
                    cleanHref = href.split('?')[0];
                }
                return cleanHref;
            }
        }

        // Fallback: check all links
        const allLinks = postElement.querySelectorAll('a');
        for (const link of allLinks.slice(0, 10)) {
            const href = link.getAttribute('href');
            if (href && href.includes('facebook.com')) {
                const patterns = ['/posts/', '/permalink/', 'story_fbid=', '/photo/', '/video/'];
                if (patterns.some(pattern => href.includes(pattern))) {
                    let cleanHref = href;
                    if (!href.includes('story_fbid') && href.includes('?')) {
                        cleanHref = href.split('?')[0];
                    }
                    return cleanHref;
                }
            }
        }

        return null;
    } catch (e) {
        console.error('Error extracting post URL:', e);
        return null;
    }
}

async function scrapePosts(maxPosts = 5) {
    console.log(`📄 Scraping up to ${maxPosts} posts...`);

    const posts = [];
    const seenUrls = new Set();
    const seenContent = new Set();

    // Scroll to load posts
    let scrollAttempts = 0;
    let lastHeight = document.body.scrollHeight;

    while (posts.length < maxPosts && scrollAttempts < CONFIG.MAX_SCROLLS) {
        scrollAttempts++;

        // Find post elements
        const postSelectors = [
            'div[role="article"]',
            'div[data-pagelet*="FeedUnit"]',
            'div.x1yztbdb',
            'div.x78zum5.x1n2onr6'
        ];

        let postElements = [];
        for (const selector of postSelectors) {
            postElements = postElements.concat([...document.querySelectorAll(selector)]);
        }

        // Process posts
        for (const element of postElements) {
            if (posts.length >= maxPosts) break;

            try {
                const text = element.textContent.trim();
                if (text.length < 20) continue;

                // Clean text
                const cleanText = text.replace(/\n/g, ' ').trim().substring(0, 500);

                if (seenContent.has(cleanText)) continue;

                // Extract post URL
                const postUrl = extractPostUrl(element);
                if (!postUrl) continue;

                if (seenUrls.has(postUrl)) continue;

                seenContent.add(cleanText);
                seenUrls.add(postUrl);

                posts.push({
                    content: cleanText,
                    url: postUrl
                });

                console.log(`   📝 Scraped post ${posts.length}: ${cleanText.substring(0, 100)}...`);

            } catch (e) {
                console.error('Error processing post:', e);
            }
        }

        if (posts.length >= maxPosts) break;

        // Scroll down
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.SCROLL_PAUSE_TIME);

        const newHeight = document.body.scrollHeight;
        if (newHeight === lastHeight) break;
        lastHeight = newHeight;
    }

    console.log(`✅ Scraped ${posts.length} posts`);
    return posts;
}

async function scrapeTopCommenters(postUrl, topN = 5) {
    console.log(`📝 Scraping top ${topN} commenters from post...`);

    // Navigate to post (request background script to do this)
    chrome.runtime.sendMessage({
        type: "NAVIGATE_TO_URL",
        url: postUrl
    });

    // Wait for navigation
    await sleep(3000);

    // Try to set filter to "All comments"
    const filterSelectors = [
        'div[role="button"] span:contains("Most relevant")',
        'div[role="button"] span:contains("Newest")',
        'div[role="button"] span:contains("All comments")',
        'div[aria-label*="Filter comments"]',
        'span:contains("Sort by")',
        'div.x1rg5ohu div[role="button"]'
    ];

    for (const selector of filterSelectors) {
        try {
            const elements = document.querySelectorAll(selector.replace(':contains', ':has-text'));
            if (elements.length > 0) {
                elements[0].click();
                await sleep(2000);

                const allCommentsOpts = document.querySelectorAll('div[role="menuitemradio"] span:contains("All comments"), div[role="menuitem"] span:contains("All comments")');
                if (allCommentsOpts.length > 0) {
                    allCommentsOpts[allCommentsOpts.length - 1].click();
                    console.log('   ✅ Selected "All comments"');
                    await sleep(3000);
                    break;
                }
            }
        } catch (e) {}
    }

    // Load comments
    console.log(`   LOADING: Aiming for ${topN * 20} visible comments...`);

    for (let scrollIdx = 0; scrollIdx < CONFIG.COMMENT_LOAD_ATTEMPTS; scrollIdx++) {
        // Click "View more comments" buttons
        const viewMoreSelectors = [
            'span:contains("View more")',
            'div[role="button"] span:contains("View")',
            'span:contains("previous comments")',
            'div.x1i10hfl.xjqpnuy span:contains("View")',
            'span:contains("more comments")',
            'div:contains("View more comments")',
            'a:contains("View more comments")'
        ];

        for (const selector of viewMoreSelectors) {
            try {
                const buttons = document.querySelectorAll(selector.replace(':contains', ':has-text'));
                for (const btn of buttons) {
                    if (btn.offsetParent !== null) { // Visible
                        btn.scrollIntoView({ block: 'center' });
                        await sleep(500);
                        btn.click();
                        console.log(`   👆 Clicked 'View more' button (scroll ${scrollIdx + 1})`);
                        await sleep(1500);
                    }
                }
            } catch (e) {}
        }

        // Expand replies
        try {
            const replySelectors = [
                'span:contains("repl")',
                'div[aria-label*="Reply"]',
                'span:contains("Reply")',
                'div.x1i10hfl.x1qjc9v5'
            ];

            for (const selector of replySelectors) {
                const replyButtons = document.querySelectorAll(selector.replace(':contains', ':has-text'));
                for (const btn of replyButtons.slice(0, 30)) {
                    if (btn.offsetParent !== null) {
                        btn.scrollIntoView({ block: 'center' });
                        await sleep(300);
                        btn.click();
                        await sleep(800);
                    }
                }
            }
        } catch (e) {}

        // Scroll in patterns
        window.scrollTo(0, document.body.scrollHeight * 0.9);
        await sleep(1000);
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(1000);

        // Scroll to comments section
        try {
            const commentSections = document.querySelectorAll('div[aria-label*="Comment"], div[role="article"], div.x1qjc9v5');
            if (commentSections.length > 0) {
                commentSections[0].scrollIntoView();
                await sleep(1000);
            }
        } catch (e) {}

        // Check progress
        try {
            const comments = document.querySelectorAll(
                'div[aria-label*="Comment"], div[role="article"].x1qjc9v5, div.x1r8uery, div.x1yztbdb, div.x1qjc9v5, div.x1n2onr6.x1ja2u2z'
            );

            console.log(`   📊 Progress: ${comments.length} comments loaded...`);

            if (comments.length >= topN * 20) {
                console.log(`   ✅ Loaded ${comments.length} comments (target reached)`);
                break;
            }
        } catch (e) {
            console.error('Progress check error:', e);
        }
    }

    await sleep(2000); // Final settle

    // Extract commenters
    console.log('   🔍 Extracting commenters...');
    const commenters = {};

    // Method 1: Extract from all visible elements
    try {
        const allDivs = document.querySelectorAll('div');
        for (const div of allDivs) {
            const links = div.querySelectorAll('a');
            for (const link of links.slice(0, 3)) {
                const href = link.getAttribute('href');
                const text = link.textContent.trim();

                if (!href) continue;

                if (isValidProfileUrl(href, 'commenter')) {
                    // Skip timestamps
                    const textLower = text.toLowerCase();
                    const timestampIndicators = ['just now', 'yesterday', 'moments ago', 'minute', 'hour', 'day', 'week', 'month', 'year', 's', 'm', 'h', 'd', 'w', 'ago'];
                    const isTimestamp = timestampIndicators.some(indicator => textLower.includes(indicator) && text.length < 20);

                    if (isTimestamp) continue;

                    if (!text || text.length < 2 || text.length > 100) continue;

                    const skipTexts = ['like', 'reply', 'share', 'comment', 'send', 'more'];
                    if (skipTexts.some(skip => textLower.includes(skip))) continue;

                    const cleanUrl = cleanFacebookUrl(href);
                    if (cleanUrl) {
                        if (!commenters[cleanUrl]) {
                            commenters[cleanUrl] = { url: cleanUrl, name: text, count: 1 };
                        } else {
                            commenters[cleanUrl].count++;
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error('Div extraction error:', e);
    }

    // Sort by frequency and get top N
    const sortedCommenters = Object.values(commenters).sort((a, b) => b.count - a.count);
    const topCommenters = sortedCommenters.slice(0, topN);

    console.log(`✅ Found ${topCommenters.length} commenters`);
    topCommenters.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.name} (${c.count}x)`);
    });

    return topCommenters.map(c => c.url);
}

async function extractUserDemographics(profileUrl) {
    console.log(`🔍 Extracting demographics from ${profileUrl}`);

    // Navigate to profile
    chrome.runtime.sendMessage({
        type: "NAVIGATE_TO_URL",
        url: profileUrl
    });

    await sleep(3000);

    const demographics = {
        profile_name: null,
        gender: null,
        friends_count: null,
        location: null,
        profile_url: profileUrl,
        join_date: null,
        education: null,
        work: null,
        relationship_status: null
    };

    // Get profile name
    const nameSelectors = [
        'h1',
        'span[dir="auto"]',
        'title',
        'div.x1i10hfl span',
        'div.x1qjc9v5 span'
    ];

    for (const selector of nameSelectors) {
        try {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const text = element.textContent.trim();
                if (text && text.length > 1 && text.length < 100) {
                    const cleanName = text.split('|')[0].split('-')[0].split('·')[0].trim();
                    if (cleanName && cleanName.length > 1) {
                        demographics.profile_name = cleanName.substring(0, 80);
                        break;
                    }
                }
            }
            if (demographics.profile_name) break;
        } catch (e) {}
    }

    // Extract from page text
    try {
        const pageText = document.body.textContent.toLowerCase();

        // Gender detection
        if (pageText.includes('male') || pageText.includes('पुरुष')) {
            demographics.gender = 'Male';
        } else if (pageText.includes('female') || pageText.includes('महिला')) {
            demographics.gender = 'Female';
        }

        // Location extraction
        const locationPatterns = [
            /lives in\s+([^\n]+)/,
            /from\s+([^\n]+)/,
            /लाईभ्ज् इन्\s+([^\n]+)/,
            /बाट\s+([^\n]+)/,
            /काठमाडौं|kathmandu|pokhara|biratnagar|lalitpur|bhaktapur/
        ];

        for (const pattern of locationPatterns) {
            const match = pageText.match(pattern);
            if (match) {
                demographics.location = match[1] ? match[1].trim().substring(0, 100) : match[0].substring(0, 100);
                break;
            }
        }

        // Friends count
        const friendsPatterns = [
            /(\d+[\d,]*) friends/,
            /(\d+[\d,]*) मित्र/,
            /friends\s*(\d+[\d,]*)/,
            /मित्र\s*(\d+[\d,]*)/
        ];

        for (const pattern of friendsPatterns) {
            const match = pageText.match(pattern);
            if (match) {
                const countStr = match[1].replace(/,/g, '').replace(/\./g, '');
                if (!isNaN(countStr)) {
                    demographics.friends_count = parseInt(countStr);
                    break;
                }
            }
        }

        // Join date
        const joinPatterns = [
            /joined facebook in\s*(\d{4})/,
            /facebook मा\s*(\d{4})/,
            /since\s*(\d{4})/
        ];

        for (const pattern of joinPatterns) {
            const match = pageText.match(pattern);
            if (match) {
                demographics.join_date = match[1];
                break;
            }
        }

    } catch (e) {
        console.error('Error extracting from page text:', e);
    }

    console.log(`✅ Demographics extracted for ${demographics.profile_name || 'Unknown'}`);
    return demographics;
}

async function runScrapingPipeline(targetUrl, postsToScrape = 5, topCommenters = 5) {
    console.log(`🚀 Starting scraping pipeline for: ${targetUrl}`);

    try {
        // Check login status
        if (window.location.href.includes('login') || window.location.href.includes('checkpoint')) {
            console.log('❌ Login required - pausing');
            return { error: 'LOGIN_REQUIRED' };
        }

        // Get logged-in user
        const loggedInUser = await getLoggedInProfileUrl();
        console.log(`👤 Logged in as: ${loggedInUser || 'Unknown'}`);

        // Scrape posts
        console.log(`📄 Scraping posts from ${targetUrl}...`);
        const targetPosts = await scrapePosts(postsToScrape);
        console.log(`✅ Scraped ${targetPosts.length} posts`);

        const allCommenters = {};

        // Scrape commenters from each post
        for (let i = 0; i < targetPosts.length; i++) {
            console.log(`--- Processing Post ${i + 1}/${targetPosts.length} ---`);

            const postUrl = targetPosts[i].url;
            if (!postUrl || postUrl === targetUrl) continue;

            console.log(`   🔗 Scraping from: ${postUrl.substring(0, 80)}...`);

            const commenters = await scrapeTopCommenters(postUrl, topCommenters);

            for (const commenterUrl of commenters) {
                if (loggedInUser && commenterUrl.includes(loggedInUser)) continue;

                if (!allCommenters[commenterUrl]) {
                    allCommenters[commenterUrl] = { profile_url: commenterUrl, post_count: 1 };
                } else {
                    allCommenters[commenterUrl].post_count++;
                }
            }
        }

        console.log(`📋 Found ${Object.keys(allCommenters).length} unique commenters`);

        // Analyze top commenters
        const results = [];
        const commenterUrls = Object.keys(allCommenters).slice(0, 10); // Limit to top 10

        for (let i = 0; i < commenterUrls.length; i++) {
            const url = commenterUrls[i];
            console.log(`🔍 Analyzing commenter ${i + 1}/${commenterUrls.length}`);

            try {
                const demographics = await extractUserDemographics(url);
                const result = {
                    profile_url: url,
                    profile_name: demographics.profile_name || url.split('/').pop(),
                    demographics: demographics,
                    post_count: 0,
                    appears_in_target_posts: allCommenters[url].post_count,
                    raw_posts: []
                };
                results.push(result);

                // Rate limiting delay
                await rateLimitCheck();
                await sleep(randomDelay());

            } catch (e) {
                console.error('Analysis error:', e);
            }
        }

        console.log(`✅ Pipeline completed: ${results.length} users analyzed`);

        return {
            target_url: targetUrl,
            posts_scraped: targetPosts.length,
            commenters_found: Object.keys(allCommenters).length,
            results: results,
            scraped_at: new Date().toISOString()
        };

    } catch (e) {
        console.error('Pipeline error:', e);
        return { error: e.message };
    }
}

async function getLoggedInProfileUrl() {
    try {
        // Try various selectors for profile link
        const selectors = [
            'a[href*="/me/"]',
            'a[href*="profile.php"]',
            'a[aria-label*="Profile"]',
            'div[aria-label*="Account"] a[href*="facebook.com"]',
            'a span:contains("Profile")'
        ];

        for (const selector of selectors) {
            try {
                const elements = document.querySelectorAll(selector.replace(':contains', ':has-text'));
                for (const element of elements) {
                    const href = element.getAttribute('href');
                    if (href && isValidProfileUrl(href)) {
                        const cleanUrl = cleanFacebookUrl(href);
                        if (cleanUrl) {
                            console.log(`🔍 Found logged-in profile: ${cleanUrl}`);
                            return cleanUrl;
                        }
                    }
                }
            } catch (e) {}
        }

        // Try /me redirect
        try {
            // This would need background script help for navigation
            console.log('🔍 Could not detect logged-in profile URL');
            return null;
        } catch (e) {}

    } catch (e) {
        console.error('Error getting logged-in profile:', e);
    }
    return null;
}

// Main scraping function
async function startScraping() {
    console.log("Starting Facebook scraping process...");

    // Wait for page load
    await sleep(5000);

    // Check if we're on Facebook
    if (!window.location.href.includes('facebook.com')) {
        console.log('Not on Facebook - skipping');
        return;
    }

    // Check for login issues
    if (window.location.href.includes('login') || window.location.href.includes('checkpoint')) {
        console.log('Login required - sending error');
        chrome.runtime.sendMessage({
            type: "SCRAPING_ERROR",
            error: "LOGIN_REQUIRED",
            url: window.location.href
        });
        return;
    }

    try {
        // Simulate human behavior
        await simulateHumanBehavior();
        await rateLimitCheck();

        // Determine scraping type based on URL
        const currentUrl = window.location.href;

        if (isValidProfileUrl(currentUrl)) {
            // Profile scraping
            console.log('Profile detected - running full pipeline');
            const result = await runScrapingPipeline(currentUrl, 5, 5);

            chrome.runtime.sendMessage({
                type: "DATA_COLLECTED",
                payload: result
            });

        } else {
            // Generic page scraping
            console.log('Generic page - extracting basic data');
            const name = document.title;
            const rawBodyText = document.body.textContent;
            const emailMatch = rawBodyText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
            const email = emailMatch ? emailMatch[0] : "Not found";

            const payload = {
                url: currentUrl,
                name: name,
                email: email,
                raw_text: rawBodyText.substring(0, 1000),
                scraped_at: new Date().toISOString()
            };

            chrome.runtime.sendMessage({
                type: "DATA_COLLECTED",
                payload: payload
            });
        }

    } catch (e) {
        console.error('Scraping error:', e);
        chrome.runtime.sendMessage({
            type: "SCRAPING_ERROR",
            error: e.message,
            url: window.location.href
        });
    }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "START_SCRAPING") {
        startScraping();
    }
});

// Auto-start on Facebook pages
if (window.location.href.includes('facebook.com')) {
    window.addEventListener('load', () => {
        setTimeout(startScraping, 3000);
    });
}