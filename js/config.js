const ExamConfig = {
  storageKeys: { settings: 'cbt_exam_settings', activeExamSession: 'cbt_active_session', theme: 'cbt_theme_pref' },
  defaultSettings: {
    examName: "WBPSC Industrial Development Officer",
    organization: "West Bengal Public Service Commission",
    category: "Technical Recruitment Examination",
    totalTestSlots: 10,
    durationMinutes: 90,
    marksPerCorrect: 1.0,
    negativeMarks: 0.25,
    unattemptedMarks: 0.0
  },
  getSettings() {
    const raw = localStorage.getItem(this.storageKeys.settings);
    if (!raw) { this.saveSettings(this.defaultSettings); return { ...this.defaultSettings }; }
    try { return { ...this.defaultSettings, ...JSON.parse(raw) }; } catch(e) { return { ...this.defaultSettings }; }
  },
  saveSettings(s) { localStorage.setItem(this.storageKeys.settings, JSON.stringify(s)); }
};
window.ExamConfig = ExamConfig;
