const ScoringEngine = {
  calculateResult({ questions, answerKeyMap, responses, timeConsumedSeconds, settings }) {
    const totalQuestions = questions.length;
    let correctCount = 0, incorrectCount = 0, unattemptedCount = 0;
    const subjectWise = {}, questionAnalysis = [];

    questions.forEach(q => {
      const qNo = q.questionNo;
      const resp = responses[qNo] || {};
      const candidateAns = resp.selectedOption || null;
      const correctAns = answerKeyMap.get(qNo) || null;
      const subject = q.subject || 'General';

      if (!subjectWise[subject]) subjectWise[subject] = { total: 0, correct: 0, incorrect: 0, unattempted: 0 };
      subjectWise[subject].total++;

      let status = 'unattempted';
      if (!candidateAns) {
        unattemptedCount++;
        subjectWise[subject].unattempted++;
      } else if (candidateAns === correctAns) {
        correctCount++;
        status = 'correct';
        subjectWise[subject].correct++;
      } else {
        incorrectCount++;
        status = 'incorrect';
        subjectWise[subject].incorrect++;
      }

      questionAnalysis.push({
        questionNo: qNo, question: q.question, options: q.options, subject,
        explanation: q.explanation || '', candidateAnswer: candidateAns,
        correctAnswer: correctAns, status, markedForReview: !!resp.markedForReview
      });
    });

    const marksPerCorrect = Number(settings.marksPerCorrect) || 1.0;
    const negativeMarksRate = Number(settings.negativeMarks) || 0.25;
    const finalScore = parseFloat((correctCount * marksPerCorrect - incorrectCount * negativeMarksRate).toFixed(2));
    const maxMarks = totalQuestions * marksPerCorrect;
    const attemptedCount = correctCount + incorrectCount;
    const accuracy = attemptedCount > 0 ? parseFloat(((correctCount / attemptedCount) * 100).toFixed(2)) : 0;
    const attemptPercentage = totalQuestions > 0 ? parseFloat(((attemptedCount / totalQuestions) * 100).toFixed(2)) : 0;

    return {
      totalQuestions, attemptedCount, correctCount, incorrectCount, unattemptedCount,
      finalScore, maxMarks, accuracy, attemptPercentage, timeConsumedSeconds,
      avgTimePerQuestion: attemptedCount > 0 ? Math.round(timeConsumedSeconds / attemptedCount) : 0,
      subjectWise, questionAnalysis
    };
  }
};
window.ScoringEngine = ScoringEngine;
