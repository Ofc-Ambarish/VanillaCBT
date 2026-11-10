class ExamEngine {
  constructor() {
    this.testId = null; this.questions = []; this.answersMap = new Map();
    this.currentIndex = 0; this.responses = {}; this.timer = null;
    this.settings = null; this.isSubmitting = false;
  }
  async loadTest(testId) {
    this.testId = testId;
    this.settings = ExamConfig.getSettings();
    this.questions = await db.getQuestionsByTest(testId);
    this.answersMap = await db.getAnswersByTest(testId);

    if (this.questions.length === 0) throw new Error(`Test ${testId} has no questions loaded.`);
    if (this.answersMap.size < this.questions.length) {
      throw new Error(`Test ${testId} answer key is incomplete (${this.answersMap.size}/${this.questions.length}).`);
    }

    const saved = TestManager.getActiveSession(testId);
    if (saved) {
      this.responses = saved.responses || {};
      this.currentIndex = saved.currentIndex || 0;
    } else {
      this.responses = {};
      this.questions.forEach(q => { this.responses[q.questionNo] = { selectedOption: null, markedForReview: false, visited: false }; });
      this.currentIndex = 0;
    }
    if (this.questions[this.currentIndex]) {
      const qNo = this.questions[this.currentIndex].questionNo;
      if (this.responses[qNo]) this.responses[qNo].visited = true;
    }
    return true;
  }
  startEngine(cb) {
    const duration = this.settings.durationMinutes * 60;
    const saved = TestManager.getActiveSession(this.testId);
    const remaining = (saved && saved.remainingSeconds) ? saved.remainingSeconds : duration;

    this.timer = new CBTExamTimer({
      durationSeconds: duration,
      onTick: (rem, formatted) => {
        cb.onTimerTick(rem, formatted);
        if (!this.isSubmitting) {
          TestManager.saveActiveSession(this.testId, {
            testId: this.testId, responses: this.responses,
            currentIndex: this.currentIndex, remainingSeconds: rem
          });
        }
      },
      onExpire: () => { cb.onTimerExpire(); this.submitExam(true); }
    });
    this.timer.start(remaining);
  }
  getCurrentQuestion() { return this.questions[this.currentIndex]; }
  getCurrentResponse() { return this.responses[this.getCurrentQuestion().questionNo] || {}; }
  selectOption(letter) {
    const qNo = this.getCurrentQuestion().questionNo;
    if (!this.responses[qNo]) this.responses[qNo] = { visited: true, markedForReview: false };
    this.responses[qNo].selectedOption = letter;
    this.responses[qNo].visited = true;
  }
  clearResponse() {
    const qNo = this.getCurrentQuestion().questionNo;
    if (this.responses[qNo]) this.responses[qNo].selectedOption = null;
  }
  toggleMarkForReview() {
    const qNo = this.getCurrentQuestion().questionNo;
    if (!this.responses[qNo]) this.responses[qNo] = { visited: true, selectedOption: null };
    this.responses[qNo].markedForReview = !this.responses[qNo].markedForReview;
  }
  goToQuestion(idx) {
    if (idx >= 0 && idx < this.questions.length) {
      this.currentIndex = idx;
      const qNo = this.getCurrentQuestion().questionNo;
      if (!this.responses[qNo]) this.responses[qNo] = { selectedOption: null, markedForReview: false };
      this.responses[qNo].visited = true;
    }
  }
  nextQuestion() { if (this.currentIndex < this.questions.length - 1) this.goToQuestion(this.currentIndex + 1); }
  previousQuestion() { if (this.currentIndex > 0) this.goToQuestion(this.currentIndex - 1); }
  getQuestionState(qNo) {
    const r = this.responses[qNo];
    if (!r || !r.visited) return 'state-not-visited';
    if (r.selectedOption && r.markedForReview) return 'state-answered-marked';
    if (r.markedForReview) return 'state-marked-review';
    if (r.selectedOption) return 'state-answered';
    return 'state-not-answered';
  }
  getSummaryCounts() {
    let answered = 0, notAnswered = 0, marked = 0, answeredMarked = 0, notVisited = 0;
    this.questions.forEach(q => {
      const s = this.getQuestionState(q.questionNo);
      if (s === 'state-answered') answered++;
      else if (s === 'state-not-answered') notAnswered++;
      else if (s === 'state-marked-review') marked++;
      else if (s === 'state-answered-marked') answeredMarked++;
      else notVisited++;
    });
    return { answered, notAnswered, marked, answeredMarked, notVisited, total: this.questions.length };
  }
  async submitExam(isAutoSubmit = false) {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    if (this.timer) this.timer.stop();
    const duration = this.settings.durationMinutes * 60;
    const remaining = this.timer ? this.timer.getRemainingSeconds() : 0;
    const timeConsumed = Math.max(0, duration - remaining);

    const result = ScoringEngine.calculateResult({
      questions: this.questions, answerKeyMap: this.answersMap,
      responses: this.responses, timeConsumedSeconds: timeConsumed, settings: this.settings
    });

    const attempt = {
      attemptId: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      testId: this.testId, submittedAt: new Date().toISOString(), isAutoSubmit,
      settingsSnapshot: { ...this.settings }, result
    };

    await db.saveAttempt(attempt);
    TestManager.clearActiveSession(this.testId);
    return attempt;
  }
}
window.ExamEngine = ExamEngine;
