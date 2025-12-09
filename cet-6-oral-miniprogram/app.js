// app.js
App({
  onLaunch() {
    // 检查小程序版本
    const updateManager = wx.getUpdateManager();
    updateManager.onCheckForUpdate((res) => {
      if (res.hasUpdate) {
        updateManager.onUpdateReady(() => {
          wx.showModal({
            title: '更新提示',
            content: '新版本已经准备好，是否重启应用？',
            success: (res) => {
              if (res.confirm) {
                updateManager.applyUpdate();
              }
            }
          });
        });
      }
    });

    // 初始化存储
    this.initStorage();
  },

  initStorage() {
    // 检查是否有历史记录
    const history = wx.getStorageSync('cet6_exam_history') || [];
    console.log('历史记录数量:', history.length);
  },

  globalData: {
    userInfo: null,
    apiKey: 'AIzaSyCA7YGsUo95mqKn6zzsT0i5GQypTodEFUM' // 默认API Key
  }
});
