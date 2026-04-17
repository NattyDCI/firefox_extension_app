// Data shared with popup-sketch.js
window.popupClockData = {
  domain: "",
  sessionMs: 0,
  totalMs: 0
};

// Convert milliseconds into HH:MM:SS
function formatMs(ms) {
  const totalSeconds = Math.floor((ms || 0) / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// Format today's date in a short readable way
function getTodayLabel() {
  const today = new Date();
  return today.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

// Show the loading bar while the daily log is being fetched
function showLogProgress() {
  const progress = document.getElementById("logProgress");
  if (progress) {
    progress.classList.remove("hidden");
  }
}

// Hide the loading bar
function hideLogProgress() {
  const progress = document.getElementById("logProgress");
  if (progress) {
    progress.classList.add("hidden");
  }
}

// Refresh popup UI with latest data from background.js
async function refreshPopup() {
  try {
    const stats = await browser.runtime.sendMessage({ type: "GET_POPUP_STATS" });

    window.popupClockData = {
      domain: stats?.domain || "",
      sessionMs: stats?.sessionMs || 0,
      totalMs: stats?.totalMs || 0
    };

    const siteLabel = document.getElementById("siteLabel");
    const sessionLabel = document.getElementById("sessionLabel");
    const dateLabel = document.getElementById("dateLabel");

    if (siteLabel) {
      siteLabel.textContent = `Site: ${window.popupClockData.domain || "No active site"}`;
    }

    if (sessionLabel) {
      sessionLabel.textContent = `Session: ${formatMs(window.popupClockData.sessionMs)}`;
    }

    if (dateLabel) {
      dateLabel.textContent = `Today · ${getTodayLabel()}`;
    }
  } catch (err) {
    console.error("refreshPopup failed:", err);
  }
}

// Tracks whether the log is currently visible
let logVisible = false;

// Show or hide today's saved activity log
async function showTodayLog() {
  const output = document.getElementById("todayLogOutput");
  const button = document.getElementById("showTodayLog");

  if (!output || !button) return;

  if (logVisible) {
    output.textContent = "";
    output.style.display = "none";
    hideLogProgress();
    button.textContent = "Show today's log";
    logVisible = false;
    return;
  }

  try {
    output.style.display = "none";
    output.textContent = "";
    showLogProgress();

    await new Promise(resolve => setTimeout(resolve, 500));

    const response = await browser.runtime.sendMessage({ type: "GET_DAY_LOG" });
    const entries = response?.entries || {};

    const lines = Object.entries(entries)
      .sort((a, b) => b[1] - a[1])
      .map(([domain, ms]) => `${domain}: ${formatMs(ms)}`);

    output.textContent = lines.length
      ? lines.join("\n")
      : "No activity logged today.";

    hideLogProgress();
    output.style.display = "block";
    button.textContent = "Hide today's log";
    logVisible = true;

  } catch (err) {
    console.error("Show log failed:", err);
    hideLogProgress();
    output.textContent = `Error loading log: ${err.message}`;
    output.style.display = "block";
  }
}

// Reset today's stored time for the current domain
async function resetCurrentDomain() {
  try {
    await browser.runtime.sendMessage({ type: "RESET_CURRENT_DOMAIN" });
    await refreshPopup();

    const output = document.getElementById("todayLogOutput");
    const button = document.getElementById("showTodayLog");

    if (output) {
      output.textContent = "";
      output.style.display = "none";
    }

    if (button) {
      button.textContent = "Show today's log";
    }

    hideLogProgress();
    logVisible = false;
  } catch (err) {
    console.error("Reset failed:", err);
  }
}

// Set up event listeners once popup has loaded
document.addEventListener("DOMContentLoaded", () => {
  const showTodayLogBtn = document.getElementById("showTodayLog");
  const resetBtn = document.getElementById("reset");

  if (showTodayLogBtn) {
    showTodayLogBtn.addEventListener("click", showTodayLog);
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", resetCurrentDomain);
  }

  hideLogProgress();
  refreshPopup();

  // Update popup every second so the session stays live
  setInterval(refreshPopup, 1000);
});