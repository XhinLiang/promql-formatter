// Global variable to indicate if the WASM module is loaded
let wasmLoaded = false;

// Add necessary SVG icons
document.body.insertAdjacentHTML('beforeend', `
    <svg style="display:none">
        <symbol id="gdoc_check" viewBox="0 0 24 24">
            <path d="M9,16.17L4.83,12l-1.42,1.41L9,19 21,7l-1.41-1.41L9,16.17z"/>
        </symbol>
        <symbol id="gdoc_dangerous" viewBox="0 0 24 24">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </symbol>
        <symbol id="gdoc_link" viewBox="0 0 24 24">
            <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
        </symbol>
    </svg>
`);

// Ensure global object exists
window.promqlparser = {};

// Initialize Go WASM environment
async function initWasm() {
  try {
    // Create necessary DOM elements
    createRequiredElements();
    
    // Load Go environment
    const go = new Go();
    
    // Try to load WASM using instantiateStreaming
    try {
      const result = await WebAssembly.instantiateStreaming(
        fetch('promqlparser.wasm'),
        go.importObject
      );
      
      console.log("Starting WASM module");
      go.run(result.instance);
      console.log("WASM module successfully loaded");
      
      // Check global functions
      checkGlobalFunctions();
    } catch (streamingError) {
      console.error("Failed to load using instantiateStreaming:", streamingError);
      
      // Fallback to traditional method
      try {
        const response = await fetch('promqlparser.wasm');
        const bytes = await response.arrayBuffer();
        const result = await WebAssembly.instantiate(bytes, go.importObject);
        
        console.log("Starting WASM module using traditional method");
        go.run(result.instance);
        console.log("WASM module successfully loaded");
        
        // Check global functions
        checkGlobalFunctions();
      } catch (fallbackError) {
        console.error("All loading methods failed:", fallbackError);
        document.getElementById('status').textContent = 'Error: Failed to load WASM module - ' + fallbackError.message;
      }
    }
  } catch (error) {
    console.error('Error during initialization:', error);
    document.getElementById('status').textContent = 'Error: Initialization failed - ' + error.message;
  }
}

// Create DOM elements needed by the WASM module
function createRequiredElements() {
  // Create necessary DOM elements
  const elements = [
    { id: 'runButton', hidden: false },
    { id: 'exampleButton', hidden: false },
    { id: 'loadingWarning', hidden: false },
    { id: 'resultDiv', hidden: false },
    { id: 'promqlInput', hidden: false }
  ];
  
  for (const elem of elements) {
    let el = document.getElementById(elem.id);
    if (!el) {
      el = document.createElement('div');
      el.id = elem.id;
      if (elem.hidden) {
        el.style.display = 'none';
      }
      document.body.appendChild(el);
    }
  }
}

// Check if global functions are loaded
function checkGlobalFunctions() {
  setTimeout(() => {
    if (typeof parsepromql === 'function') {
      wasmLoaded = true;
      document.getElementById('status').textContent = 'WASM module loaded, ready to use';
      document.getElementById('format').disabled = false;
      
      // Check if there are pending requests from the background script
      checkPendingQuery();
    } else {
      document.getElementById('status').textContent = 'Warning: parsepromql function not found';
      console.warn("parsepromql function not found, listing global functions:", Object.keys(window).filter(key => 
        typeof window[key] === 'function' && !key.startsWith('_')
      ));
    }
  }, 500);
}

