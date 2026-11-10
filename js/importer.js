const CSVImporter = {
  parseCSV(text) {
    const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];
      if (char === '"') {
        if (inQuotes && nextChar === '"') { currentCell += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n' && !inQuotes) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c.length > 0)) rows.push(currentRow);
        currentRow = []; currentCell = '';
      } else { currentCell += char; }
    }
    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) rows.push(currentRow);
    }
    return rows;
  },
  validateQuestions(csvText) {
    const rows = this.parseCSV(csvText);
    if (rows.length < 2) return { success: false, errors: ["Question CSV is empty or has no data."] };
    const headers = rows[0].map(h => h.trim().toLowerCase());
    const expected = ['test', 'question', 'a', 'b', 'c', 'd'];
    for (const exp of expected) {
      if (!headers.includes(exp)) return { success: false, errors: [`Missing mandatory column header: "${exp}". Found: ${rows[0].join(', ')}`] };
    }
    const idx = {
      test: headers.indexOf('test'), question: headers.indexOf('question'),
      a: headers.indexOf('a'), b: headers.indexOf('b'), c: headers.indexOf('c'), d: headers.indexOf('d'),
      subject: headers.indexOf('subject'), explanation: headers.indexOf('explanation')
    };
    const errors = [];
    const questionsByTest = {};
    const testRowTracker = {};
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const testVal = parseInt(row[idx.test], 10);
      const qText = (row[idx.question] || '').trim();
      const optA = (row[idx.a] || '').trim();
      const optB = (row[idx.b] || '').trim();
      const optC = (row[idx.c] || '').trim();
      const optD = (row[idx.d] || '').trim();
      const subject = idx.subject !== -1 ? (row[idx.subject] || '').trim() : '';
      const explanation = idx.explanation !== -1 ? (row[idx.explanation] || '').trim() : '';

      if (isNaN(testVal) || testVal <= 0) { errors.push(`Row ${r + 1}: Invalid Test number.`); continue; }
      if (!qText) errors.push(`Row ${r + 1} (Test ${testVal}): Question text cannot be empty.`);
      if (!optA || !optB || !optC || !optD) errors.push(`Row ${r + 1} (Test ${testVal}): All options (A,B,C,D) must have content.`);

      if (!questionsByTest[testVal]) { questionsByTest[testVal] = []; testRowTracker[testVal] = 1; }
      questionsByTest[testVal].push({
        testId: testVal, questionNo: testRowTracker[testVal]++, question: qText,
        options: { A: optA, B: optB, C: optC, D: optD },
        subject: subject || 'General', explanation: explanation || ''
      });
    }
    if (errors.length > 0) return { success: false, errors: errors.slice(0, 15) };
    return { success: true, data: questionsByTest };
  },
  validateAnswers(csvText) {
    const rows = this.parseCSV(csvText);
    if (rows.length < 2) return { success: false, errors: ["Answer Key CSV is empty or has no data."] };
    const headers = rows[0].map(h => h.trim().toLowerCase());
    const idx = {
      test: headers.indexOf('test'),
      questionNo: headers.findIndex(h => h.includes('question')),
      correctAnswer: headers.findIndex(h => h.includes('correct') || h.includes('answer'))
    };
    if (idx.test === -1 || idx.questionNo === -1 || idx.correctAnswer === -1) {
      return { success: false, errors: [`Answer key CSV must contain: Test, QuestionNo, CorrectAnswer.`] };
    }
    const errors = [];
    const answersByTest = {};
    const validLetters = ['A', 'B', 'C', 'D'];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const testVal = parseInt(row[idx.test], 10);
      const qNo = parseInt(row[idx.questionNo], 10);
      const ans = (row[idx.correctAnswer] || '').trim().toUpperCase();
      if (isNaN(testVal) || testVal <= 0) continue;
      if (isNaN(qNo) || qNo <= 0) { errors.push(`Row ${r+1}: Invalid QuestionNo.`); continue; }
      if (!validLetters.includes(ans)) { errors.push(`Row ${r+1}: Invalid CorrectAnswer '${ans}'. Must be A, B, C, or D.`); continue; }
      if (!answersByTest[testVal]) answersByTest[testVal] = [];
      answersByTest[testVal].push({ testId: testVal, questionNo: qNo, correctAnswer: ans });
    }
    if (errors.length > 0) return { success: false, errors: errors.slice(0, 15) };
    return { success: true, data: answersByTest };
  }
};
window.CSVImporter = CSVImporter;
