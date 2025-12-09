# CET-6 口语考试模拟器 - 微信小程序版

基于原网站版本开发的微信小程序版本，完整还原所有功能和UI风格。

## 功能特点

- 📝 **完整考试模式**：模拟完整的 CET-6 口语考试流程（5个部分）
- 🎯 **专项特训模式**：可以单独练习某个部分
- 🎤 **实时语音识别**：使用微信小程序录音API
- 🔊 **语音合成**：AI 考官和对话伙伴的语音提示
- 📊 **智能评分系统**：基于官方 SET-6 评分标准，三个维度评估
- 📈 **语音指标分析**：分析话语长短、流畅度、停顿等
- 💾 **历史记录**：自动保存考试记录，支持查看和导出
- 🎨 **现代化 UI**：适配手机端，美观易用

## 项目结构

```
cet-6-oral-miniprogram/
├── pages/              # 页面
│   ├── index/         # 首页
│   ├── mode/          # 模式选择
│   ├── exam-type/     # 考试类型选择
│   ├── practice-part/ # 练习部分选择
│   ├── exam/          # 考试页面
│   ├── report/        # 报告页面
│   └── history/       # 历史记录
├── components/         # 组件
│   ├── timer/         # 倒计时组件
│   └── visualizer/    # 语音可视化组件
├── services/          # 服务层
│   ├── geminiService.js    # Gemini API 服务
│   └── speechService.js    # 语音识别和合成服务
├── utils/             # 工具类
│   ├── types.js            # 类型定义
│   ├── storageService.js   # 存储服务
│   └── punctuationService.js # 标点符号处理
├── app.js             # 小程序入口
├── app.json           # 小程序配置
└── app.wxss           # 全局样式
```

## 使用说明

### 1. 配置 AppID

在 `project.config.json` 中配置您的小程序 AppID：

```json
{
  "appid": "your-appid-here"
}
```

### 2. 配置 API Key

在 `app.js` 中配置 Gemini API Key：

```javascript
globalData: {
  apiKey: 'your-api-key-here'
}
```

### 3. 语音识别配置

**重要**：小程序中的语音识别需要使用以下方案之一：

1. **微信云开发 + 腾讯云语音识别**
2. **第三方语音识别API**（如百度、讯飞等）
3. **小程序插件**

当前代码中的 `speechService.js` 提供了框架，需要根据实际使用的服务进行实现。

### 4. 文本转语音配置

小程序中的TTS也需要使用云函数或第三方服务。当前代码提供了框架，需要实际实现。

## 开发

1. 使用微信开发者工具打开项目
2. 配置 AppID 和 API Key
3. 实现语音识别和TTS服务
4. 编译运行

## 注意事项

- ⚠️ **语音识别**：需要实现实际的语音识别服务（当前为框架代码）
- ⚠️ **文本转语音**：需要实现实际的TTS服务（当前为框架代码）
- 🔑 **API Key 安全**：不要将 API Key 提交到代码仓库
- 🎤 **麦克风权限**：首次使用需要授权麦克风权限

## 与原网站版本的对应关系

| 功能 | 网站版本 | 小程序版本 |
|------|---------|-----------|
| 考试流程 | ✅ | ✅ |
| 语音识别 | Web Speech API | 微信录音API + 云服务 |
| 语音合成 | Web Speech Synthesis | 云函数TTS |
| 评分系统 | ✅ | ✅ |
| 历史记录 | localStorage | wx.storage |
| UI风格 | Tailwind CSS | 小程序样式 |

## 许可证

MIT License



