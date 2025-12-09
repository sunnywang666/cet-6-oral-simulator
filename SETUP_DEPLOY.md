# 一键部署配置指南

## 🚀 快速配置（3步完成）

### 步骤 1: 配置 GitHub Secret（API Key）

1. 打开浏览器，访问：
   ```
   https://github.com/sunnywang666/cet-6-oral-simulator/settings/secrets/actions
   ```

2. 点击右上角的 **"New repository secret"** 按钮

3. 填写信息：
   - **Name**: `GEMINI_API_KEY`
   - **Secret**: `AIzaSyBJwZbwagHUbZFKoiArwMI22TmHgEoz9po`

4. 点击 **"Add secret"**

### 步骤 2: 启用 GitHub Pages

1. 访问：
   ```
   https://github.com/sunnywang666/cet-6-oral-simulator/settings/pages
   ```

2. 在 **"Source"** 部分：
   - 选择 **"GitHub Actions"**（不是 "Deploy from a branch"）
   - 如果已经选择了其他选项，改为 "GitHub Actions"

3. 页面会自动保存

### 步骤 3: 触发部署

**方式 1：自动部署（推荐）**
- 代码已经推送，GitHub Actions 会自动运行
- 访问：https://github.com/sunnywang666/cet-6-oral-simulator/actions
- 查看部署状态

**方式 2：手动触发**
1. 访问：https://github.com/sunnywang666/cet-6-oral-simulator/actions
2. 点击左侧的 **"Deploy to GitHub Pages"** 工作流
3. 点击右侧的 **"Run workflow"** 按钮
4. 选择 `main` 分支
5. 点击 **"Run workflow"**

## ✅ 部署完成后

访问你的网站：
```
https://sunnywang666.github.io/cet-6-oral-simulator/
```

## 📝 注意事项

- ⏱️ 首次部署需要 3-5 分钟
- 🔄 之后每次推送代码会自动重新部署
- 🔑 API Key 已配置在代码中作为 fallback，即使不配置 Secret 也能工作（但推荐配置 Secret）

## 🎉 分享给朋友

部署完成后，直接把链接发给朋友：
```
https://sunnywang666.github.io/cet-6-oral-simulator/
```

朋友打开链接就能直接使用，无需任何安装或配置！




