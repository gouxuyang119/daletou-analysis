import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'daletou-main/dist')));

// 处理SPA路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'daletou-main/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 本地服务器已启动！`);
  console.log(`📱 本地访问: http://localhost:${PORT}`);
  console.log(`🌐 局域网访问: http://[你的IP地址]:${PORT}`);
  console.log(`\n💡 提示: 可以通过局域网IP让其他设备访问`);
  console.log(`🔧 停止服务器: Ctrl+C\n`);
});