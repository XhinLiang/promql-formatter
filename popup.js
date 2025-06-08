// 全局变量，表示 WASM 模块是否已加载
let wasmLoaded = false;

// 添加必要的 SVG 图标
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

// 确保全局对象存在
window.promqlparser = {};

// 初始化 Go WASM 环境
async function initWasm() {
  try {
    // 创建必要的 DOM 元素
    createRequiredElements();
    
    // 加载 Go 环境
    const go = new Go();
    
    // 尝试使用 instantiateStreaming 加载 WASM
    try {
      const result = await WebAssembly.instantiateStreaming(
        fetch('promqlparser.wasm'),
        go.importObject
      );
      
      console.log("开始运行 WASM 模块");
      go.run(result.instance);
      console.log("WASM 模块已成功加载");
      
      // 检查全局函数
      checkGlobalFunctions();
    } catch (streamingError) {
      console.error("使用 instantiateStreaming 加载失败:", streamingError);
      
      // 回退到传统方法
      try {
        const response = await fetch('promqlparser.wasm');
        const bytes = await response.arrayBuffer();
        const result = await WebAssembly.instantiate(bytes, go.importObject);
        
        console.log("使用传统方法开始运行 WASM 模块");
        go.run(result.instance);
        console.log("WASM 模块已成功加载");
        
        // 检查全局函数
        checkGlobalFunctions();
      } catch (fallbackError) {
        console.error("所有加载方法都失败:", fallbackError);
        document.getElementById('status').textContent = '错误: 加载 WASM 模块失败 - ' + fallbackError.message;
      }
    }
  } catch (error) {
    console.error('初始化过程中出错:', error);
    document.getElementById('status').textContent = '错误: 初始化失败 - ' + error.message;
  }
}

// 创建 WASM 模块需要的 DOM 元素
function createRequiredElements() {
  // 创建必要的 DOM 元素
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

// 检查全局函数是否已加载
function checkGlobalFunctions() {
  setTimeout(() => {
    if (typeof parsepromql === 'function') {
      wasmLoaded = true;
      document.getElementById('status').textContent = 'WASM 模块已加载，可以使用了';
      document.getElementById('format').disabled = false;
      
      // 检查是否有来自后台脚本的待处理请求
      checkPendingQuery();
    } else {
      document.getElementById('status').textContent = '警告: 未找到 parsepromql 函数';
      console.warn("未找到 parsepromql 函数，列出全局函数:", Object.keys(window).filter(key => 
        typeof window[key] === 'function' && !key.startsWith('_')
      ));
    }
  }, 500);
}

// 格式化 PromQL 查询
function formatPromQL(query) {
  if (typeof parsepromql === 'function') {
    try {
      console.log("开始格式化查询:", query);
      
      // 确保 resultDiv 存在
      let resultDiv = document.getElementById('resultDiv');
      if (!resultDiv) {
        resultDiv = document.createElement('div');
        resultDiv.id = 'resultDiv';
        document.body.appendChild(resultDiv);
      }
      
      // 清空可能存在的旧内容
      resultDiv.innerHTML = '';
      
      // 尝试设置输入元素
      let inputElem = document.getElementById('promqlInput');
      if (!inputElem) {
        inputElem = document.createElement('textarea');
        inputElem.id = 'promqlInput';
        inputElem.style.display = 'none';
        document.body.appendChild(inputElem);
      }
      
      // 设置输入值
      inputElem.value = query;
      
      // 按照原始网站的方式调用 parsepromql 函数
      console.log("使用原始网站的方式调用 parsepromql...");
      parsepromql(query);
      
      // 获取结果
      const result = resultDiv.innerHTML;
      console.log("格式化结果 HTML:", result);
      
      // 提取出格式化后的 PromQL (尝试不同的提取方式)
      let formattedQuery = null;
      
      // 方法1: 使用正则表达式提取代码块
      const match = result.match(/<pre class="chroma"><code[^>]*>([\s\S]*?)<\/code><\/pre>/);
      if (match && match[1]) {
        formattedQuery = match[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        console.log("方法1提取结果:", formattedQuery);
      }
      
      // 方法2: 从任何预格式化文本中提取
      if (!formattedQuery) {
        const preMatch = result.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
        if (preMatch && preMatch[1]) {
          formattedQuery = preMatch[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
          console.log("方法2提取结果:", formattedQuery);
        }
      }
      
      // 方法3: 检查文本是否包含实际的代码内容
      if (!formattedQuery) {
        const codeContent = result.match(/```[\s\S]*?```/);
        if (codeContent) {
          formattedQuery = codeContent[0].replace(/```/g, '').trim();
          console.log("方法3提取结果:", formattedQuery);
        }
      }
      
      // 方法4: 直接从 innerText 获取内容
      if (!formattedQuery) {
        try {
          // 创建临时元素
          const temp = document.createElement('div');
          temp.innerHTML = result;
          // 查找代码元素
          const codeElem = temp.querySelector('code') || temp.querySelector('pre');
          if (codeElem) {
            formattedQuery = codeElem.innerText;
            console.log("方法4提取结果:", formattedQuery);
          }
        } catch (e) {
          console.error("方法4提取失败:", e);
        }
      }
      
      // 如果所有方法都失败，返回原始查询
      if (!formattedQuery || formattedQuery.trim() === query.trim()) {
        console.log("提取格式化后的 PromQL 失败，返回原始查询");
        return query;
      }
      
      return formattedQuery;
    } catch (error) {
      console.error("格式化过程中出错:", error);
      throw error;
    }
  } else {
    throw new Error('未找到 PromQL 格式化函数');
  }
}

// 检查是否有待处理的查询请求
function checkPendingQuery() {
  if (wasmLoaded && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get('pendingQuery', (data) => {
      if (data.pendingQuery) {
        // 有待处理的查询，尝试格式化
        try {
          const formattedQuery = formatPromQL(data.pendingQuery);
          
          // 将结果发送回后台脚本
          chrome.runtime.sendMessage({
            action: 'formatPromQLResult',
            success: true,
            result: formattedQuery
          });
          
          // 如果是从右键菜单启动的，完成后自动关闭弹出窗口
          chrome.storage.local.get(['isContextMenu', 'popupWindowId'], (contextData) => {
            if (contextData.isContextMenu && contextData.popupWindowId) {
              setTimeout(() => {
                window.close();
              }, 500);
            }
          });
        } catch (error) {
          // 出错时，发送错误信息
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

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
  // 初始化 WASM
  initWasm();
  
  // 格式化按钮事件
  const formatButton = document.getElementById('format');
  formatButton.addEventListener('click', () => {
    const input = document.getElementById('input').value;
    const resultDiv = document.getElementById('result');
    
    if (!input.trim()) {
      resultDiv.textContent = '请输入 PromQL 查询';
      return;
    }
    
    try {
      const formattedQuery = formatPromQL(input);
      resultDiv.textContent = formattedQuery;
      document.getElementById('copy').disabled = false;
    } catch (error) {
      resultDiv.textContent = '错误: ' + error.message;
    }
  });
  
  // 复制结果按钮事件
  const copyButton = document.getElementById('copy');
  copyButton.addEventListener('click', () => {
    const resultText = document.getElementById('result').textContent;
    
    // 复制到剪贴板
    navigator.clipboard.writeText(resultText).then(() => {
      const originalText = copyButton.textContent;
      copyButton.textContent = '已复制!';
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 1500);
    });
  });
}); 