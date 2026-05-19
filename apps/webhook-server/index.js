const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');

const PORT = 3000;
// 使用環境變數或預設密鑰
const SECRET = process.env.WEBHOOK_SECRET || 'beauty-os-secret-key-2026';

const server = http.createServer((req, res) => {
    // 允許跨域請求 (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                // 驗證密鑰
                if (data.secret !== SECRET) {
                    res.writeHead(401);
                    res.end(JSON.stringify({ error: 'Unauthorized' }));
                    return;
                }

                const action = data.action; // 'start', 'stop', 'status'
                if (!['start', 'stop', 'status'].includes(action)) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid action' }));
                    return;
                }

                console.log(`Executing action: ${action}`);

                // 執行控制腳本
                exec(`cd ~/beauty-os && bash auto-control.sh ${action}`, (error, stdout, stderr) => {
                    if (error) {
                        res.writeHead(500);
                        res.end(JSON.stringify({ error: error.message }));
                        return;
                    }
                    res.writeHead(200);
                    res.end(JSON.stringify({ 
                        message: `Action ${action} executed successfully`, 
                        output: stdout 
                    }));
                });
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    } else {
        res.writeHead(405);
        res.end();
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Beauty OS Webhook Server running on port ${PORT}`);
});