// Format PromQL query
function formatPromQL(query) {
  if (typeof parsepromql === 'function') {
    try {
      console.log("Starting to format query:", query);
      
      // Ensure resultDiv exists
      let resultDiv = document.getElementById('resultDiv');
      if (!resultDiv) {
        resultDiv = document.createElement('div');
        resultDiv.id = 'resultDiv';
        document.body.appendChild(resultDiv);
      }
      
      // Clear any existing content
      resultDiv.innerHTML = '';
      
      // Try to set input element
      let inputElem = document.getElementById('promqlInput');
      if (!inputElem) {
        inputElem = document.createElement('textarea');
        inputElem.id = 'promqlInput';
        inputElem.style.display = 'none';
        document.body.appendChild(inputElem);
      }
      
      // Set input value
      inputElem.value = query;
      
      // Call parsepromql function using original website's method
      console.log("Calling parsepromql using original website's method...");
      parsepromql(query);
      
      // Get result
      const result = resultDiv.innerHTML;
      console.log("Formatting result HTML:", result);
      
      // Extract formatted PromQL (try different extraction methods)
      let formattedQuery = null;
      
      // Method 1: Extract code block using regex
      const match = result.match(/<pre class="chroma"><code[^>]*>([\s\S]*?)<\/code><\/pre>/);
      if (match && match[1]) {
        formattedQuery = match[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        console.log("Method 1 extraction result:", formattedQuery);
      }
      
      // Method 2: Extract from any pre-formatted text
      if (!formattedQuery) {
        const preMatch = result.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
        if (preMatch && preMatch[1]) {
          formattedQuery = preMatch[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
          console.log("Method 2 extraction result:", formattedQuery);
        }
      }
      
      // Method 3: Check if text contains actual code content
      if (!formattedQuery) {
        const codeContent = result.match(/```[\s\S]*?```/);
        if (codeContent) {
          formattedQuery = codeContent[0].replace(/```/g, '').trim();
          console.log("Method 3 extraction result:", formattedQuery);
        }
      }
      
      // Method 4: Get content directly from innerText
      if (!formattedQuery) {
        try {
          // Create a temporary element
          const temp = document.createElement('div');
          temp.innerHTML = result;
          // Find code element
          const codeElem = temp.querySelector('code') || temp.querySelector('pre');
          if (codeElem) {
            formattedQuery = codeElem.innerText;
            console.log("Method 4 extraction result:", formattedQuery);
          }
        } catch (e) {
          console.error("Method 4 extraction failed:", e);
        }
      }
      
      // If all methods fail, return original query
      if (!formattedQuery || formattedQuery.trim() === query.trim()) {
        console.log("Failed to extract formatted PromQL, returning original query");
        return query;
      }
      
      return formattedQuery;
    } catch (error) {
      console.error("Error during formatting:", error);
      throw error;
    }
  } else {
    throw new Error('PromQL formatting function not found');
  }
}

// Check if there are pending query requests
function checkPendingQuery() {
  if (wasmLoaded && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get('pendingQuery', (data) => {
      if (data.pendingQuery) {
        // There are pending requests, try to format
        try {
          const formattedQuery = formatPromQL(data.pendingQuery);
          
          // Send result back to background script
          chrome.runtime.sendMessage({
            action: 'formatPromQLResult',
            success: true,
            result: formattedQuery
          });
          
          // If launched from right-click menu, close popup after completion
          chrome.storage.local.get(['isContextMenu', 'popupWindowId'], (contextData) => {
            if (contextData.isContextMenu && contextData.popupWindowId) {
              setTimeout(() => {
                window.close();
              }, 500);
            }
          });
        } catch (error) {
          // Send error message if there's an error
          chrome.runtime.sendMessage({
            action: 'formatPromQLResult',
            success: false,
            error: error.message
          });
        }
      }
    });
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  // Initialize WASM
  initWasm();
  
  // Format button event
  const formatButton = document.getElementById('format');
  formatButton.addEventListener('click', () => {
    const input = document.getElementById('input').value;
    const resultDiv = document.getElementById('result');
    
    if (!input.trim()) {
      resultDiv.textContent = 'Please enter PromQL query';
      return;
    }
    
    try {
      const formattedQuery = formatPromQL(input);
      resultDiv.textContent = formattedQuery;
      document.getElementById('copy').disabled = false;
    } catch (error) {
      resultDiv.textContent = 'Error: ' + error.message;
    }
  });
  
  // Copy result button event
  const copyButton = document.getElementById('copy');
  copyButton.addEventListener('click', () => {
    const resultText = document.getElementById('result').textContent;
    
    // Copy to clipboard
    navigator.clipboard.writeText(resultText).then(() => {
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 1500);
    });
  });
}); 