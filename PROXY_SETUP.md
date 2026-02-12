# Gemini API 代理服务器设置指南

## 问题说明

由于 Google 服务在中国大陆无法直接访问，前端浏览器无法直接调用 Gemini API。解决方案是在服务器上搭建一个代理服务器。

## 方案 1：在腾讯云服务器上搭建代理（推荐）

### 步骤 1：在服务器上安装 Node.js

```bash
# 使用 nvm 安装 Node.js（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

### 步骤 2：创建代理服务器目录

```bash
mkdir -p /var/www/gemini-proxy
cd /var/www/gemini-proxy
```

### 步骤 3：上传文件

将以下文件上传到服务器：
- `proxy-server.js`
- `proxy-package.json`（重命名为 `package.json`）

### 步骤 4：安装依赖

```bash
npm install
```

### 步骤 5：设置环境变量

```bash
# 创建 .env 文件
echo "GEMINI_API_KEY=你的API_Key" > .env
```

或者使用 PM2 管理进程：

```bash
npm install -g pm2
GEMINI_API_KEY=你的API_Key pm2 start proxy-server.js --name gemini-proxy
pm2 save
pm2 startup
```

### 步骤 6：配置 Nginx 反向代理

在 Nginx 配置中添加：

```nginx
# Gemini API 代理
location /api/gemini/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

然后重启 Nginx：
```bash
sudo nginx -s reload
```

### 步骤 7：修改前端代码

修改 `services/geminiService.ts`，使用代理接口而不是直接调用 Gemini API。

---

## 方案 2：使用云函数/Serverless（更简单）

### 腾讯云 Serverless

1. 在腾讯云创建云函数
2. 使用 `proxy-server.js` 的代码
3. 配置环境变量 `GEMINI_API_KEY`
4. 前端调用云函数接口

---

## 方案 3：使用海外服务器部署（最简单）

如果可能，建议：
- 使用 Vercel、Netlify 等海外服务部署前端
- 或者使用海外服务器（如 AWS、DigitalOcean）

这样前端可以直接访问 Gemini API，无需代理。

---

## 方案 4：使用国内 AI 服务替代

如果必须使用国内服务，可以考虑：
- 百度文心一言 API
- 阿里通义千问 API
- 腾讯混元 API

需要修改代码以适配这些 API。
