// pages/report/report.js
import { StorageService } from '../../utils/storageService';

Page({
  data: {
    examResult: null,
    sections: [],
    isViewingHistory: false,
    recordId: null
  },

  onLoad(options) {
    const recordId = options.recordId;
    
    if (recordId) {
      // Load from history
      this.loadFromHistory(recordId);
    } else {
      // Load from global data (just finished exam)
      const app = getApp();
      if (app.globalData.lastExamResult) {
        this.setData({
          examResult: app.globalData.lastExamResult,
          isViewingHistory: false
        });
        this.processReport();
      } else {
        wx.showToast({
          title: '未找到报告数据',
          icon: 'none'
        });
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/index/index'
          });
        }, 2000);
      }
    }
  },

  loadFromHistory(recordId) {
    const records = StorageService.getRecords();
    const record = records.find(r => r.id === recordId);
    
    if (record) {
      this.setData({
        examResult: record.result,
        isViewingHistory: true,
        recordId: recordId
      });
      this.processReport(record.examType, record.practicePart);
    } else {
      wx.showToast({
        title: '记录不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/history/history'
        });
      }, 2000);
    }
  },

  processReport(examType, practicePart) {
    const result = this.data.examResult;
    if (!result) return;

    // Extract dimensions from feedback text
    const extractDimension = (text, patterns) => {
      if (!text) return null;
      for (const pattern of patterns) {
        const regex = new RegExp(`${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[:：]\\s*([\\s\\S]*?)(?=(?:${patterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})[:：]|$)`, 'i');
        const match = text.match(regex);
        if (match && match[1]) return match[1].trim();
      }
      return null;
    };

    const accuracyPatterns = ['Accuracy and Range', '准确性', 'Accuracy'];
    const coherencePatterns = ['Size and Coherence', '连贯性', 'Coherence'];
    const flexibilityPatterns = ['Flexibility and Appropriateness', '互动性', 'Flexibility'];

    const allSections = [
      { title: "Part 1: 自我介绍", data: result.part1Feedback || {}, partKey: 'PART1' },
      { title: "Part 2: 简短问答", data: result.part2Feedback || {}, partKey: 'PART2' },
      { title: "Part 3: 个人陈述", data: result.part3Feedback || {}, partKey: 'PART3' },
      { title: "Part 4: 双人讨论", data: result.part4Feedback || {}, partKey: 'PART4' },
      { title: "Part 5: 深入问答", data: result.part5Feedback || {}, partKey: 'PART5' }
    ];

    // Filter sections for practice mode
    const sections = (examType === 'PRACTICE' && practicePart)
      ? allSections.filter(sec => sec.partKey === practicePart)
      : allSections;

    // Process each section
    const processedSections = sections.map(sec => {
      const feedback = sec.data.feedback || '';
      const accuracyText = extractDimension(feedback, accuracyPatterns);
      const coherenceText = extractDimension(feedback, coherencePatterns);
      const flexibilityText = extractDimension(feedback, flexibilityPatterns);

      return {
        ...sec,
        data: {
          ...sec.data,
          accuracyText,
          coherenceText,
          flexibilityText,
          accuracyScore: sec.data.accuracyScore,
          coherenceScore: sec.data.coherenceScore,
          flexibilityScore: sec.data.flexibilityScore
        }
      };
    });

    this.setData({ sections: processedSections });
  },

  goHome() {
    wx.redirectTo({
      url: '/pages/index/index'
    });
  },

  viewHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  }
});



