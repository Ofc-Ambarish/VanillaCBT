const App = {
  examEngine: null,
  activeAttemptRecord: null,
  async init() {
    await db.init();
    this.applyTheme();
    this.bindEvents();
    this.renderHeader();
    await this.navigate('dashboard');
  },
  applyTheme() {
    const t = localStorage.getItem(ExamConfig.storageKeys.theme) || 'light';
    document.documentElement.setAttribute('data-theme', t);
  },
  toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const nxt = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nxt);
    localStorage.setItem(ExamConfig.storageKeys.theme, nxt);
  },
  renderHeader() {
    const s = ExamConfig.getSettings();
    document.getElementById('navbarExamTitle').textContent = s.examName;
    document.getElementById('navbarOrgTitle').textContent = `${s.organization} • ${s.category}`;
  },
  async navigate(view, params = {}) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('d-none'));
    document.getElementById('mainNavLinks').classList.toggle('d-none', view === 'exam');

    if (view === 'dashboard') {
      document.getElementById('viewDashboard').classList.remove('d-none');
      await this.renderDashboard();
    } else if (view === 'exam') {
      document.getElementById('viewExam').classList.remove('d-none');
      await this.startExam(params.testId);
    } else if (view === 'result') {
      document.getElementById('viewResult').classList.remove('d-none');
      this.renderResult(params.attemptRecord);
    } else if (view === 'review') {
      document.getElementById('viewReview').classList.remove('d-none');
      this.renderReview(params.attemptRecord, params.filter || 'all');
    } else if (view === 'analytics') {
      document.getElementById('viewAnalytics').classList.remove('d-none');
      await this.renderAnalytics();
    }
    window.scrollTo(0,0);
  },
  async renderDashboard() {
    this.renderHeader();
    const testList = await TestManager.getAllTestsState();
    const attempts = await db.getAllAttempts();

    document.getElementById('statTotalTests').textContent = testList.length;
    document.getElementById('statAvailableTests').textContent = testList.filter(t => t.isReady).length;
    document.getElementById('statCompletedAttempts').textContent = attempts.length;
    if (attempts.length > 0) {
      const sc = attempts.map(a => a.result.finalScore);
      document.getElementById('statAvgScore').textContent = (sc.reduce((a,b)=>a+b,0)/attempts.length).toFixed(2);
      document.getElementById('statHighScore').textContent = Math.max(...sc).toFixed(2);
    } else {
      document.getElementById('statAvgScore').textContent = '0.00';
      document.getElementById('statHighScore').textContent = '0.00';
    }

    const grid = document.getElementById('testCardGrid');
    grid.innerHTML = testList.map(t => {
      let bClass = 'bg-secondary', sText = 'No Questions';
      if (t.isReady) { bClass = 'bg-success'; sText = 'Ready'; }
      else if (t.hasQuestions && !t.hasAnswers) { bClass = 'bg-warning text-dark'; sText = 'Missing Key'; }

      let actBtn = t.isReady
        ? (t.hasActiveSession 
            ? `<button class="btn btn-warning btn-sm fw-bold me-2" onclick="App.navigate('exam', { testId: ${t.testId} })">Resume</button>`
            : `<button class="btn btn-primary btn-sm fw-bold me-2" onclick="App.navigate('exam', { testId: ${t.testId} })">Start Test</button>`)
        : `<button class="btn btn-outline-secondary btn-sm me-2" disabled>Start Test</button>`;

      return `
        <div class="card-custom test-card ${t.hasQuestions ? 'has-questions' : 'no-questions'}">
          <div>
            <div class="d-flex justify-content-between mb-2">
              <h5 class="fw-bold m-0">${t.testName}</h5>
              <span class="badge ${bClass}">${sText}</span>
            </div>
            <ul class="test-meta-list">
              <li><span>Questions Loaded</span> <strong class="${t.questionCount === 0 ? 'text-danger' : 'text-primary'}">${t.questionCount}</strong></li>
              <li><span>Duration</span> <span>${t.durationMinutes} Mins</span></li>
              <li><span>Max Marks</span> <span>${t.maxMarks.toFixed(2)}</span></li>
              <li><span>Best Score</span> <span>${t.bestScore !== null ? t.bestScore.toFixed(2) : '—'}</span></li>
            </ul>
          </div>
          <div class="d-flex align-items-center mt-2 pt-2 border-top">
            ${actBtn}
            <button class="btn btn-outline-primary btn-sm me-1" onclick="App.openImportModal(${t.testId})">Import</button>
            ${t.latestAttemptId ? `<button class="btn btn-outline-success btn-sm" onclick="App.viewResult('${t.latestAttemptId}')">Result</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  },
  async startExam(testId) {
    try {
      this.examEngine = new ExamEngine();
      await this.examEngine.loadTest(testId);
      const s = ExamConfig.getSettings();
      document.getElementById('cbtExamName').textContent = s.examName;
      document.getElementById('cbtTestName').textContent = `Mock Test ${String(testId).padStart(2, '0')}`;

      this.examEngine.startEngine({
        onTimerTick: (rem, fmt) => {
          const t = document.getElementById('cbtTimer');
          if (t) { t.textContent = fmt; t.classList.toggle('bg-danger', rem <= 300); }
        },
        onTimerExpire: () => alert("Time is up! Exam auto-submitted.")
      });
      this.renderQuestion();
      this.renderPalette();
    } catch (e) {
      alert(e.message);
      this.navigate('dashboard');
    }
  },
  renderQuestion() {
    const q = this.examEngine.getCurrentQuestion();
    const resp = this.examEngine.getCurrentResponse();
    document.getElementById('cbtQuestionNumberLabel').textContent = `Question ${this.examEngine.currentIndex + 1} of ${this.examEngine.questions.length}`;
    document.getElementById('cbtSubjectBadge').textContent = q.subject || 'General';
    document.getElementById('cbtQuestionText').textContent = q.question;

    document.getElementById('cbtOptionsContainer').innerHTML = ['A', 'B', 'C', 'D'].map(l => `
      <div class="cbt-option ${resp.selectedOption === l ? 'selected' : ''}" onclick="App.onSelect('${l}')">
        <span class="cbt-option-letter">${l}</span>
        <div class="flex-grow-1">${this.escape(q.options[l])}</div>
      </div>
    `).join('');

    const bMark = document.getElementById('btnMarkReview');
    bMark.textContent = resp.markedForReview ? 'Unmark Review' : 'Mark for Review';
    document.getElementById('btnPrevQuestion').disabled = this.examEngine.currentIndex === 0;
  },
  renderPalette() {
    document.getElementById('cbtPaletteGrid').innerHTML = this.examEngine.questions.map((q, idx) => `
      <button class="palette-btn ${this.examEngine.getQuestionState(q.questionNo)} ${idx === this.examEngine.currentIndex ? 'active-q' : ''}" onclick="App.jump(${idx})">
        ${idx + 1}
      </button>
    `).join('');

    const c = this.examEngine.getSummaryCounts();
    document.getElementById('countAnswered').textContent = c.answered;
    document.getElementById('countNotAnswered').textContent = c.notAnswered;
    document.getElementById('countMarked').textContent = c.marked;
    document.getElementById('countAnsweredMarked').textContent = c.answeredMarked;
    document.getElementById('countNotVisited').textContent = c.notVisited;
  },
  onSelect(l) { this.examEngine.selectOption(l); this.renderQuestion(); this.renderPalette(); },
  clearCurrent() { this.examEngine.clearResponse(); this.renderQuestion(); this.renderPalette(); },
  toggleMark() { this.examEngine.toggleMarkForReview(); this.renderQuestion(); this.renderPalette(); },
  jump(i) { this.examEngine.goToQuestion(i); this.renderQuestion(); this.renderPalette(); },
  next() { this.examEngine.nextQuestion(); this.renderQuestion(); this.renderPalette(); },
  prev() { this.examEngine.previousQuestion(); this.renderQuestion(); this.renderPalette(); },
  async confirmSubmit() {
    const c = this.examEngine.getSummaryCounts();
    if (confirm(`SUBMIT EXAM?\nTotal: ${c.total}\nAnswered: ${c.answered + c.answeredMarked}\nNot Answered: ${c.notAnswered}\nMarked: ${c.marked}`)) {
      const att = await this.examEngine.submitExam(false);
      this.navigate('result', { attemptRecord: att });
    }
  },
  renderResult(att) {
    this.activeAttemptRecord = att;
    const r = att.result;
    document.getElementById('resFinalScore').textContent = r.finalScore.toFixed(2);
    document.getElementById('resMaxMarks').textContent = r.maxMarks.toFixed(2);
    document.getElementById('resAccuracy').textContent = `${r.accuracy}%`;
    document.getElementById('resAttemptRate').textContent = `${r.attemptPercentage}%`;
    document.getElementById('resCorrect').textContent = r.correctCount;
    document.getElementById('resIncorrect').textContent = r.incorrectCount;
    document.getElementById('resUnattempted').textContent = r.unattemptedCount;
    document.getElementById('resTimeTaken').textContent = Math.round(r.timeConsumedSeconds / 60) + 'm';
    document.getElementById('resAvgTime').textContent = `${r.avgTimePerQuestion}s`;

    document.getElementById('resSubjectTableBody').innerHTML = Object.entries(r.subjectWise).map(([s, d]) => `
      <tr>
        <td class="fw-bold">${s}</td><td>${d.total}</td>
        <td class="text-success fw-bold">${d.correct}</td>
        <td class="text-danger fw-bold">${d.incorrect}</td>
        <td>${d.unattempted}</td>
        <td><span class="badge bg-primary">${d.total > 0 ? ((d.correct/(d.correct+d.incorrect||1))*100).toFixed(1) : 0}%</span></td>
      </tr>
    `).join('');
  },
  renderReview(att, filter) {
    this.activeAttemptRecord = att;
    document.getElementById('reviewQuestionContainer').innerHTML = ExamReview.render(att, filter);
    document.querySelectorAll('.btn-filter-review').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
  },
  setFilter(f) { if (this.activeAttemptRecord) this.renderReview(this.activeAttemptRecord, f); },
  async viewResult(id) {
    const att = await db.getAttempt(id);
    if (att) this.navigate('result', { attemptRecord: att });
  },
  async renderAnalytics() {
    const attempts = await db.getAllAttempts();
    const stats = AnalyticsEngine.renderDashboard(attempts);
    if (!stats.hasData) {
      document.getElementById('analyticsEmptyState').classList.remove('d-none');
      document.getElementById('analyticsContent').classList.add('d-none');
      return;
    }
    document.getElementById('analyticsEmptyState').classList.add('d-none');
    document.getElementById('analyticsContent').classList.remove('d-none');
    document.getElementById('anTotalAttempts').textContent = stats.totalAttempts;
    document.getElementById('anAvgScore').textContent = stats.avgScore;
    document.getElementById('anHighScore').textContent = stats.highestScore;
    document.getElementById('anAvgAcc').textContent = `${stats.avgAccuracy}%`;
    document.getElementById('anStrongestSubj').textContent = stats.strongest;
    document.getElementById('anWeakestSubj').textContent = stats.weakest;
    AnalyticsEngine.renderCharts(attempts);
  },
  openImportModal(testId) {
    document.getElementById('importTargetTestId').value = testId;
    document.getElementById('importTargetTestLabel').textContent = `Slot #${testId} (Mock Test ${String(testId).padStart(2, '0')})`;
    document.getElementById('importQuestionsFile').value = '';
    document.getElementById('importAnswersFile').value = '';
    document.getElementById('importLogContainer').innerHTML = '';
    document.getElementById('modalImport').classList.remove('d-none');
  },
  closeImportModal() { document.getElementById('modalImport').classList.add('d-none'); },
  async processImport() {
    const testId = parseInt(document.getElementById('importTargetTestId').value, 10);
    const qF = document.getElementById('importQuestionsFile').files[0];
    const aF = document.getElementById('importAnswersFile').files[0];
    const log = document.getElementById('importLogContainer');
    log.innerHTML = '';
    if (!qF && !aF) { log.innerHTML = '<div class="alert alert-warning">Select a file to import.</div>'; return; }
    try {
      if (qF) {
        const text = await qF.text();
        const res = CSVImporter.validateQuestions(text);
        if (!res.success) { log.innerHTML += `<div class="alert alert-danger">${res.errors.join('<br>')}</div>`; return; }
        const qList = res.data[testId] || [];
        if (qList.length === 0) { log.innerHTML += `<div class="alert alert-danger">No questions found for Test #${testId}.</div>`; return; }
        await db.saveQuestionsForTest(testId, qList);
        log.innerHTML += `<div class="alert alert-success">Imported ${qList.length} questions for Test #${testId}.</div>`;
      }
      if (aF) {
        const text = await aF.text();
        const res = CSVImporter.validateAnswers(text);
        if (!res.success) { log.innerHTML += `<div class="alert alert-danger">${res.errors.join('<br>')}</div>`; return; }
        const aList = res.data[testId] || [];
        if (aList.length === 0) { log.innerHTML += `<div class="alert alert-danger">No answers found for Test #${testId}.</div>`; return; }
        await db.saveAnswersForTest(testId, aList);
        log.innerHTML += `<div class="alert alert-success">Imported ${aList.length} answers for Test #${testId}.</div>`;
      }
      setTimeout(() => { this.closeImportModal(); this.renderDashboard(); }, 1200);
    } catch(err) { log.innerHTML += `<div class="alert alert-danger">${err.message}</div>`; }
  },
  openSettingsModal() {
    const s = ExamConfig.getSettings();
    document.getElementById('cfgExamName').value = s.examName;
    document.getElementById('cfgOrganization').value = s.organization;
    document.getElementById('cfgCategory').value = s.category;
    document.getElementById('cfgSlots').value = s.totalTestSlots;
    document.getElementById('cfgDuration').value = s.durationMinutes;
    document.getElementById('cfgMarksCorrect').value = s.marksPerCorrect;
    document.getElementById('cfgMarksIncorrect').value = s.negativeMarks;
    document.getElementById('modalSettings').classList.remove('d-none');
  },
  closeSettingsModal() { document.getElementById('modalSettings').classList.add('d-none'); },
  saveSettingsForm() {
    ExamConfig.saveSettings({
      examName: document.getElementById('cfgExamName').value.trim() || 'Exam',
      organization: document.getElementById('cfgOrganization').value.trim() || 'Authority',
      category: document.getElementById('cfgCategory').value.trim() || 'Recruitment',
      totalTestSlots: parseInt(document.getElementById('cfgSlots').value, 10) || 10,
      durationMinutes: parseInt(document.getElementById('cfgDuration').value, 10) || 90,
      marksPerCorrect: parseFloat(document.getElementById('cfgMarksCorrect').value) || 1.0,
      negativeMarks: parseFloat(document.getElementById('cfgMarksIncorrect').value) || 0.25,
      unattemptedMarks: 0.0
    });
    this.closeSettingsModal();
    this.renderHeader();
    this.renderDashboard();
  },
  async confirmFullReset() {
    if (prompt("Type 'RESET' to erase all tests and attempt histories:") === 'RESET') {
      await db.clearAll();
      localStorage.clear();
      location.reload();
    }
  },
  bindEvents() {
    document.getElementById('btnThemeToggle').addEventListener('click', () => this.toggleTheme());
    document.getElementById('btnOpenSettings').addEventListener('click', () => this.openSettingsModal());
    document.getElementById('btnExportBackup').addEventListener('click', () => BackupManager.downloadBackup());
    document.getElementById('btnTriggerRestore').addEventListener('click', () => document.getElementById('backupFileInput').click());
    document.getElementById('backupFileInput').addEventListener('change', async (e) => {
      if (e.target.files[0]) { await BackupManager.restoreFromFile(e.target.files[0]); location.reload(); }
    });
    document.getElementById('btnResetAll').addEventListener('click', () => this.confirmFullReset());
  },
  escape(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''; }
};
window.addEventListener('DOMContentLoaded', () => App.init());
window.App = App;
