# Facebook Scraping Extension

A distributed Chrome/Firefox extension for automated Facebook profile scraping with anti-ban protection.

## Quick Setup

### 1. Start Server
```bash
cd server
npm install
node index.js
```
Server runs on `http://localhost:3000`

### 2. Install Extension

#### Chrome
1. Open `chrome://extensions`
2. Enable "Developer mode" 
3. Click "Load unpacked"
4. Select the `extension` folder

#### Firefox
1. Open `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select `extension_mozilla/manifest.json`

#### Edge
1. Open `edge://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` folder

### 3. Usage
- Extension automatically polls server for tasks every 30 seconds
- Add Facebook URLs to scrape by editing `tasksQueue` in `server/index.js`
- Monitor progress at `http://localhost:3000/stats`
- View collected data at `http://localhost:3000/data`

## Features
- **Anti-ban protection**: Rate limiting, human behavior simulation
- **Distributed scraping**: Multiple browser instances for load distribution
- **Comprehensive data**: Posts, commenters, demographics extraction
- **Error handling**: Automatic retry and error logging
- **Data persistence**: JSON file storage with REST API

## Production Deployment
Change `SERVER_URL` in `background.js` to your hosted server endpoint before distribution.