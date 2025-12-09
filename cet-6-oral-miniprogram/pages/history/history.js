// pages/history/history.js
import { StorageService } from '../../utils/storageService';

Page({
  data: {
    records: []
  },

  onLoad() {
    this.loadHistory();
  },

  onShow() {
    // Reload when page shows (in case a record was deleted)
    this.loadHistory();
  },

  loadHistory() {
    const records = StorageService.getRecords();
    
    // Format records for display
    const formattedRecords = records.map(record => {
      const date = new Date(record.timestamp);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      
      const modeText = record.mode === 'REAL' ? '真题模式' : 'AI出题';
      const gradeClass = this.getGradeClass(record.result.totalGrade);
      
      return {
        ...record,
        dateStr,
        modeText,
        gradeClass
      };
    });
    
    this.setData({ records: formattedRecords });
  },

  getGradeClass(grade) {
    if (grade === 'A+' || grade === 'A') return 'a';
    if (grade === 'B') return 'b';
    if (grade === 'C') return 'c';
    return 'd';
  },

  viewRecord(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/report/report?recordId=${id}`
    });
  },

  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          StorageService.deleteRecord(id);
          this.loadHistory();
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  goHome() {
    wx.redirectTo({
      url: '/pages/index/index'
    });
  }
});



