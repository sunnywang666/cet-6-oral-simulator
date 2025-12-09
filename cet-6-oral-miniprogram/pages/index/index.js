// pages/index/index.js
Page({
  onLoad() {
    // 页面加载
  },

  startExam() {
    wx.navigateTo({
      url: '/pages/mode/mode'
    });
  },

  viewHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  }
});



