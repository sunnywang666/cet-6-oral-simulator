# 腾讯云 Lighthouse 部署指南

## 🎯 推荐方案：本地构建后上传（最安全）

**这是最推荐的方式，因为你的 API Key 不会泄露给第三方。**

### 步骤 1：在本地构建项目

在项目根目录打开 PowerShell，执行：

```powershell
# 设置你的 Gemini API Key（替换成你的真实 Key）
$env:VITE_GEMINI_API_KEY="你的Gemini_API_Key"

# 安装依赖（如果还没安装）
npm install

# 构建生产版本
npm run build
```

构建完成后，会在项目根目录生成 `dist` 文件夹。

### 步骤 2：压缩 dist 文件夹

将 `dist` 文件夹压缩成 zip 文件（例如 `dist.zip`）

### 步骤 3：提供给 Lighthouse 部署人员

告诉部署人员：
- **只需要 `dist` 文件夹的内容**（或 `dist.zip`）
- **不需要源代码**
- **不需要 API Key**（已经构建在文件里了）

部署人员只需要：
1. 解压 `dist.zip`
2. 将解压后的文件上传到服务器的网站根目录（通常是 `/var/www/html` 或类似路径）
3. 配置 Nginx/Apache 指向这个目录

---

## 🔧 方案 2：让 Lighthouse 构建（需要提供 API Key）

**⚠️ 安全提示：这种方式需要把 API Key 提供给第三方，存在泄露风险。**

如果你选择这种方式，建议：

1. **使用临时 API Key**：
   - 在 Google AI Studio 创建一个新的 API Key（专门用于这次部署）
   - 部署完成后，如果担心安全，可以删除或限制这个 Key

2. **提供给部署人员的信息**：

```
项目路径：D:\MY PROJECTS\cet-6-oral-simulator

构建命令：
npm install
npm run build

环境变量：
VITE_GEMINI_API_KEY=你的Gemini_API_Key

构建输出目录：dist
```

3. **部署后验证**：
   - 部署完成后，立即在 Google AI Studio 检查 API 使用情况
   - 如果发现异常使用，立即删除或限制该 Key

---

## 📋 Lighthouse 服务器配置要求

### Nginx 配置示例

如果 Lighthouse 使用 Nginx，需要配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换成你的域名
    
    root /var/www/html;  # 或你的 dist 目录路径
    index index.html;
    
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

### Apache 配置示例

如果使用 Apache，需要 `.htaccess` 文件（已包含在 dist 中）：

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## ✅ 部署后检查清单

- [ ] 网站可以正常访问
- [ ] 页面样式正常加载
- [ ] 可以正常调用 Gemini API（测试一个口语练习）
- [ ] 浏览器控制台没有错误
- [ ] 如果使用方案 2，检查 API Key 使用情况是否正常

---

## 🔒 安全建议

1. **优先使用方案 1**（本地构建）：API Key 不会泄露
2. **如果必须用方案 2**：
   - 使用专门的临时 API Key
   - 部署后立即检查 API 使用情况
   - 考虑设置 API 使用限制（在 Google AI Studio 中）
3. **定期轮换 API Key**：每隔一段时间更换一次
4. **监控 API 使用**：定期检查是否有异常调用

---

## 🆘 常见问题

### Q: 构建时提示 "API key is not configured"
A: 确保设置了环境变量 `VITE_GEMINI_API_KEY`，在 PowerShell 中使用：
```powershell
$env:VITE_GEMINI_API_KEY="你的Key"
```

### Q: 部署后页面空白
A: 检查：
1. Nginx/Apache 配置是否正确（需要支持 SPA 路由）
2. 文件路径是否正确
3. 浏览器控制台是否有错误

### Q: API 调用失败
A: 检查：
1. 构建时是否正确注入了 API Key
2. 浏览器控制台的错误信息
3. Google AI Studio 中 API Key 是否有效

---

## 📞 需要帮助？

如果遇到问题，可以：
1. 检查浏览器控制台的错误信息
2. 查看服务器日志
3. 确认 API Key 是否正确配置
