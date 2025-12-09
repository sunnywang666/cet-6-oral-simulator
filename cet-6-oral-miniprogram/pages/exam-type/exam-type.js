// pages/exam-type/exam-type.js
Page({
  data: {
    selectedType: null
  },

  onLoad() {
    // 页面加载
  },

  selectType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      selectedType: type
    });
  },

  confirmType() {
    if (!this.data.selectedType) {
      wx.showToast({
        title: '请选择考试类型',
        icon: 'none'
      });
      return;
    }

    getApp().globalData.examType = this.data.selectedType;

    if (this.data.selectedType === 'PRACTICE') {
      // 专项特训，跳转到部分选择
      wx.navigateTo({
        url: '/pages/practice-part/practice-part'
      });
    } else {
      // 完整考试，直接开始
      wx.redirectTo({
        url: '/pages/exam/exam'
      });
    }
  }
});



