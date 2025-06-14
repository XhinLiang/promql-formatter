// Create context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "formatPromQL",
    title: "Format PromQL",
    contexts: ["all"]
  });
});

// Handle context menu click events
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "formatPromQL") {
    // Get selected text
    const selectedText = info.selectionText;
    if (selectedText && selectedText.trim()) {
      // Store query for popup to access
      chrome.storage.local.set({ 
        pendingQuery: selectedText,
        pendingTabId: tab.id,
        isContextMenu: true,
        sourceElement: {
          frameId: info.frameId,
          editable: info.editable
        }
      }, () => {
        // Open popup to process the query
        chrome.windows.create({
          url: 'popup.html',
          type: 'popup',
          width: 10,
          height: 10,
          focused: false,
          left: 0,
          top: 0
        }, (popupWindow) => {
          // Store window ID for later closure
          chrome.storage.local.set({ popupWindowId: popupWindow.id });
        });
      });
    }
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'formatPromQL') {
    // Open popup to format PromQL query
    // This is an alternative approach since loading WASM directly in background scripts may have limitations
    // Popup will handle formatting and send back results
    
    // Store query for popup to access
    chrome.storage.local.set({ 
      pendingQuery: message.query, 
      pendingTabId: sender.tab.id,
      isContextMenu: false
    }, () => {
      // Open popup to process the query
      chrome.windows.create({
        url: 'popup.html',
        type: 'popup',
        width: 10,  // Minimum size
        height: 10,
        focused: false,
        left: 0,
        top: 0
      }, (popupWindow) => {
        // Store window ID for later closure
        chrome.storage.local.set({ popupWindowId: popupWindow.id });
      });
      
      // Tell content script we're processing
      sendResponse({ success: true, processing: true });
    });
    
    // Return true to indicate we'll send response asynchronously
    return true;
  }
});

// Listen for formatting results from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'formatPromQLResult') {
    // Get relevant information from storage
    chrome.storage.local.get(['pendingTabId', 'popupWindowId', 'isContextMenu', 'sourceElement'], (data) => {
      if (data.pendingTabId) {
        if (data.isContextMenu) {
          // If from context menu, use executeScript to replace selected text
          chrome.scripting.executeScript({
            target: { tabId: data.pendingTabId, frameIds: [data.sourceElement?.frameId || 0] },
            function: replaceSelectedText,
            args: [message.result]
          });
        } else {
          // If regular request, send result back to original tab
          chrome.tabs.sendMessage(data.pendingTabId, {
            action: 'formatPromQLResponse',
            success: message.success,
            result: message.result,
            error: message.error
          });
        }
        
        // Close popup window
        if (data.popupWindowId) {
          chrome.windows.remove(data.popupWindowId);
        }
        
        // Clear storage
        chrome.storage.local.remove(['pendingQuery', 'pendingTabId', 'popupWindowId', 'isContextMenu', 'sourceElement']);
      }
    });
    
    sendResponse({ success: true });
    return true;
  }
});

// Listen for tab updates, reinitialize content scripts when page loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.tabs.sendMessage(tabId, { action: 'reinitialize' }).catch(() => {
      // Ignore errors, page may not have content script loaded
    });
  }
});

// Replace selected text in the page
function replaceSelectedText(formattedText) {
  // If there's an active text editing element (input, textarea, contenteditable)
  const activeElement = document.activeElement;
  
  if (activeElement) {
    // If input or textarea
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      
      if (start !== undefined && end !== undefined) {
        const value = activeElement.value;
        activeElement.value = value.substring(0, start) + formattedText + value.substring(end);
        
        // Update selection range
        activeElement.selectionStart = start;
        activeElement.selectionEnd = start + formattedText.length;
        return true;
      }
    } 
    // If contenteditable div or other element
    else if (activeElement.isContentEditable || activeElement.contentEditable === 'true') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(formattedText));
        return true;
      }
    }
    // Special handling for Monaco editor (used by VSCode/Grafana)
    else if (activeElement.classList.contains('monaco-editor')) {
      try {
        // Try to find Monaco editor instance
        const editor = window.monaco?.editor?.getModels()[0];
        if (editor) {
          const selection = window.monaco.editor.getSelection();
          if (selection) {
            editor.pushEditOperations(
              [],
              [{ range: selection, text: formattedText }],
              []
            );
            return true;
          }
        }
      } catch (e) {
        console.error('Monaco editor operation failed:', e);
      }
    }
  }
  
  // Fallback method: Create a temporary input box to simulate copy-paste
  try {
    // Save current selection
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Delete selected content and insert formatted text
      range.deleteContents();
      const textNode = document.createTextNode(formattedText);
      range.insertNode(textNode);
      
      // Set new selection range
      range.selectNodeContents(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      return true;
    }
  } catch (e) {
    console.error('Failed to replace selected text:', e);
  }
  
  return false;
} 