// quick check so I know the background script actually loaded
console.log("loaded background.js");

// storage keys
// STATE_KEY = what's currently being tracked live
// LOGS_KEY = accumulated time per day / per domain
const STATE_KEY = "__tracker_state__";
const LOGS_KEY = "__tracker_logs__";

// build a day key like 2026-04-17
// this lets me group saved time by day
function getDayKey(timestamp = Date.now()) {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// get just the hostname from a URL
// only regular web pages should count
function getDomain(url) {
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return u.hostname;
    }
    return null;
  } catch {
    return null;
  }
}

// current live tracking state
// if nothing exists yet, start with an empty state object
async function getState() {
  const result = await browser.storage.local.get(STATE_KEY);
  return result[STATE_KEY] || {
    activeTabId: null,
    activeDomain: null,
    sessionStart: null
  };
}

// save current live state
async function setState(state) {
  await browser.storage.local.set({
    [STATE_KEY]: state
  });
}

// read the full saved log object
// structure is basically logs[dayKey][domain] = timeInMs
async function getLogs() {
  const result = await browser.storage.local.get(LOGS_KEY);
  return result[LOGS_KEY] || {};
}

// save updated logs back into storage
async function setLogs(logs) {
  await browser.storage.local.set({
    [LOGS_KEY]: logs
  });
}

// get saved total for one domain on one day
async function getSavedTimeForDay(domain, dayKey = getDayKey()) {
  if (!domain) return 0;

  const logs = await getLogs();
  return logs[dayKey]?.[domain] || 0;
}

// add elapsed time to a domain for the correct day
async function saveTimeForDomain(domain, ms, timestamp = Date.now()) {
  if (!domain || ms <= 0) return;

  const dayKey = getDayKey(timestamp);
  const logs = await getLogs();

  // create the day bucket if it doesn't exist yet
  if (!logs[dayKey]) {
    logs[dayKey] = {};
  }

  const previous = logs[dayKey][domain] || 0;
  const updated = previous + ms;
  logs[dayKey][domain] = updated;

  await setLogs(logs);

  console.log("Saved time:", { dayKey, domain, ms, previous, updated });
}

// save the current live session before leaving it
// this happens when switching tabs, closing tab, losing browser focus, etc.
async function saveCurrentSession() {
  const state = await getState();

  // nothing active, nothing to save
  if (!state.activeDomain || state.sessionStart === null) {
    return;
  }

  const now = Date.now();
  const elapsed = now - state.sessionStart;

  // only save valid positive time
  if (elapsed > 0) {
    await saveTimeForDomain(state.activeDomain, elapsed, now);
  }

  // clear live tracking state after saving
  await setState({
    activeTabId: null,
    activeDomain: null,
    sessionStart: null
  });
}

// start tracking the currently active tab
async function startTrackingTab(tab) {
  if (!tab) return;

  const domain = getDomain(tab.url);
  const oldState = await getState();

  // if it's not a normal website tab, stop tracking the old one
  if (!domain) {
    await saveCurrentSession();
    return;
  }

  // if we're already tracking this exact tab/domain, do nothing
  if (
    oldState.activeTabId === tab.id &&
    oldState.activeDomain === domain &&
    oldState.sessionStart !== null
  ) {
    return;
  }

  // before switching, save whatever was being tracked before
  if (oldState.activeDomain && oldState.sessionStart !== null) {
    const now = Date.now();
    const elapsed = now - oldState.sessionStart;

    if (elapsed > 0) {
      await saveTimeForDomain(oldState.activeDomain, elapsed, now);
    }
  }

  // start a new live session from now
  await setState({
    activeTabId: tab.id,
    activeDomain: domain,
    sessionStart: Date.now()
  });

  console.log("Now tracking:", domain);
}

// get the active tab from the window the user is actually focused on
async function getCurrentActiveTab() {
  const tabs = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true
  });

  return tabs[0] || null;
}

// user switched tabs
browser.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await browser.tabs.get(tabId);
    await startTrackingTab(tab);
  } catch (err) {
    console.error("onActivated error:", err);
  }
});

// active tab finished loading
// useful when the same tab changes URL
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    if (tab.active && changeInfo.status === "complete") {
      await startTrackingTab(tab);
    }
  } catch (err) {
    console.error("onUpdated error:", err);
  }
});

// browser focus changed
// if the browser loses focus completely, save current session
// when focus comes back, resume tracking on the active tab
browser.windows.onFocusChanged.addListener(async (windowId) => {
  try {
    if (windowId === browser.windows.WINDOW_ID_NONE) {
      await saveCurrentSession();
      return;
    }

    const tab = await getCurrentActiveTab();
    await startTrackingTab(tab);
  } catch (err) {
    console.error("onFocusChanged error:", err);
  }
});

// tracked tab got closed
browser.tabs.onRemoved.addListener(async (tabId) => {
  try {
    const state = await getState();

    if (state.activeTabId === tabId) {
      await saveCurrentSession();
    }
  } catch (err) {
    console.error("onRemoved error:", err);
  }
});

// popup talks to background through these messages
browser.runtime.onMessage.addListener((message) => {
  // send current popup stats:
  // domain, live session time, and total time today
  if (message.type === "GET_POPUP_STATS") {
    return (async () => {
      const state = await getState();
      const domain = state.activeDomain || "";
      const saved = domain ? await getSavedTimeForDay(domain) : 0;
      const live =
        state.sessionStart !== null ? Date.now() - state.sessionStart : 0;

      return {
        domain,
        sessionMs: live,
        totalMs: saved + live
      };
    })();
  }

  // send all entries for one day
  // if popup doesn't send a day, use today
  if (message.type === "GET_DAY_LOG") {
    return (async () => {
      const logs = await getLogs();
      const dayKey = message.dayKey || getDayKey();

      return {
        dayKey,
        entries: logs[dayKey] || {}
      };
    })();
  }

  // reset current site's saved total for today
  // also restart the live session from zero
  if (message.type === "RESET_CURRENT_DOMAIN") {
    return (async () => {
      const state = await getState();

      if (!state.activeDomain) {
        return { ok: false };
      }

      const dayKey = getDayKey();
      const logs = await getLogs();

      if (!logs[dayKey]) {
        logs[dayKey] = {};
      }

      logs[dayKey][state.activeDomain] = 0;
      await setLogs(logs);

      await setState({
        activeTabId: state.activeTabId,
        activeDomain: state.activeDomain,
        sessionStart: Date.now()
      });

      return { ok: true };
    })();
  }

  return false;
});

// when the extension starts, immediately check what's active
// and begin tracking from there
getCurrentActiveTab().then(startTrackingTab).catch(console.error);