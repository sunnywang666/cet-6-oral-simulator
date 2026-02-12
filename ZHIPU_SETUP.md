# 智谱 AI (Zhipu AI) 配置指南

## API Key 格式

智谱 API Key 格式：`{API Key ID}.{secret}`

例如：`6d9013607195402eb9fb819e15ef185f.cXE1ityI6LeCfNpA`

## 配置步骤

### 1. 本地开发

在项目根目录创建 `.env.local` 文件：

```env
VITE_AI_PROVIDER=zhipu
VITE_ZHIPU_API_KEY=6d9013607195402eb9fb819e15ef185f.cXE1ityI6LeCfNpA
```

然后启动开发服务器：

```powershell
npm run dev
```

### 2. 生产构建

```powershell
$env:VITE_AI_PROVIDER="zhipu"
$env:VITE_ZHIPU_API_KEY="6d9013607195402eb9fb819e15ef185f.cXE1ityI6LeCfNpA"
$env:VITE_BASE_PATH="/"
npm run build
```

### 3. 部署到服务器

将构建好的 `dist` 文件夹上传到服务器即可。

## 注意事项

1. **API Key 安全**：不要将 API Key 提交到 Git 仓库
2. **配额限制**：注意智谱 API 的调用配额和频率限制
3. **模型选择**：默认使用 `glm-4` 模型，可以在 `services/zhipuService.ts` 中修改

## 如果遇到认证错误

如果遇到 401 认证错误，可能需要：
1. 检查 API Key 格式是否正确（应该是 `{ID}.{secret}` 格式）
2. 确认 API Key 是否有效
3. 检查智谱控制台中的 API Key 状态

## 测试

部署后，进行一次完整的考试测试，查看：
1. 是否能正常生成考试题目
2. 是否能正常进行对话
3. 是否能正常生成评分报告

如果遇到问题，查看浏览器控制台的错误信息。
