// pages/mode/mode.js
Page({
  data: {
    selectedMode: null
  },

  onLoad() {
    // 页面加载
  },

  selectMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({
      selectedMode: mode
    });
  },

  confirmMode() {
    if (!this.data.selectedMode) {
      wx.showToast({
        title: '请选择考试模式',
        icon: 'none'
      });
      return;
    }

    // 保存模式选择，跳转到考试类型选择
    getApp().globalData.examMode = this.data.selectedMode;
    wx.navigateTo({
      url: '/pages/exam-type/exam-type'
    });
  }
});



