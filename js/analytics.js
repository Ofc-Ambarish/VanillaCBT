const AnalyticsEngine = {
  charts: {},
  renderDashboard(attempts) {
    if (!attempts || attempts.length === 0) return { hasData: false };
    const totalAttempts = attempts.length;
    const scores = attempts.map(a => a.result.finalScore);
    const avgScore = (scores.reduce((a, b) => a + b, 0) / totalAttempts).toFixed(2);
    const highestScore = Math.max(...scores).toFixed(2);
    const avgAccuracy = (attempts.map(a => a.result.accuracy).reduce((a, b) => a + b, 0) / totalAttempts).toFixed(2);

    const subjectMap = {};
    attempts.forEach(att => {
      const sw = att.result.subjectWise || {};
      for (const [subj, stat] of Object.entries(sw)) {
        if (!subjectMap[subj]) subjectMap[subj] = { total: 0, correct: 0 };
        subjectMap[subj].total += stat.total;
        subjectMap[subj].correct += stat.correct;
      }
    });

    let strongest = 'N/A', weakest = 'N/A', maxA = -1, minA = 101;
    for (const [s, st] of Object.entries(subjectMap)) {
      if (st.total > 0) {
        const acc = (st.correct / st.total) * 100;
        if (acc > maxA) { maxA = acc; strongest = `${s} (${acc.toFixed(1)}%)`; }
        if (acc < minA) { minA = acc; weakest = `${s} (${acc.toFixed(1)}%)`; }
      }
    }
    return { hasData: true, totalAttempts, avgScore, highestScore, avgAccuracy, strongest, weakest, subjectMap };
  },
  destroyCharts() {
    for (const k in this.charts) { if (this.charts[k] && this.charts[k].destroy) this.charts[k].destroy(); }
    this.charts = {};
  },
  renderCharts(attempts) {
    this.destroyCharts();
    if (!attempts || attempts.length === 0 || !window.Chart) return;
    const sorted = [...attempts].sort((a,b) => new Date(a.submittedAt) - new Date(b.submittedAt));
    const labels = sorted.map((a, i) => `Test ${a.testId} (#${i+1})`);
    const scores = sorted.map(a => a.result.finalScore);

    const scCanvas = document.getElementById('chartScoreProgression');
    if (scCanvas) {
      this.charts.score = new Chart(scCanvas, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Score', data: scores, borderColor: '#0f2c59', backgroundColor: 'rgba(15,44,89,0.1)', tension: 0.2, fill: true }] }
      });
    }

    const latest = sorted[sorted.length - 1].result;
    const bdCanvas = document.getElementById('chartLatestBreakdown');
    if (bdCanvas) {
      this.charts.breakdown = new Chart(bdCanvas, {
        type: 'doughnut',
        data: { labels: ['Correct', 'Incorrect', 'Unattempted'], datasets: [{ data: [latest.correctCount, latest.incorrectCount, latest.unattemptedCount], backgroundColor: ['#28a745', '#dc3545', '#6c757d'] }] }
      });
    }

    const subjData = this.renderDashboard(attempts).subjectMap || {};
    const subLabels = Object.keys(subjData);
    const subAccs = subLabels.map(s => ((subjData[s].correct / subjData[s].total) * 100).toFixed(1));
    const subCanvas = document.getElementById('chartSubjectAccuracy');
    if (subCanvas && subLabels.length > 0) {
      this.charts.subj = new Chart(subCanvas, {
        type: 'bar',
        data: { labels: subLabels, datasets: [{ label: 'Accuracy %', data: subAccs, backgroundColor: '#1f4287' }] }
      });
    }
  }
};
window.AnalyticsEngine = AnalyticsEngine;
