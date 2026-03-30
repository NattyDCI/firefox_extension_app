const STATE_KEY = "__tracker_state__";
const TIME_PREFIX = "time:";

// Builds the storage key for one domain
function timeKey(domain) {
  return `${TIME_PREFIX}${domain}`;
}

// Extract domain from URL
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

// Read current tracking state
async function getState() {
  const result = await browser.storage.local.get(STATE_KEY);
  return result[STATE_KEY] || {
    activeTabId: null,
    activeDomain: null,
    sessionStart: null
  };
}

// Save current tracking state
async function setState(state) {
  await browser.storage.local.set({
    [STATE_KEY]: state
  });
}

// Get saved total time for one domain
async function getSavedTime(domain) {
  if (!domain) return 0;

  const key = timeKey(domain);
  const result = await browser.storage.local.get(key);
  return result[key] || 0;
}

// Add elapsed time to one domain
async function saveTimeForDomain(domain, ms) {
  if (!domain || ms <= 0) return;

  const key = timeKey(domain);
  const previous = await getSavedTime(domain);
  const updated = previous + ms;

  await browser.storage.local.set({
    [key]: updated
  });

  console.log("Saved time:", { domain, ms, previous, updated });
}

// Save current session before switching away
async function saveCurrentSession() {
  const state = await getState();

  if (!state.activeDomain || state.sessionStart === null) {
    return;
  }

  const elapsed = Date.now() - state.sessionStart;

  if (elapsed > 0) {
    await saveTimeForDomain(state.activeDomain, elapsed);
  }

  await setState({
    activeTabId: null,
    activeDomain: null,
    sessionStart: null
  });
}

// Start tracking a tab
async function startTrackingTab(tab) {
  if (!tab) return;

  const domain = getDomain(tab.url);
  const oldState = await getState();

  // Ignore non-website tabs
  if (!domain) {
    await saveCurrentSession();
    return;
  }

  // If already tracking the same tab/domain, do nothing
  if (
    oldState.activeTabId === tab.id &&
    oldState.activeDomain === domain &&
    oldState.sessionStart !== null
  ) {
    return;
  }

  // Save old tracked session before switching
  if (oldState.activeDomain && oldState.sessionStart !== null) {
    const elapsed = Date.now() - oldState.sessionStart;

    if (elapsed > 0) {
      await saveTimeForDomain(oldState.activeDomain, elapsed);
    }
  }

  // Start fresh live session
  await setState({
    activeTabId: tab.id,
    activeDomain: domain,
    sessionStart: Date.now()
  });

  console.log("Now tracking:", domain);
}

// Get active tab from last-focused browser window
async function getCurrentActiveTab() {
  const tabs = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true
  });

  return tabs[0] || null;
}

// When user changes tab
browser.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await browser.tabs.get(tabId);
    await startTrackingTab(tab);
  } catch (err) {
    console.error("onActivated error:", err);
  }
});

// When active tab finishes loading a new page
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    if (tab.active && changeInfo.status === "complete") {
      await startTrackingTab(tab);
    }
  } catch (err) {
    console.error("onUpdated error:", err);
  }
});

// When browser loses or regains focus
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

// When tracked tab closes
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

// Handle popup messages
browser.runtime.onMessage.addListener(async (message) => {
  if (message.type === "GET_POPUP_STATS") {
    const state = await getState();
    const domain = state.activeDomain || "";
    const saved = domain ? await getSavedTime(domain) : 0;
    const live =
      state.sessionStart !== null ? Date.now() - state.sessionStart : 0;

    return {
      domain,
      sessionMs: live,
      totalMs: saved + live
    };
  }

  if (message.type === "RESET_CURRENT_DOMAIN") {
    const state = await getState();

    if (!state.activeDomain) {
      return { ok: false };
    }

    await browser.storage.local.set({
      [timeKey(state.activeDomain)]: 0
    });

    await setState({
      activeTabId: state.activeTabId,
      activeDomain: state.activeDomain,
      sessionStart: Date.now()
    });

    return { ok: true };
  }

  if (message.type === "GET_DEBUG_STORAGE") {
    return await browser.storage.local.get(null);
  }

  if (message.type === "CLEAN_OLD_KEYS") {
    const all = await browser.storage.local.get(null);

    const keysToRemove = Object.keys(all).filter((key) => {
      return key !== STATE_KEY && !key.startsWith(TIME_PREFIX);
    });

    if (keysToRemove.length > 0) {
      await browser.storage.local.remove(keysToRemove);
    }

    return { removed: keysToRemove };
  }
});

// Initialize when extension starts
getCurrentActiveTab().then(startTrackingTab).catch(console.error);