// 当页面加载完成后，检查是否有 PromQL 输入框
console.log('[PromQL Formatter] Content script loaded');

// 检测页面中的 PromQL 查询框（基于常见的 Prometheus UI 和 Grafana 特征）
function detectPromQLFields() {
  // 可能的 PromQL 输入元素选择器
  const selectors = [
    // Prometheus UI
    'textarea.promql-code',
    '.monaco-editor textarea.inputarea',
    // Grafana
    '.gf-form-input[placeholder*="PromQL"]',
    '.gf-form-input[aria-label*="PromQL"]',
    // 通用
    'textarea[placeholder*="PromQL"]',
    'input[placeholder*="PromQL"]',
    'textarea.prometheus-query',
    'textarea.promql-query',
    '.monaco-editor'
  ];

  // 查找匹配的元素
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`[PromQL Formatter] Found ${elements.length} potential PromQL fields with selector: ${selector}`);
      return Array.from(elements);
    }
  }

  return [];
}

// 添加格式化按钮到 PromQL 输入框旁边
function addFormatButtons(fields) {
  fields.forEach((field, index) => {
    // 创建一个格式化按钮
    const button = document.createElement('button');
    button.textContent = '格式化 PromQL';
    button.className = 'promql-formatter-button';
    button.style.marginLeft = '5px';
    button.style.padding = '4px 8px';
    button.style.backgroundColor = '#4285f4';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    
    // 监听按钮点击事件
    button.addEventListener('click', () => {
      // 向扩展发送消息，请求格式化 field 中的查询
      const query = field.value || field.textContent;
      if (query && query.trim()) {
        chrome.runtime.sendMessage({
          action: 'formatPromQL',
          query: query
        }, response => {
          if (response && response.success) {
            // 如果成功，更新输入框中的内容
            if (field.value !== undefined) {
              field.value = response.result;
            } else {
              field.textContent = response.result;
            }
          } else {
            console.error('[PromQL Formatter] Error formatting query:', response?.error || 'Unknown error');
            alert('无法格式化 PromQL 查询: ' + (response?.error || '未知错误'));
          }
        });
      }
    });
    
    // 将按钮添加到字段旁边
    const parent = field.parentNode;
    parent.insertBefore(button, field.nextSibling);
    
    console.log(`[PromQL Formatter] Added format button to PromQL field ${index+1}`);
  });
}

// 初始化
function init() {
  const fields = detectPromQLFields();
  if (fields.length > 0) {
    addFormatButtons(fields);
  } else {
    console.log('[PromQL Formatter] No PromQL fields detected on this page');
  }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 监听页面变化，检测动态添加的 PromQL 字段
const observer = new MutationObserver((mutations) => {
  let shouldReinit = false;
  
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      shouldReinit = true;
      break;
    }
  }
  
  if (shouldReinit) {
    setTimeout(init, 1000); // 延迟初始化，确保动态内容已完全加载
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'reinitialize') {
    init();
    sendResponse({ success: true });
  }
}); 