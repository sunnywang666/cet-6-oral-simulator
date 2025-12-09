// storageService.js - 存储服务

const STORAGE_KEY = 'cet6_exam_history';

export const StorageService = {
  /**
   * 保存考试记录
   */
  saveRecord(record) {
    try {
      const existing = this.getRecords();
      const updated = [record, ...existing];
      wx.setStorageSync(STORAGE_KEY, updated);
      return true;
    } catch (error) {
      console.error('Failed to save exam record', error);
      return false;
    }
  },

  /**
   * 获取所有记录
   */
  getRecords() {
    try {
      return wx.getStorageSync(STORAGE_KEY) || [];
    } catch (error) {
      console.error('Failed to load records', error);
      return [];
    }
  },

  /**
   * 删除指定记录
   */
  deleteRecord(id) {
    try {
      const existing = this.getRecords();
      const updated = existing.filter(r => r.id !== id);
      wx.setStorageSync(STORAGE_KEY, updated);
      return true;
    } catch (error) {
      console.error('Failed to delete record', error);
      return false;
    }
  },

  /**
   * 清空所有记录
   */
  clearAll() {
    try {
      wx.removeStorageSync(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear records', error);
      return false;
    }
  },

  /**
   * 导出记录为JSON
   */
  exportRecord(record) {
    try {
      const jsonStr = JSON.stringify(record, null, 2);
      const fileName = `CET6_Exam_${new Date(record.timestamp).toISOString().split('T')[0]}_${record.id.slice(0, 4)}.json`;
      
      // 小程序中需要将文件保存到本地，然后提示用户分享
      const fs = wx.getFileSystemManager();
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      
      fs.writeFileSync(filePath, jsonStr, 'utf8');
      
      wx.showModal({
        title: '导出成功',
        content: `文件已保存，文件路径：${filePath}`,
        showCancel: false
      });
      
      return true;
    } catch (error) {
      console.error('Failed to export record', error);
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      });
      return false;
    }
  }
};
