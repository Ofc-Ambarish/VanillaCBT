const ExamReview = {
  render(attemptRecord, filter = 'all') {
    const questions = attemptRecord.result.questionAnalysis;
    const filtered = questions.filter(q => {
      if (filter === 'all') return true;
      if (filter === 'correct') return q.status === 'correct';
      if (filter === 'incorrect') return q.status === 'incorrect';
      if (filter === 'unattempted') return q.status === 'unattempted';
      if (filter === 'marked') return q.markedForReview;
      return true;
    });

    return filtered.map(q => {
      const badge = q.status === 'correct' ? '<span class="badge bg-success">Correct (+1)</span>' :
                    q.status === 'incorrect' ? '<span class="badge bg-danger">Incorrect (-0.25)</span>' :
                    '<span class="badge bg-secondary">Unattempted (0)</span>';

      const optRows = ['A', 'B', 'C', 'D'].map(l => {
        const text = q.options[l] || '';
        const isCandidate = q.candidateAnswer === l;
        const isCorrect = q.correctAnswer === l;
        let cls = '', tag = '';
        if (isCorrect) { cls = 'border-success bg-success bg-opacity-10 text-success fw-bold'; tag = '<span class="ms-auto badge bg-success">Correct Answer</span>'; }
        else if (isCandidate && !isCorrect) { cls = 'border-danger bg-danger bg-opacity-10 text-danger fw-bold'; tag = '<span class="ms-auto badge bg-danger">Your Answer</span>'; }
        return `<div class="cbt-option ${cls} mb-2"><span class="cbt-option-letter">${l}</span><div class="flex-grow-1">${this.escapeHTML(text)}</div>${tag}</div>`;
      }).join('');

      return `
        <div class="card-custom mb-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="fw-bold text-primary">Question ${q.questionNo} &bull; <small class="text-muted">${q.subject}</small></span>
            <div>${badge}</div>
          </div>
          <div class="cbt-question-text mb-3">${this.escapeHTML(q.question)}</div>
          <div class="options-container mb-3">${optRows}</div>
          ${q.explanation ? `<div class="alert alert-info py-2 px-3 mb-0" style="font-size:0.9rem;"><strong>Explanation:</strong> ${this.escapeHTML(q.explanation)}</div>` : ''}
        </div>
      `;
    }).join('');
  },
  escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
window.ExamReview = ExamReview;
