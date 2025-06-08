// 这个文件将作为 Chrome 扩展的核心，用于与 WASM 模块交互
// 当扩展被加载时，它会初始化 WASM 模块

// 确保全局对象存在
window.promqlparser = {};

// 加载 WASM 模块
async function initPromQLParser() {
    try {
        // 首先需要加载 wasm_exec.js
        await loadScript(chrome.runtime.getURL('wasm_exec.js'));
        
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
        
        // 创建必要的 DOM 元素
        createRequiredElements();
        
        // 创建 Go 实例
        const go = new Go();
        
        // 尝试使用 instantiateStreaming 加载 WASM
        try {
            const result = await WebAssembly.instantiateStreaming(
                fetch(chrome.runtime.getURL('promqlparser.wasm')),
                go.importObject
            );
            
            console.log("[PromQL Formatter] 开始运行 WASM 模块");
            go.run(result.instance);
            console.log("[PromQL Formatter] WASM 模块已成功加载");
            
            return checkParsepromqlFunction();
        } catch (streamingError) {
            console.error("[PromQL Formatter] 使用 instantiateStreaming 加载失败:", streamingError);
            
            // 回退到传统方法
            try {
                const response = await fetch(chrome.runtime.getURL('promqlparser.wasm'));
                const bytes = await response.arrayBuffer();
                const result = await WebAssembly.instantiate(bytes, go.importObject);
                
                console.log("[PromQL Formatter] 使用传统方法开始运行 WASM 模块");
                go.run(result.instance);
                console.log("[PromQL Formatter] WASM 模块已成功加载");
                
                return checkParsepromqlFunction();
            } catch (fallbackError) {
                console.error("[PromQL Formatter] 所有加载方法都失败:", fallbackError);
                return false;
            }
        }
    } catch (error) {
        console.error('[PromQL Formatter] 加载 PromQL Parser WASM 模块失败:', error);
        return false;
    }
}

// 创建 WASM 模块需要的 DOM 元素
function createRequiredElements() {
    const elements = [
        { id: 'runButton', hidden: true },
        { id: 'exampleButton', hidden: true },
        { id: 'loadingWarning', hidden: false },
        { id: 'resultDiv', hidden: true },
        { id: 'promqlInput', hidden: true }
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

// 检查 parsepromql 函数是否存在
function checkParsepromqlFunction() {
    // 等待 parsepromql 函数被导出
    return new Promise(resolve => {
        setTimeout(() => {
            if (typeof parsepromql === 'function') {
                console.log('[PromQL Formatter] 找到 parsepromql 函数');
                resolve(true);
            } else {
                console.warn('[PromQL Formatter] 警告: 未找到 parsepromql 函数');
                console.warn("[PromQL Formatter] 全局函数列表:", Object.keys(window).filter(key => 
                    typeof window[key] === 'function' && !key.startsWith('_')
                ));
                resolve(false);
            }
        }, 500);
    });
}

// 辅助函数：加载脚本
function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// 格式化 PromQL 查询
function formatPromQL(query) {
    if (typeof parsepromql === 'function') {
        try {
            console.log("[PromQL Formatter] 开始格式化查询:", query);
            
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
            console.log("[PromQL Formatter] 使用原始网站的方式调用 parsepromql...");
            parsepromql(query);
            
            // 获取结果
            const result = resultDiv.innerHTML;
            console.log("[PromQL Formatter] 格式化结果 HTML:", result);
            
            // 提取出格式化后的 PromQL (尝试不同的提取方式)
            let formattedQuery = null;
            
            // 方法1: 使用正则表达式提取代码块
            const match = result.match(/<pre class="chroma"><code[^>]*>([\s\S]*?)<\/code><\/pre>/);
            if (match && match[1]) {
                formattedQuery = match[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
                console.log("[PromQL Formatter] 方法1提取结果:", formattedQuery);
            }
            
            // 方法2: 从任何预格式化文本中提取
            if (!formattedQuery) {
                const preMatch = result.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
                if (preMatch && preMatch[1]) {
                    formattedQuery = preMatch[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
                    console.log("[PromQL Formatter] 方法2提取结果:", formattedQuery);
                }
            }
            
            // 方法3: 检查文本是否包含实际的代码内容
            if (!formattedQuery) {
                const codeContent = result.match(/```[\s\S]*?```/);
                if (codeContent) {
                    formattedQuery = codeContent[0].replace(/```/g, '').trim();
                    console.log("[PromQL Formatter] 方法3提取结果:", formattedQuery);
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
                        console.log("[PromQL Formatter] 方法4提取结果:", formattedQuery);
                    }
                } catch (e) {
                    console.error("[PromQL Formatter] 方法4提取失败:", e);
                }
            }
            
            // 如果所有方法都失败，返回原始查询
            if (!formattedQuery || formattedQuery.trim() === query.trim()) {
                console.log("[PromQL Formatter] 提取格式化后的 PromQL 失败，返回原始查询");
                return query;
            }
            
            return formattedQuery;
        } catch (error) {
            console.error("[PromQL Formatter] 格式化过程中出错:", error);
            throw error;
        }
    } else {
        throw new Error('未找到 PromQL 格式化函数');
    }
}

// 初始化扩展
async function initExtension() {
    const success = await initPromQLParser();
    if (success) {
        console.log('[PromQL Formatter] PromQL 格式化器扩展已准备就绪');
    } else {
        console.error('[PromQL Formatter] 初始化失败，扩展可能无法正常工作');
    }
}

// 当文档加载完成后初始化扩展
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtension);
} else {
    initExtension();
} 