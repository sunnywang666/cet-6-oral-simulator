// pages/practice-part/practice-part.js
Page({
  data: {
    selectedPart: null
  },

  onLoad() {
    // 页面加载
  },

  selectPart(e) {
    const part = e.currentTarget.dataset.part;
    this.setData({
      selectedPart: part
    });
  },

  confirmPart() {
    if (!this.data.selectedPart) {
      wx.showToast({
        title: '请选择练习部分',
        icon: 'none'
      });
      return;
    }

    getApp().globalData.practicePart = this.data.selectedPart;
    wx.redirectTo({
      url: '/pages/exam/exam'
    });
  }
});



