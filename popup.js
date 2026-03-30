window.popupClockData = {
  domain: "",
  sessionMs: 0,
  totalMs: 0
};

function formatMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

async function debugStorageToPage() {
  try {
    const all = await browser.runtime.sendMessage({
      type: "GET_DEBUG_STORAGE"
    });

    const pre = document.getElementById("debugOutput");
    if (pre) {
      pre.textContent = JSON.stringify(all, null, 2);
    }
  } catch (err) {
    const pre = document.getElementById("debugOutput");
    if (pre) {
      pre.textContent = "DEBUG ERROR: " + err.message;
    }
  }
}

async function refreshPopup() {
  try {
    const stats = await browser.runtime.sendMessage({
      type: "GET_POPUP_STATS"
    });

    window.popupClockData = {
      domain: stats?.domain || "",
      sessionMs: stats?.sessionMs || 0,
      totalMs: stats?.totalMs || 0
    };

    document.getElementById("siteLabel").textContent =
      `Site: ${window.popupClockData.domain || "No active site"}`;

    document.getElementById("sessionLabel").textContent =
      `Session: ${formatMs(window.popupClockData.sessionMs)}`;

    document.getElementById("totalLabel").textContent =
      `Total: ${formatMs(window.popupClockData.totalMs)}`;

    document.getElementById("reset").disabled = !window.popupClockData.domain;
  } catch (err) {
    console.error("Popup refresh failed:", err);
    document.getElementById("siteLabel").textContent = "Site: error";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const resetBtn = document.getElementById("reset");
  const debugBtn = document.getElementById("debug");
  const cleanBtn = document.getElementById("clean");

  resetBtn.addEventListener("click", async () => {
    try {
      await browser.runtime.sendMessage({
        type: "RESET_CURRENT_DOMAIN"
      });
      await refreshPopup();
      await debugStorageToPage();
    } catch (err) {
      console.error("Reset failed:", err);
    }
  });

  debugBtn.addEventListener("click", async () => {
    await debugStorageToPage();
  });

  cleanBtn.addEventListener("click", async () => {
    try {
      const result = await browser.runtime.sendMessage({
        type: "CLEAN_OLD_KEYS"
      });

      await debugStorageToPage();

      const pre = document.getElementById("debugOutput");
      if (pre) {
        pre.textContent =
          `Removed keys:\n${JSON.stringify(result.removed, null, 2)}\n\n` +
          pre.textContent;
      }
    } catch (err) {
      console.error("Clean old keys failed:", err);
    }
  });

  refreshPopup();
  debugStorageToPage();

  setInterval(async () => {
    await refreshPopup();
  }, 1000);
});