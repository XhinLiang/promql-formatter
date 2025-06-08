// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "formatPromQL",
    title: "格式化 PromQL",
    contexts: ["selection", "editable"]
  });
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "formatPromQL") {
    // 获取选中的文本
    const selectedText = info.selectionText;
    if (selectedText && selectedText.trim()) {
      // 存储查询，以便弹出窗口可以访问
      chrome.storage.local.set({ 
        pendingQuery: selectedText,
        pendingTabId: tab.id,
        isContextMenu: true,
        sourceElement: {
          frameId: info.frameId,
          editable: info.editable
        }
      }, () => {
        // 打开弹出窗口以处理查询
        chrome.windows.create({
          url: 'popup.html',
          type: 'popup',
          width: 10,
          height: 10,
          focused: false,
          left: 0,
          top: 0
        }, (popupWindow) => {
          // 存储窗口 ID，以便后续关闭
          chrome.storage.local.set({ popupWindowId: popupWindow.id });
        });
      });
    }
  }
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'formatPromQL') {
    // 打开弹出窗口来格式化 PromQL 查询
    // 这是一个替代方案，因为直接在后台脚本中加载 WASM 可能会有限制
    // 弹出窗口将处理格式化并发送回结果
    
    // 存储查询，以便弹出窗口可以访问
    chrome.storage.local.set({ 
      pendingQuery: message.query, 
      pendingTabId: sender.tab.id,
      isContextMenu: false
    }, () => {
      // 打开弹出窗口以处理查询
      chrome.windows.create({
        url: 'popup.html',
        type: 'popup',
        width: 10,  // 最小尺寸
        height: 10,
        focused: false,
        left: 0,
        top: 0
      }, (popupWindow) => {
        // 存储窗口 ID，以便后续关闭
        chrome.storage.local.set({ popupWindowId: popupWindow.id });
      });
      
      // 告诉内容脚本我们正在处理
      sendResponse({ success: true, processing: true });
    });
    
    // 返回 true 表示我们将异步发送响应
    return true;
  }
});

// 监听来自弹出窗口的格式化结果
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'formatPromQLResult') {
    // 从存储中获取相关信息
    chrome.storage.local.get(['pendingTabId', 'popupWindowId', 'isContextMenu', 'sourceElement'], (data) => {
      if (data.pendingTabId) {
        if (data.isContextMenu) {
          // 如果是右键菜单，则使用 executeScript 替换选中的文本
          chrome.scripting.executeScript({
            target: { tabId: data.pendingTabId, frameIds: [data.sourceElement?.frameId || 0] },
            function: replaceSelectedText,
            args: [message.result]
          });
        } else {
          // 如果是常规请求，则将结果发送回原始标签页
          chrome.tabs.sendMessage(data.pendingTabId, {
            action: 'formatPromQLResponse',
            success: message.success,
            result: message.result,
            error: message.error
          });
        }
        
        // 关闭弹出窗口
        if (data.popupWindowId) {
          chrome.windows.remove(data.popupWindowId);
        }
        
        // 清除存储
        chrome.storage.local.remove(['pendingQuery', 'pendingTabId', 'popupWindowId', 'isContextMenu', 'sourceElement']);
      }
    });
    
    sendResponse({ success: true });
    return true;
  }
});

// 监听标签页更新，在页面加载完成后重新初始化内容脚本
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.tabs.sendMessage(tabId, { action: 'reinitialize' }).catch(() => {
      // 忽略错误，可能是页面没有加载内容脚本
    });
  }
});

// 在页面中替换选中的文本
function replaceSelectedText(formattedText) {
  // 如果当前有一个活动的文本编辑元素 (input, textarea, contenteditable)
  const activeElement = document.activeElement;
  
  if (activeElement) {
    // 如果是 input 或 textarea
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      
      if (start !== undefined && end !== undefined) {
        const value = activeElement.value;
        activeElement.value = value.substring(0, start) + formattedText + value.substring(end);
        
        // 更新选择区域
        activeElement.selectionStart = start;
        activeElement.selectionEnd = start + formattedText.length;
        return true;
      }
    } 
    // 如果是可编辑的 div 或其他元素
    else if (activeElement.isContentEditable || activeElement.contentEditable === 'true') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(formattedText));
        return true;
      }
    }
    // 特殊处理 Monaco 编辑器 (VSCode/Grafana 使用)
    else if (activeElement.classList.contains('monaco-editor')) {
      try {
        // 尝试查找 Monaco 编辑器实例
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
        console.error('Monaco 编辑器操作失败:', e);
      }
    }
  }
  
  // 后备方法：创建一个临时输入框来模拟复制粘贴
  try {
    // 保存当前选择
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // 删除选中内容并插入格式化的文本
      range.deleteContents();
      const textNode = document.createTextNode(formattedText);
      range.insertNode(textNode);
      
      // 设置新的选择范围
      range.selectNodeContents(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      return true;
    }
  } catch (e) {
    console.error('替换选中文本失败:', e);
  }
  
  // 如果所有方法都失败，显示一个通知
  alert('无法替换选中的文本。请尝试复制格式化的结果:\n' + formattedText);
  
  return false;
} 