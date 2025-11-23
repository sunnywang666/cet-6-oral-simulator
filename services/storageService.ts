import { ExamRecord } from "../types";

const STORAGE_KEY = 'cet6_exam_history';

export const StorageService = {
  /**
   * Save a new exam record
   */
  saveRecord(record: ExamRecord): void {
    try {
      const existing = this.getRecords();
      // Add to beginning of array
      const updated = [record, ...existing];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to save exam record", error);
    }
  },

  /**
   * Retrieve all records
   */
  getRecords(): ExamRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as ExamRecord[];
    } catch (error) {
      console.error("Failed to load records", error);
      return [];
    }
  },

  /**
   * Delete a specific record by ID
   */
  deleteRecord(id: string): void {
    try {
      const existing = this.getRecords();
      const updated = existing.filter(r => r.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to delete record", error);
    }
  },

  /**
   * Clear all history
   */
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Export a record as a downloadable JSON file
   */
  exportRecord(record: ExamRecord): void {
    const fileName = `CET6_Exam_${new Date(record.timestamp).toISOString().split('T')[0]}_${record.id.slice(0,4)}.json`;
    const jsonStr = JSON.stringify(record, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};