# 部署指南

## 🚨 重要安全提示

**API Key 安全警告**：当前的实现将 API Key 直接嵌入到前端代码中，这在公开部署时**不安全**。任何人都可以在浏览器中查看你的 API Key。

### 解决方案

#### 方案 1：使用 GitHub Secrets（推荐用于 GitHub Pages）

1. 在 GitHub 仓库设置中添加 Secret：
   - 进入仓库 → Settings → Secrets and variables → Actions
   - 点击 "New repository secret"
   - Name: `GEMINI_API_KEY`
   - Value: 你的 API Key
   - 点击 "Add secret"

2. GitHub Actions 会自动在构建时注入 API Key

#### 方案 2：让用户自己配置 API Key（最安全）

修改应用，让用户在前端输入自己的 API Key，不存储在代码中。

#### 方案 3：使用后端代理（最安全但需要服务器）

创建一个后端服务来代理 API 请求，API Key 只存储在后端。

---

## 📦 部署到 GitHub Pages

### 步骤 1：准备仓库

1. 在 GitHub 创建新仓库（如果还没有）
2. 确保 `.env.local` 在 `.gitignore` 中（不要提交 API Key）

### 步骤 2：配置 GitHub Pages

1. 进入仓库 → Settings → Pages
2. Source: 选择 "GitHub Actions"
3. 保存设置

### 步骤 3：配置 GitHub Secrets（用于自动部署）

1. 进入仓库 → Settings → Secrets and variables → Actions
2. 添加 Secret：
   - Name: `GEMINI_API_KEY`
   - Value: 你的 Gemini API Key

### 步骤 4：推送代码

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

### 步骤 5：自动部署

- 推送代码后，GitHub Actions 会自动构建和部署
- 部署完成后，访问：`https://你的用户名.github.io/cet-6-oral-simulator/`

---

## 🔧 手动部署（不使用 GitHub Actions）

### 步骤 1：构建项目

```bash
# 设置环境变量（Windows PowerShell）
$env:GEMINI_API_KEY="你的API密钥"
npm run build
```

### 步骤 2：部署 dist 文件夹

将 `dist` 文件夹的内容上传到：
- GitHub Pages
- Netlify
- Vercel
- 或其他静态网站托管服务

---

## 📝 注意事项

1. **API Key 安全**：
   - ❌ 不要将 `.env.local` 提交到 Git
   - ❌ 不要在代码中硬编码 API Key
   - ✅ 使用 GitHub Secrets 或环境变量
   - ✅ 考虑让用户自己输入 API Key

2. **仓库名称**：
   - 如果仓库名不是 `cet-6-oral-simulator`，需要修改 `vite.config.ts` 中的 `base` 路径

3. **浏览器兼容性**：
   - 需要 Chrome/Edge（支持 Web Speech API）
   - 需要麦克风权限

4. **API 配额**：
   - 注意 Gemini API 的使用限制
   - 考虑添加使用限制或提示

---

## 🌐 其他部署选项

### Vercel
```bash
npm i -g vercel
vercel
```

### Netlify
1. 连接 GitHub 仓库
2. Build command: `npm run build`
3. Publish directory: `dist`
4. 添加环境变量：`GEMINI_API_KEY`

### 自定义域名
在 `vite.config.ts` 中设置 `base: '/'` 即可使用自定义域名。

