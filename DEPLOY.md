# 部署指南

## 🚨 重要安全提示

**当前状态**：项目已配置使用 GitHub Secrets 方案，API Key 在构建时从 GitHub Secrets 注入，不会暴露在源代码中。

### 解决方案

#### 方案 1：使用 GitHub Secrets（✅ 已实现，推荐用于 GitHub Pages）

**这是当前项目使用的方案，已配置完成！**

1. 在 GitHub 仓库设置中添加 Secret：
   - 进入仓库 → Settings → Secrets and variables → Actions
   - 点击 "New repository secret"
   - Name: `GEMINI_API_KEY`
   - Value: 你的 Gemini API Key（例如：`YOUR_GEMINI_API_KEY`）
   - 点击 "Add secret"

2. GitHub Actions 会自动在构建时注入 API Key：
   - 工作流文件 `.github/workflows/deploy.yml` 已配置
   - 构建时会从 GitHub Secrets 读取 `GEMINI_API_KEY`
   - 未设置 Secret 时，生产构建会直接失败，避免构建出没有 Key 的产物
   - 如果未设置 Secret，前端将无法调用 Gemini API，需要手动提供 Key
   - API Key 仅在构建时注入，不会存储在仓库文件中

3. 验证配置：
   - 推送代码后，GitHub Actions 会自动运行
   - 检查 Actions 标签页，确保构建成功
   - 部署后访问网站，测试 API 是否正常工作


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
2. 点击 "New repository secret"
3. 添加 Secret：
   - **Name**: `GEMINI_API_KEY`（必须完全一致）
   - **Value**: 你的 Gemini API Key
   - 点击 "Add secret"

**重要提示**：
- Secret 名称必须为 `GEMINI_API_KEY`（与工作流文件中的配置一致）
- 项目不再提供硬编码的 fallback API Key，请务必配置 Secret 或在本地 `.env` 中设置
- Secret 只在构建时使用，不会暴露在公开的代码中

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
$env:VITE_GEMINI_API_KEY="你的API密钥"
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
   - ✅ **已实现**：使用 GitHub Secrets 在构建时注入 API Key
   - ✅ 工作流文件已配置：`.github/workflows/deploy.yml`
   - ✅ Vite 配置已设置：`vite.config.ts` 会读取 `VITE_GEMINI_API_KEY` 环境变量
   - ❌ 不要将 `.env.local` 提交到 Git
   - ❌ 不要在代码中硬编码 API Key（已移除 fallback key，避免泄露）
   - 💡 可选：考虑让用户自己输入 API Key（最安全）

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
4. 添加环境变量：`VITE_GEMINI_API_KEY`

### 自定义域名
在 `vite.config.ts` 中设置 `base: '/'` 即可使用自定义域名。

