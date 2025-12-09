// punctuationService.js - 标点符号处理服务

export const PunctuationService = {
  /**
   * 为文本添加标点符号
   */
  addPunctuation(text) {
    if (!text || !text.trim()) return text;
    
    let processed = text.trim();
    
    // 1. 处理句号 - 在句末添加
    if (!/[.!?。，,]$/.test(processed)) {
      processed += '.';
    }
    
    // 2. 处理问句 - 检测疑问词
    const questionWords = ['what', 'where', 'when', 'who', 'why', 'how', 'which', 'whose', 'whom', 
                          'is', 'are', 'was', 'were', 'do', 'does', 'did', 'can', 'could', 
                          'should', 'would', 'will', 'may', 'might'];
    const firstWord = processed.toLowerCase().split(/\s+/)[0];
    if (questionWords.includes(firstWord) && !processed.includes('?')) {
      processed = processed.replace(/\.$/, '?');
    }
    
    // 3. 处理逗号 - 在适当的位置添加
    const sentences = processed.split(/([.!?])/);
    let result = '';
    
    for (let i = 0; i < sentences.length; i += 2) {
      let sentence = sentences[i].trim();
      if (!sentence) continue;
      
      // 如果句子较长（超过50个字符），尝试在适当位置添加逗号
      if (sentence.length > 50) {
        // 在 "and", "but", "or", "so" 前添加逗号（如果还没有）
        sentence = sentence.replace(/\s+(and|but|or|so)\s+/gi, ', $1 ');
        
        // 在从句连接词前添加逗号
        sentence = sentence.replace(/\s+(because|although|however|therefore|moreover|furthermore)\s+/gi, ', $1 ');
      }
      
      result += sentence;
      if (i + 1 < sentences.length) {
        result += sentences[i + 1]; // 添加标点符号
      }
      if (i + 2 < sentences.length) {
        result += ' '; // 句子之间的空格
      }
    }
    
    // 4. 确保首字母大写
    if (result.length > 0) {
      result = result.charAt(0).toUpperCase() + result.slice(1);
    }
    
    // 5. 清理多余的空格
    result = result.replace(/\s+/g, ' ').trim();
    
    return result || processed; // 如果处理失败，返回原文本
  }
};
