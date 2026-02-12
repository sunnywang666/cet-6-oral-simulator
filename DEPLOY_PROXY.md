# 代理服务器部署完整指南

## 问题说明

由于 Google Gemini API 在中国大陆无法直接访问，需要搭建代理服务器。

## 部署步骤

### 第一步：在腾讯云服务器上搭建代理服务器

#### 1.1 安装 Node.js

```bash
# 使用 nvm 安装（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 验证安装
node -v
npm -v
```

#### 1.2 创建代理服务器目录

```bash
mkdir -p /var/www/gemini-proxy
cd /var/www/gemini-proxy
```

#### 1.3 上传文件到服务器

将以下文件上传到 `/var/www/gemini-proxy`：
- `proxy-server.js`
- `proxy-package.json`（重命名为 `package.json`）

或者直接在服务器上创建：

```bash
# 创建 package.json
cat > package.json << 'EOF'
{
  "name": "gemini-proxy-server",
  "version": "1.0.0",
  "description": "Proxy server for Gemini API",
  "main": "proxy-server.js",
  "scripts": {
    "start": "node proxy-server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "@google/generative-ai": "^0.24.1"
  }
}
EOF

# 创建 proxy-server.js（复制文件内容）
nano proxy-server.js
# 粘贴 proxy-server.js 的内容，保存退出
```

#### 1.4 安装依赖

```bash
npm install
```

#### 1.5 设置环境变量并启动

```bash
# 设置 API Key
export GEMINI_API_KEY="你的Gemini_API_Key"

# 测试运行
node proxy-server.js
```

如果看到 "Gemini Proxy Server running on port 3001"，说明启动成功。

#### 1.6 使用 PM2 管理进程（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动代理服务器
GEMINI_API_KEY="你的Gemini_API_Key" pm2 start proxy-server.js --name gemini-proxy

# 设置开机自启
pm2 save
pm2 startup
# 按照提示执行输出的命令
```

### 第二步：配置 Nginx 反向代理

编辑 Nginx 配置文件（通常在 `/etc/nginx/sites-available/default` 或 `/etc/nginx/nginx.conf`）：

```nginx
server {
    listen 80;
    server_name cet6-simulator.com www.cet6-simulator.com;

    # 前端静态文件
    root /var/www/cet6-simulator;
    index index.html;

    # 代理 API 请求到 Node.js 服务器
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 前端 SPA 路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

重启 Nginx：

```bash
sudo nginx -t  # 测试配置
sudo nginx -s reload  # 重新加载配置
```

### 第三步：修改前端代码使用代理

#### 3.1 构建时设置环境变量

```powershell
# 在本地构建时
$env:VITE_USE_PROXY="true"
$env:VITE_PROXY_URL="/api"  # 使用相对路径，因为代理在同一域名下
$env:VITE_BASE_PATH="/"
npm run build
```

#### 3.2 或者创建 .env.production 文件

在项目根目录创建 `.env.production`：

```env
VITE_USE_PROXY=true
VITE_PROXY_URL=/api
VITE_BASE_PATH=/
```

然后构建：

```powershell
npm run build
```

### 第四步：部署前端文件

将构建好的 `dist` 文件夹内容上传到 `/var/www/cet6-simulator`。

### 第五步：测试

1. 访问 `http://cet6-simulator.com`
2. 打开浏览器开发者工具（F12）→ Network 标签
3. 进行一次考试
4. 查看 Network 标签，应该看到请求发送到 `/api/gemini/generate` 而不是直接到 Google API

## 故障排查

### 问题 1：代理服务器无法启动

检查：
- Node.js 是否正确安装：`node -v`
- 依赖是否安装：`npm list`
- API Key 是否正确设置：`echo $GEMINI_API_KEY`
- 端口是否被占用：`netstat -tulpn | grep 3001`

### 问题 2：前端无法连接到代理

检查：
- 代理服务器是否运行：`pm2 list` 或 `ps aux | grep node`
- Nginx 配置是否正确：`sudo nginx -t`
- 防火墙是否开放端口：`sudo ufw status`

### 问题 3：429 错误（API 配额超限）

这是 Google API 的速率限制，不是代理问题。解决方案：
1. 检查 Google Cloud Console 中的 API 配额
2. 等待一段时间后重试
3. 升级到付费计划以增加配额
4. 添加请求频率限制（在代理服务器中实现）

## 关于 429 错误的额外说明

429 错误表示 API 配额用完了，可能原因：
- 免费配额已用完
- 请求频率太高
- 需要升级到付费计划

可以在代理服务器中添加重试逻辑和频率限制。

## 安全建议

1. **不要在代码中硬编码 API Key**
2. **使用环境变量存储 API Key**
3. **限制代理服务器的访问**（可以添加 IP 白名单）
4. **使用 HTTPS**（配置 SSL 证书）

## 完成！

现在你的网站应该可以通过代理服务器正常访问 Gemini API 了！
