# GitHub 部署指南

## 步骤 1: 在 GitHub 上创建仓库

1. 访问 [GitHub](https://github.com)
2. 点击右上角的 "+" 按钮，选择 "New repository"
3. 填写仓库信息：
   - **Repository name**: `cet-6-oral-simulator`
   - **Description**: `CET-6 口语考试模拟器 - A React-based oral exam simulator for CET-6`
   - **Visibility**: 选择 Public 或 Private
   - **不要**勾选 "Initialize this repository with a README"（我们已经有了）
4. 点击 "Create repository"

## 步骤 2: 连接本地仓库到 GitHub

在项目目录下运行以下命令（将 `YOUR_USERNAME` 替换为你的 GitHub 用户名）：

```bash
# 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/cet-6-oral-simulator.git

# 或者使用 SSH（如果你配置了 SSH key）
# git remote add origin git@github.com:YOUR_USERNAME/cet-6-oral-simulator.git

# 推送代码到 GitHub
git branch -M main
git push -u origin main
```

## 步骤 3: 配置 GitHub Pages（可选）

如果你想通过 GitHub Pages 部署：

1. 在 GitHub 仓库页面，点击 **Settings**
2. 在左侧菜单找到 **Pages**
3. 在 **Source** 部分：
   - 选择 **GitHub Actions** 作为部署源
   - 项目已配置自动部署工作流（`.github/workflows/deploy.yml`）

## 步骤 4: 配置 GitHub Secrets（用于 API Key）

如果使用 GitHub Pages 部署，需要配置 API Key：

1. 在 GitHub 仓库页面，点击 **Settings**
2. 在左侧菜单找到 **Secrets and variables** > **Actions**
3. 点击 **New repository secret**
4. 添加以下 Secret：
   - **Name**: `GEMINI_API_KEY`
   - **Value**: 你的 Gemini API Key
5. 点击 **Add secret**

## 步骤 5: 验证部署

1. 推送代码后，GitHub Actions 会自动运行
2. 在仓库页面点击 **Actions** 标签查看部署状态
3. 部署成功后，访问：`https://YOUR_USERNAME.github.io/cet-6-oral-simulator/`

## 注意事项

- ⚠️ **API Key 安全**：确保 `.env.local` 文件在 `.gitignore` 中（已配置）
- 🔒 **不要提交敏感信息**：API Key 应该通过 GitHub Secrets 配置
- 📝 **提交前检查**：运行 `git status` 确保没有意外添加敏感文件

## 常用 Git 命令

```bash
# 查看状态
git status

# 添加文件
git add .

# 提交更改
git commit -m "描述信息"

# 推送到 GitHub
git push

# 拉取最新代码
git pull
```

