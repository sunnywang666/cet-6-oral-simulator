# 修复部署错误指南

## 🔴 错误原因

错误信息：`Get Pages site failed. Please verify that the repository has Pages enabled and configured to build using GitHub Actions`

**原因**：GitHub Pages 还没有启用，或者没有配置为使用 GitHub Actions。

## ✅ 解决步骤

### 步骤 1: 启用 GitHub Pages

1. **访问仓库设置页面**：
   ```
   https://github.com/sunnywang666/cet-6-oral-simulator/settings/pages
   ```

2. **在 "Source" 部分**：
   - 如果显示 "None" 或 "Deploy from a branch"
   - **改为选择 "GitHub Actions"**
   - 页面会自动保存

3. **确认设置**：
   - 应该看到 "Your site is ready to be published at..."
   - Source 显示为 "GitHub Actions"

### 步骤 2: 配置 API Key Secret（如果还没配置）

1. **访问 Secrets 页面**：
   ```
   https://github.com/sunnywang666/cet-6-oral-simulator/settings/secrets/actions
   ```

2. **添加 Secret**：
   - 点击 "New repository secret"
   - Name: `GEMINI_API_KEY`
   - Secret: `AIzaSyBJwZbwagHUbZFKoiArwMI22TmHgEoz9po`
   - 点击 "Add secret"

### 步骤 3: 重新运行工作流

1. **访问 Actions 页面**：
   ```
   https://github.com/sunnywang666/cet-6-oral-simulator/actions
   ```

2. **重新运行失败的工作流**：
   - 点击失败的工作流运行
   - 点击右上角的 "Re-run jobs" 按钮
   - 选择 "Re-run all jobs"

或者：

3. **手动触发新部署**：
   - 在 Actions 页面，点击左侧的 "Deploy to GitHub Pages"
   - 点击右侧的 "Run workflow"
   - 选择 `main` 分支
   - 点击 "Run workflow"

## 📋 检查清单

完成以下所有步骤后，部署应该会成功：

- [ ] GitHub Pages 已启用（Settings > Pages > Source = "GitHub Actions"）
- [ ] API Key Secret 已配置（Settings > Secrets > Actions > GEMINI_API_KEY）
- [ ] 工作流已重新运行

## 🎯 预期结果

部署成功后：
- 工作流状态显示 "Success"（绿色 ✓）
- 网站地址：`https://sunnywang666.github.io/cet-6-oral-simulator/`
- 可以正常访问和使用

## ⚠️ 注意事项

- 首次部署需要 3-5 分钟
- 如果仍然失败，检查 Actions 日志中的具体错误信息
- 确保仓库是 Public，或者你的账户有 GitHub Pages 权限

