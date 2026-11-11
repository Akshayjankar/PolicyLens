// PolicyLens Service Worker
// Handles extension lifecycle events

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PRIVACY_URL_FOUND') {
    // Store the found privacy URL associated with this tab
    if (sender.tab && sender.tab.id) {
      chrome.storage.session.set({
        [`privacyUrl_${sender.tab.id}`]: message.url
      });
    }
    sendResponse({ received: true });
  }

  // When analysis data is stored from the content script / background,
  // ensure policyUrl is included (write null if not present) so popup.js
  // can handle the fallback gracefully.
  if (message.type === 'ANALYSIS_READY') {
    const { hostname, data } = message;
    if (hostname && data) {
      const withPolicyUrl = Object.assign({ policyUrl: null }, data);
      chrome.storage.local.set({ [hostname]: withPolicyUrl });
    }
    sendResponse({ received: true });
  }

  return true; // keep channel open for async response
});

// Clear session storage when a tab navigates to a new URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && changeInfo.url) {
    // New navigation — clear the cached privacy URL for this tab
    chrome.storage.session.remove(`privacyUrl_${tabId}`);
    // Also clear any cached analysis for tab-specific keys if needed
  }
});

// Clean up when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(`privacyUrl_${tabId}`);
});
