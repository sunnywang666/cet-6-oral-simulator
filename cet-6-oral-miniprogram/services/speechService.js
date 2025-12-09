// speechService.js - 语音识别和合成服务（小程序版本）

// 语音识别服务（使用微信小程序录音 + 云函数或第三方API）
export const SpeechService = {
  recorder: null,
  isRecording: false,
  recorderState: 'inactive', // 'inactive' | 'recording' | 'paused'
  transcript: '',
  onTranscriptUpdate: null,
  sessionStartTime: null,
  lastResultTime: null,
  pauses: [],
  resultCount: 0,
  pauseThreshold: 1.0, // 1秒停顿阈值

  /**
   * 初始化录音器
   */
  init() {
    if (!this.recorder) {
      this.recorder = wx.getRecorderManager();
      
      this.recorder.onStart(() => {
        console.log('录音开始');
        this.isRecording = true;
        this.recorderState = 'recording';
        this.sessionStartTime = Date.now();
        this.lastResultTime = Date.now();
        this.pauses = [];
        this.resultCount = 0;
      });

      this.recorder.onStop((res) => {
        console.log('录音结束', res);
        this.isRecording = false;
        this.recorderState = 'inactive';
        // 处理录音文件，转换为文字
        if (res.tempFilePath) {
          this.processAudioFile(res.tempFilePath);
        }
      });

      this.recorder.onError((err) => {
        console.error('录音错误', err);
        this.isRecording = false;
        this.recorderState = 'inactive';
        // 忽略某些非关键错误
        if (err.errMsg && !err.errMsg.includes('inactive')) {
          wx.showToast({
            title: '录音失败',
            icon: 'none'
          });
        }
      });

      this.recorder.onPause(() => {
        console.log('录音暂停');
        this.recorderState = 'paused';
      });

      this.recorder.onResume(() => {
        console.log('录音恢复');
        this.recorderState = 'recording';
      });
    }
  },

  /**
   * 开始录音
   */
  startListening() {
    this.init();
    
    // 如果正在录音，先停止并等待
    if (this.isRecording || this.recorderState === 'recording') {
      console.warn('已经在录音中，先停止当前录音');
      this.stopListening();
      // 等待状态更新后再启动
      setTimeout(() => {
        this._doStartListening();
      }, 300);
      return;
    }

    // 正常情况直接启动
    this._doStartListening();
  },

  /**
   * 执行开始录音
   */
  _doStartListening() {
    // 再次检查状态，避免重复启动
    if (this.isRecording || this.recorderState === 'recording') {
      console.warn('录音器已在运行，跳过启动');
      return;
    }

    // 请求麦克风权限
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        try {
          this.recorder.start({
            duration: 60000, // 最长录音时间60秒
            sampleRate: 16000,
            numberOfChannels: 1,
            encodeBitRate: 96000,
            format: 'mp3'
          });
        } catch (error) {
          console.error('启动录音失败', error);
          this.recorderState = 'inactive';
          this.isRecording = false;
          wx.showToast({
            title: '启动录音失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showModal({
          title: '需要麦克风权限',
          content: '请允许使用麦克风进行语音识别',
          showCancel: false
        });
      }
    });
  },

  /**
   * 停止录音
   */
  stopListening() {
    if (!this.recorder) {
      return;
    }

    // 只在录音器处于活动状态时停止
    if (this.recorderState === 'recording' || this.recorderState === 'paused') {
      try {
        this.recorder.stop();
        // 状态会在 onStop 回调中更新
      } catch (error) {
        console.warn('停止录音时出错（可能已经停止）', error);
        // 如果出错，手动更新状态
        this.isRecording = false;
        this.recorderState = 'inactive';
      }
    } else {
      // 如果已经是 inactive 状态，直接更新标志
      console.log('录音器已经是 inactive 状态，无需停止');
      this.isRecording = false;
      this.recorderState = 'inactive';
    }
  },

  /**
   * 处理音频文件（转换为文字）
   * 注意：小程序需要使用云函数或第三方服务进行语音识别
   * 这里提供一个示例框架，实际需要接入语音识别服务
   */
  async processAudioFile(filePath) {
    // 方案1: 使用微信云开发 + 腾讯云语音识别
    // 方案2: 使用第三方API（如百度、讯飞等）
    // 方案3: 使用小程序插件
    
    // 示例：这里需要调用实际的语音识别API
    // 由于小程序限制，建议使用云函数或第三方服务
    
    wx.showLoading({
      title: '识别中...'
    });

    try {
      // TODO: 实现实际的语音识别逻辑
      // 这里使用模拟数据作为示例
      const transcript = await this.mockSpeechRecognition(filePath);
      
      this.transcript = transcript;
      if (this.onTranscriptUpdate) {
        this.onTranscriptUpdate(transcript);
      }
      
      wx.hideLoading();
    } catch (error) {
      console.error('语音识别失败', error);
      wx.hideLoading();
      wx.showToast({
        title: '识别失败',
        icon: 'none'
      });
    }
  },

  /**
   * 模拟语音识别（实际使用时需要替换为真实API）
   */
  async mockSpeechRecognition(filePath) {
    // 这里应该调用实际的语音识别服务
    // 示例：返回模拟文本
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("This is a mock transcript. Please implement real speech recognition.");
      }, 1000);
    });
  },

  /**
   * 获取当前文本
   */
  getTranscript() {
    return this.transcript || '';
  },

  /**
   * 重置文本
   */
  resetTranscript() {
    // 如果正在录音，先停止
    if (this.isRecording || this.recorderState === 'recording') {
      this.stopListening();
    }
    this.transcript = '';
    this.sessionStartTime = null;
    this.lastResultTime = null;
    this.pauses = [];
    this.resultCount = 0;
  },

  /**
   * 获取语音指标
   */
  getSpeechMetrics() {
    if (!this.sessionStartTime) {
      return null;
    }

    const duration = (Date.now() - this.sessionStartTime) / 1000; // 秒
    const pauseCount = this.pauses.length;
    const pauseDuration = this.pauses.reduce((sum, p) => sum + p, 0);
    const longestPause = this.pauses.length > 0 ? Math.max(...this.pauses) : 0;
    
    // 估算词数（基于文本长度）
    const wordCount = this.transcript.split(/\s+/).filter(w => w.length > 0).length;
    const averageWordsPerSecond = duration > 0 ? wordCount / duration : 0;
    
    // 计算流畅度分数（0-1）
    const pauseRatio = duration > 0 ? pauseDuration / duration : 0;
    const fluencyScore = Math.max(0, Math.min(1, 1 - pauseRatio - (pauseCount / Math.max(1, duration)) * 0.1));

    return {
      duration,
      pauseCount,
      pauseDuration,
      wordCount,
      averageWordsPerSecond,
      longestPause,
      fluencyScore
    };
  }
};

// 文本转语音服务
export const TTSService = {
  /**
   * 播放文本（使用微信小程序语音合成）
   */
  speak(text) {
    return new Promise((resolve, reject) => {
      // 微信小程序使用 wx.createInnerAudioContext 或 云函数TTS
      // 这里使用简化的实现
      
      // 方案1: 使用云函数调用TTS服务
      // 方案2: 使用小程序插件
      
      // 示例：直接显示文本（实际需要实现TTS）
      console.log('TTS:', text);
      
      // 模拟播放完成
      setTimeout(() => {
        resolve();
      }, text.length * 50); // 根据文本长度估算时间
    });
  },

  /**
   * 停止播放
   */
  stopSpeaking() {
    // 停止当前播放
    console.log('TTS stopped');
  }
};
