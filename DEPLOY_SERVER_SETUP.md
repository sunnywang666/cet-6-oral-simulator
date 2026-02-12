# 部署到 cet6-simulator.com 服务器设置

## ✅ 已创建自动部署工作流

我已经创建了 `.github/workflows/deploy-to-cet6-server.yml`，会自动部署到你的服务器。

## 🔑 需要添加的 GitHub Secrets

在 GitHub 仓库中添加以下 Secret：

1. **访问**：https://github.com/sunnywang666/cet-6-oral-simulator/settings/secrets/actions

2. **添加 Secret**：
   - ✅ `ZHIPU_API_KEY` - 你已经添加了
   - ⚠️ `SERVER_SSH_KEY` - **需要添加**

### 如何获取 SSH Key

#### 方式 1：如果你已经有 SSH Key

如果你本地已经有 SSH key，可以：

```powershell
# 查看你的 SSH key
Get-Content ~/.ssh/id_rsa
# 或者
Get-Content ~/.ssh/id_ed25519
```

复制私钥内容，添加到 GitHub Secret `SERVER_SSH_KEY`。

#### 方式 2：生成新的 SSH Key（推荐）

```powershell
# 生成新的 SSH key（专门用于部署）
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key

# 查看公钥（需要添加到服务器）
Get-Content ~/.ssh/github_deploy_key.pub

# 查看私钥（需要添加到 GitHub Secret）
Get-Content ~/.ssh/github_deploy_key
```

### 在服务器上添加公钥

1. **复制公钥内容**（从 `github_deploy_key.pub`）

2. **连接到服务器**：
   ```bash
   ssh root@62.234.55.246
   ```

3. **添加公钥到 authorized_keys**：
   ```bash
   echo "你的公钥内容" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

## 🚀 部署流程

设置完成后：

1. **推送代码到 GitHub**：
   ```powershell
   git add .
   git commit -m "Add server deployment workflow"
   git push origin main
   ```

2. **自动部署**：
   - GitHub Actions 会自动构建
   - 自动上传文件到服务器
   - 自动复制到 Docker 容器

3. **查看部署状态**：
   - 访问：https://github.com/sunnywang666/cet-6-oral-simulator/actions
   - 查看最新的工作流运行状态

## 📋 部署检查清单

- [ ] `ZHIPU_API_KEY` Secret 已添加 ✅
- [ ] `SERVER_SSH_KEY` Secret 已添加
- [ ] SSH 公钥已添加到服务器
- [ ] 代码已推送到 GitHub
- [ ] GitHub Actions 工作流运行成功
- [ ] 访问 https://cet6-simulator.com 测试

## 🔧 如果遇到问题

### SSH 连接失败

检查：
- SSH key 是否正确
- 服务器是否允许 SSH 连接
- 防火墙是否开放 22 端口

### 文件上传失败

检查：
- 服务器路径是否正确
- 文件权限是否正确
- Docker 容器名称是否正确

### Docker 复制失败

可以手动执行：
```bash
ssh root@62.234.55.246
docker cp /root/20260210201653_20260212182854/. 20260210201653_20260212182854-web-1:/usr/share/nginx/html/
```

## 🎯 快速开始

1. **生成 SSH Key**（如果还没有）：
   ```powershell
   ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_deploy_key
   ```

2. **添加公钥到服务器**：
   ```bash
   ssh-copy-id -i ~/.ssh/github_deploy_key.pub root@62.234.55.246
   ```
   或者手动复制公钥内容到服务器的 `~/.ssh/authorized_keys`

3. **添加私钥到 GitHub Secret**：
   - 复制 `~/.ssh/github_deploy_key` 的内容
   - 添加到 GitHub Secret `SERVER_SSH_KEY`

4. **推送代码**：
   ```powershell
   git add .github/workflows/deploy-to-cet6-server.yml
   git commit -m "Add server deployment"
   git push
   ```

完成！之后每次推送代码都会自动部署。
