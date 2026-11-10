const TestManager = {
  async getAllTestsState() {
    const settings = ExamConfig.getSettings();
    const totalSlots = settings.totalTestSlots || 10;
    const testList = [];
    const allAttempts = await db.getAllAttempts();

    for (let testId = 1; testId <= totalSlots; testId++) {
      const questions = await db.getQuestionsByTest(testId);
      const answersMap = await db.getAnswersByTest(testId);
      const testAttempts = allAttempts.filter(a => a.testId === testId);

      const hasQuestions = questions.length > 0;
      const isCompleteKey = hasQuestions && answersMap.size >= questions.length;
      let bestScore = null, lastAttempted = null;

      if (testAttempts.length > 0) {
        testAttempts.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        lastAttempted = testAttempts[0].submittedAt;
        bestScore = Math.max(...testAttempts.map(a => a.result.finalScore));
      }

      const activeSession = this.getActiveSession(testId);
      testList.push({
        testId, testName: `Mock Test ${String(testId).padStart(2, '0')}`,
        questionCount: questions.length, hasQuestions, hasAnswers: answersMap.size > 0,
        isReady: hasQuestions && isCompleteKey, durationMinutes: settings.durationMinutes,
        maxMarks: questions.length * (settings.marksPerCorrect || 1.0),
        attemptsCount: testAttempts.length, bestScore, lastAttempted,
        hasActiveSession: !!activeSession,
        latestAttemptId: testAttempts.length > 0 ? testAttempts[0].attemptId : null
      });
    }
    return testList;
  },
  getActiveSession(testId) {
    const raw = localStorage.getItem(`${ExamConfig.storageKeys.activeExamSession}_${testId}`);
    try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  },
  saveActiveSession(testId, sessionData) {
    localStorage.setItem(`${ExamConfig.storageKeys.activeExamSession}_${testId}`, JSON.stringify(sessionData));
  },
  clearActiveSession(testId) {
    localStorage.removeItem(`${ExamConfig.storageKeys.activeExamSession}_${testId}`);
  }
};
window.TestManager = TestManager;
