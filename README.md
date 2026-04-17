# Abstract Bauhaus Time Tracker

A Chrome extension that tracks how much time you spend on websites and visualizes it as a Bauhaus-inspired clock.

---

## 🧠 Concept

This project combines:

* **Productivity tracking** (time spent per site)
* **Data visualization** (clock-based representation)
* **Bauhaus design principles** (geometry, color, function-first design)

Instead of showing time as plain numbers, it transforms it into a dynamic visual system.

---

## ⚙️ How it works

### 1. Time Tracking

* The extension runs a background script (`background.js`)
* It detects the active tab using the Chrome Tabs API
* Time is stored using `chrome.storage.local`

Two types of time are tracked:

* **Session time** → time spent since opening the current tab
* **Total time (today)** → accumulated time per site for the current day

---

### 2. Popup UI

The popup (`popup-v2.html`) displays:

* Current site
* Session time
* Total time for the day
* A visual clock rendered with p5.js

---

### 3. Bauhaus Clock (p5.js)

The clock is drawn in `popup-sketch.js` using p5.js.

It visualizes time like this:

* 🔴 Outer red arc → seconds
* 🔵 Inner blue arc → minutes
* 🟡 Moving circle → seconds motion
* ⬛ Rotating rectangle → hours
* ⚪ Center circle → base layer

The clock represents **total time spent on the site today**, not just the current session.

---

### 4. Legend

The legend shows:

* Hours, minutes, seconds
* Based on **total stored time for the current day**

The digital time below the clock shows:

* **Session time only**

---

## 🎨 Design

Inspired by Bauhaus principles:

* Simple geometric shapes
* Primary colors (red, blue, yellow)
* High contrast
* Function over decoration

Typography uses:

* Custom fonts (Oswald, Bricolage Grotesque)

---

## 🧩 Technologies Used

* Chrome Extensions API
* JavaScript (ES6)
* p5.js
* HTML / CSS
* `chrome.storage.local`

---

## 📁 Project Structure

* `manifest.json` → extension configuration
* `background.js` → tracks time in the background
* `popup-v2.html` → popup layout
* `popup.js` → handles UI + data
* `popup-sketch.js` → draws the clock (p5.js)
* `css/style.css` → styling

---

## ⚠️ Challenge: Popup Not Loading (Firefox)

During development, the popup sometimes failed to open and showed errors like *“File not found”*. This happened because Firefox was using a **stale cached version** of the extension instead of the updated files.

### Root Cause

The issue was caused by a **stale temporary add-on state in Firefox**.

Even though the local files were updated, Firefox continued serving an **outdated internal version** of the extension using a `moz-extension://<uuid>/...` URL.

As a result:

* The popup path (`default_popup`) pointed to a file that **did not match the current filesystem**
* Firefox attempted to load a **non-existent or outdated resource**
* The popup never initialized, so its scripts did not run

---

### ✅ Fix

Reload the extension manually in Firefox:

1. Open `about:debugging#/runtime/this-firefox`
2. Click **“Load Temporary Add-on”**
3. Select your `manifest.json`

Alternatively, you can run:

```bash
npx web-ext run --source-dir .
```

This forces Firefox to load the **latest version** of the extension and resolves the issue.

---

## 🚀 Future Ideas

* Add daily logs visualization
* Compare time across sites
* Add subtle animations
* Optional weather/day context

---

## 🧪 Notes

* Time resets daily (based on local date)
* Data is stored locally in the browser
* No external APIs are required

---

## ✨ Author

Your Name
