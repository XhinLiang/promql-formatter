// When the page is loaded, check for PromQL input fields
console.log('[PromQL Formatter] Content script loaded');

// Detect PromQL query fields in the page (based on common Prometheus UI and Grafana features)
function detectPromQLFields() {
  // Possible PromQL input element selectors
  const selectors = [
    // Prometheus UI
    'textarea.promql-code',
    '.monaco-editor textarea.inputarea',
    // Grafana
    '.gf-form-input[placeholder*="PromQL"]',
    '.gf-form-input[aria-label*="PromQL"]',
    // Generic
    'textarea[placeholder*="PromQL"]',
    'input[placeholder*="PromQL"]',
    'textarea.prometheus-query',
    'textarea.promql-query',
    '.monaco-editor'
  ];

  // Find matching elements
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`[PromQL Formatter] Found ${elements.length} potential PromQL fields with selector: ${selector}`);
      return Array.from(elements);
    }
  }

  return [];
}

// Add format buttons next to PromQL input fields
function addFormatButtons(fields) {
  fields.forEach((field, index) => {
    // Create a format button
    const button = document.createElement('button');
    button.textContent = 'Format PromQL';
    button.className = 'promql-formatter-button';
    button.style.marginLeft = '5px';
    button.style.padding = '4px 8px';
    button.style.backgroundColor = '#4285f4';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    
    // Listen for button click events
    button.addEventListener('click', () => {
      // Send message to extension, requesting to format the query in the field
      const query = field.value || field.textContent;
      if (query && query.trim()) {
        chrome.runtime.sendMessage({
          action: 'formatPromQL',
          query: query
        }, response => {
          if (response && response.success) {
            // If successful, update the content in the input field
            if (field.value !== undefined) {
              field.value = response.result;
            } else {
              field.textContent = response.result;
            }
          } else {
            console.error('[PromQL Formatter] Error formatting query:', response?.error || 'Unknown error');
            alert('Unable to format PromQL query: ' + (response?.error || 'Unknown error'));
          }
        });
      }
    });
    
    // Add the button next to the field
    const parent = field.parentNode;
    parent.insertBefore(button, field.nextSibling);
    
    console.log(`[PromQL Formatter] Added format button to PromQL field ${index+1}`);
  });
}

// Initialize
function init() {
  const fields = detectPromQLFields();
  if (fields.length > 0) {
    addFormatButtons(fields);
  } else {
    console.log('[PromQL Formatter] No PromQL fields detected on this page');
  }
}

// Initialize when the page is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Listen for page changes, detect dynamically added PromQL fields
const observer = new MutationObserver((mutations) => {
  let shouldReinit = false;
  
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      shouldReinit = true;
      break;
    }
  }
  
  if (shouldReinit) {
    setTimeout(init, 1000); // Delay initialization to ensure dynamic content is fully loaded
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'reinitialize') {
    init();
    sendResponse({ success: true });
  }
}); 