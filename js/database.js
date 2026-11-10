class CBTDatabase {
  constructor() { this.dbName = 'CBTExaminationPlatformDB'; this.dbVersion = 1; this.db = null; }
  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.dbVersion);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('questions')) {
          const qs = db.createObjectStore('questions', { keyPath: ['testId', 'questionNo'] });
          qs.createIndex('testId', 'testId', { unique: false });
        }
        if (!db.objectStoreNames.contains('answers')) {
          const as = db.createObjectStore('answers', { keyPath: ['testId', 'questionNo'] });
          as.createIndex('testId', 'testId', { unique: false });
        }
        if (!db.objectStoreNames.contains('attempts')) {
          const att = db.createObjectStore('attempts', { keyPath: 'attemptId' });
          att.createIndex('testId', 'testId', { unique: false });
        }
      };
      req.onsuccess = (e) => { this.db = e.target.result; resolve(this); };
      req.onerror = (e) => reject(e.target.error);
    });
  }
  _tx(storeName, mode = 'readonly') {
    const tx = this.db.transaction(storeName, mode);
    return { tx, store: tx.objectStore(storeName) };
  }
  async saveQuestionsForTest(testId, questions) {
    return new Promise((resolve, reject) => {
      const { tx, store } = this._tx('questions', 'readwrite');
      const idx = store.index('testId');
      const req = idx.openCursor(IDBKeyRange.only(testId));
      req.onsuccess = (e) => {
        const c = e.target.result;
        if (c) { c.delete(); c.continue(); }
        else { questions.forEach(q => store.put({ ...q, testId })); }
      };
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }
  async getQuestionsByTest(testId) {
    return new Promise((resolve, reject) => {
      const { store } = this._tx('questions', 'readonly');
      const req = store.index('testId').getAll(IDBKeyRange.only(testId));
      req.onsuccess = () => resolve((req.result || []).sort((a,b) => a.questionNo - b.questionNo));
      req.onerror = (e) => reject(e.target.error);
    });
  }
  async saveAnswersForTest(testId, answers) {
    return new Promise((resolve, reject) => {
      const { tx, store } = this._tx('answers', 'readwrite');
      const idx = store.index('testId');
      const req = idx.openCursor(IDBKeyRange.only(testId));
      req.onsuccess = (e) => {
        const c = e.target.result;
        if (c) { c.delete(); c.continue(); }
        else { answers.forEach(a => store.put({ ...a, testId })); }
      };
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }
  async getAnswersByTest(testId) {
    return new Promise((resolve, reject) => {
      const { store } = this._tx('answers', 'readonly');
      const req = store.index('testId').getAll(IDBKeyRange.only(testId));
      req.onsuccess = () => {
        const m = new Map();
        (req.result || []).forEach(r => m.set(r.questionNo, r.correctAnswer));
        resolve(m);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }
  async saveAttempt(attempt) {
    return new Promise((resolve, reject) => {
      const { tx, store } = this._tx('attempts', 'readwrite');
      store.put(attempt);
      tx.oncomplete = () => resolve(attempt.attemptId);
      tx.onerror = (e) => reject(e.target.error);
    });
  }
  async getAttempt(id) {
    return new Promise((resolve, reject) => {
      const { store } = this._tx('attempts', 'readonly');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }
  async getAllAttempts() {
    return new Promise((resolve, reject) => {
      const { store } = this._tx('attempts', 'readonly');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  }
  async clearAll() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['questions', 'answers', 'attempts'], 'readwrite');
      tx.objectStore('questions').clear();
      tx.objectStore('answers').clear();
      tx.objectStore('attempts').clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }
  async exportBackup() {
    const questions = await this._getAll('questions');
    const answers = await this._getAll('answers');
    const attempts = await this._getAll('attempts');
    return { version: 1, exportedAt: new Date().toISOString(), settings: ExamConfig.getSettings(), questions, answers, attempts };
  }
  async importBackup(data) {
    await this.clearAll();
    if (data.settings) ExamConfig.saveSettings(data.settings);
    const tx = this.db.transaction(['questions', 'answers', 'attempts'], 'readwrite');
    const qS = tx.objectStore('questions');
    const aS = tx.objectStore('answers');
    const attS = tx.objectStore('attempts');
    (data.questions || []).forEach(q => qS.put(q));
    (data.answers || []).forEach(a => aS.put(a));
    (data.attempts || []).forEach(att => attS.put(att));
    return new Promise((res, rej) => { tx.oncomplete = () => res(true); tx.onerror = (e) => rej(e.target.error); });
  }
  _getAll(s) {
    return new Promise((res, rej) => {
      const { store } = this._tx(s, 'readonly');
      const req = store.getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = (e) => rej(e.target.error);
    });
  }
}
window.db = new CBTDatabase();
