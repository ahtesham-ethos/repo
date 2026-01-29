/**
 * Background service worker for the Page Health Analyzer extension
 * Handles extension lifecycle, tab management, and cross-component communication
 */

// Extension installation and update handling
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Page Health Analyzer installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // Set up default configuration on first install
    initializeDefaultConfiguration();
  } else if (details.reason === 'update') {
    // Handle extension updates
    console.log('Extension updated from version:', details.previousVersion);
  }
});

// Extension startup handling
chrome.runtime.onStartup.addListener(() => {
  console.log('Page Health Analyzer extension started');
});

// Tab update handling - inject content script when needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only inject when the page has finished loading
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    // Inject content script if not already present
    injectContentScriptIfNeeded(tabId);
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleBackgroundMessage(message, sender, sendResponse);
  return true; // Keep the message channel open for async responses
});

// Context menu setup (optional feature)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'analyze-page-health',
    title: 'Analyze Page Health',
    contexts: ['page']
  });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'analyze-page-health' && tab?.id) {
    // Send message to content script to perform analysis
    chrome.tabs.sendMessage(tab.id, { action: 'analyze' })
      .then((response) => {
        if (response?.success) {
          // Optionally show notification or badge
          showAnalysisNotification(tab.id!, response.data.health);
        }
      })
      .catch((error) => {
        console.error('Failed to analyze page from context menu:', error);
      });
  }
});

/**
 * Initialize default configuration on first install
 */
async function initializeDefaultConfiguration(): Promise<void> {
  try {
    const defaultConfig = {
      pageSize: 2 * 1024 * 1024, // 2MB
      loadTime: 5000, // 5 seconds
      ttfb: 3000, // 3 seconds
      version: '1.0.0',
      installedAt: Date.now()
    };

    await chrome.storage.local.set({ 
      'page-health-thresholds': defaultConfig,
      'page-health-settings': {
        autoAnalyze: false,
        showNotifications: true,
        badgeEnabled: true
      }
    });

    console.log('Default configuration initialized');
  } catch (error) {
    console.error('Failed to initialize default configuration:', error);
  }
}

/**
 * Inject content script if not already present
 */
async function injectContentScriptIfNeeded(tabId: number): Promise<void> {
  try {
    // Check if content script is already injected by sending a ping
    const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    if (response?.success) {
      // Content script is already present
      return;
    }
  } catch (error) {
    // Content script not present, inject it
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      console.log('Content script injected into tab:', tabId);
    } catch (injectionError) {
      console.error('Failed to inject content script:', injectionError);
    }
  }
}

/**
 * Handle messages from other parts of the extension
 */
async function handleBackgroundMessage(
  message: any, 
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    switch (message.action) {
      case 'getTabInfo':
        await handleGetTabInfo(sendResponse);
        break;
      
      case 'updateBadge':
        await handleUpdateBadge(message.data, sender.tab?.id);
        sendResponse({ success: true });
        break;
      
      case 'showNotification':
        await handleShowNotification(message.data);
        sendResponse({ success: true });
        break;
      
      case 'getSettings':
        await handleGetSettings(sendResponse);
        break;
      
      case 'updateSettings':
        await handleUpdateSettings(message.data, sendResponse);
        break;
      
      default:
        sendResponse({ success: false, error: 'Unknown action: ' + message.action });
    }
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * Get information about the current active tab
 */
async function handleGetTabInfo(sendResponse: (response: any) => void): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
      sendResponse({
        success: true,
        data: {
          id: tab.id,
          url: tab.url,
          title: tab.title,
          status: tab.status,
          favIconUrl: tab.favIconUrl
        }
      });
    } else {
      sendResponse({ success: false, error: 'No active tab found' });
    }
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get tab info' 
    });
  }
}

/**
 * Update extension badge based on analysis results
 */
async function handleUpdateBadge(data: any, tabId?: number): Promise<void> {
  if (!tabId) return;

  try {
    const settings = await getExtensionSettings();
    if (!settings.badgeEnabled) return;

    const { status, score } = data;
    
    // Set badge text based on score
    let badgeText = '';
    let badgeColor = '#10b981'; // Green

    if (status === 'FAIL') {
      badgeText = '!';
      badgeColor = '#ef4444'; // Red
    } else if (status === 'WARN') {
      badgeText = '?';
      badgeColor = '#f59e0b'; // Yellow
    } else if (status === 'PASS') {
      badgeText = '✓';
      badgeColor = '#10b981'; // Green
    }

    await chrome.action.setBadgeText({ text: badgeText, tabId });
    await chrome.action.setBadgeBackgroundColor({ color: badgeColor, tabId });
    
    // Update title with score
    await chrome.action.setTitle({ 
      title: `Page Health Analyzer - Score: ${score}/100 (${status})`,
      tabId 
    });

  } catch (error) {
    console.error('Failed to update badge:', error);
  }
}

/**
 * Show notification for analysis results
 */
async function handleShowNotification(data: any): Promise<void> {
  try {
    const settings = await getExtensionSettings();
    if (!settings.showNotifications) return;

    const { status, score, url } = data;
    const domain = new URL(url).hostname;

    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-48.png',
      title: 'Page Health Analysis Complete',
      message: `${domain}: ${status} (Score: ${score}/100)`
    });

  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

/**
 * Get extension settings
 */
async function handleGetSettings(sendResponse: (response: any) => void): Promise<void> {
  try {
    const settings = await getExtensionSettings();
    sendResponse({ success: true, data: settings });
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get settings' 
    });
  }
}

/**
 * Update extension settings
 */
async function handleUpdateSettings(data: any, sendResponse: (response: any) => void): Promise<void> {
  try {
    await chrome.storage.local.set({ 'page-health-settings': data });
    sendResponse({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update settings' 
    });
  }
}

/**
 * Get extension settings from storage
 */
async function getExtensionSettings(): Promise<any> {
  try {
    const result = await chrome.storage.local.get('page-health-settings');
    return result['page-health-settings'] || {
      autoAnalyze: false,
      showNotifications: true,
      badgeEnabled: true
    };
  } catch (error) {
    console.error('Failed to get extension settings:', error);
    return {
      autoAnalyze: false,
      showNotifications: true,
      badgeEnabled: true
    };
  }
}

/**
 * Show analysis notification with results
 */
async function showAnalysisNotification(tabId: number, healthData: any): Promise<void> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url) return;

    await handleShowNotification({
      status: healthData.status,
      score: healthData.score,
      url: tab.url
    });

    await handleUpdateBadge(healthData, tabId);

  } catch (error) {
    console.error('Failed to show analysis notification:', error);
  }
}

// Clean up badge when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.action.setBadgeText({ text: '', tabId }).catch(() => {
    // Ignore errors for closed tabs
  });
});

// Clear badge when navigating to a new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    chrome.action.setBadgeText({ text: '', tabId }).catch(() => {
      // Ignore errors
    });
    chrome.action.setTitle({ 
      title: 'Page Health Analyzer',
      tabId 
    }).catch(() => {
      // Ignore errors
    });
  }
});

console.log('Page Health Analyzer background service worker loaded');