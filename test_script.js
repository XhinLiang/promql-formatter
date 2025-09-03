// 测试脚本 - 验证formatter功能
const testQueries = [
    'sum(rate(http_requests_total[5m])) by (status)',
    '100 * sum(rate(jaeger_agent_http_server_errors_total[1m])) by (instance, job, namespace) / sum(rate(jaeger_agent_http_server_total[1m])) by (instance, job, namespace)>1',
    'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))'
];

const formatters = ['main', 'vic'];

function runTests() {
    console.log('开始测试formatter功能...');
    
    testQueries.forEach((query, i) => {
        console.log(`\n测试查询 ${i + 1}: ${query}`);
        
        formatters.forEach(formatter => {
            console.log(`  使用 ${formatter} formatter:`);
            try {
                // 设置输入
                document.getElementById('promqlInput').value = query;
                document.getElementById('resultDiv').innerHTML = '';
                
                // 调用WASM函数
                parsepromql(query, formatter);
                
                // 获取结果
                const resultHTML = document.getElementById('resultDiv').innerHTML;
                
                // 提取格式化的查询
                const codeMatch = resultHTML.match(/<code[^>]*>([\s\S]*?)<\/code>/);
                let formattedQuery = query;
                if (codeMatch) {
                    formattedQuery = codeMatch[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
                }
                
                console.log(`    结果: ${formattedQuery}`);
                
                // 验证是否成功格式化（结果不应该等于原始查询，除非已经是最佳格式）
                if (formattedQuery !== query) {
                    console.log(`    ✓ ${formatter} formatter成功格式化`);
                } else {
                    console.log(`    ○ ${formatter} formatter保持原格式（可能已经是最佳格式）`);
                }
                
            } catch (error) {
                console.error(`    ✗ ${formatter} formatter出错: ${error.message}`);
            }
        });
    });
}

// 当WASM加载完成后运行测试
if (typeof parsepromql === 'function') {
    runTests();
} else {
    console.log('等待WASM模块加载...');
    setTimeout(() => {
        if (typeof parsepromql === 'function') {
            runTests();
        } else {
            console.error('WASM模块未能加载');
        }
    }, 2000);
}