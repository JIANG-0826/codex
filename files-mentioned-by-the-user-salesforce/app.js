const bank = window.ADM201_QUESTION_BANK;
const questions = bank.questions;
const storageKey = "adm201-platform-admin-practice-v1";

const state = {
  mode: "home",
  title: "",
  pool: [],
  basePool: [],
  index: 0,
  selected: new Set(),
  answered: false,
  session: { correct: 0, total: 0, missed: 0 },
  progress: loadProgress(),
};

const els = {
  homeButton: document.querySelector("#homeButton"),
  homeView: document.querySelector("#homeView"),
  quizView: document.querySelector("#quizView"),
  scoreView: document.querySelector("#scoreView"),
  totalQuestions: document.querySelector("#totalQuestions"),
  answeredCount: document.querySelector("#answeredCount"),
  accuracyRate: document.querySelector("#accuracyRate"),
  favoriteCount: document.querySelector("#favoriteCount"),
  wrongQuestionCount: document.querySelector("#wrongQuestionCount"),
  categoryList: document.querySelector("#categoryList"),
  quizMode: document.querySelector("#quizMode"),
  quizTitle: document.querySelector("#quizTitle"),
  favoriteButton: document.querySelector("#favoriteButton"),
  resetCurrentButton: document.querySelector("#resetCurrentButton"),
  progressText: document.querySelector("#progressText"),
  wrongCountText: document.querySelector("#wrongCountText"),
  progressFill: document.querySelector("#progressFill"),
  questionNumber: document.querySelector("#questionNumber"),
  questionCategory: document.querySelector("#questionCategory"),
  questionText: document.querySelector("#questionText"),
  optionsList: document.querySelector("#optionsList"),
  resultPanel: document.querySelector("#resultPanel"),
  resultTitle: document.querySelector("#resultTitle"),
  correctAnswerText: document.querySelector("#correctAnswerText"),
  explanationText: document.querySelector("#explanationText"),
  submitButton: document.querySelector("#submitButton"),
  nextButton: document.querySelector("#nextButton"),
  scoreTitle: document.querySelector("#scoreTitle"),
  scoreCircle: document.querySelector("#scoreCircle"),
  scorePercent: document.querySelector("#scorePercent"),
  scoreDetail: document.querySelector("#scoreDetail"),
  sessionCorrect: document.querySelector("#sessionCorrect"),
  sessionTotal: document.querySelector("#sessionTotal"),
  sessionWrong: document.querySelector("#sessionWrong"),
  restartButton: document.querySelector("#restartButton"),
  scoreWrongButton: document.querySelector("#scoreWrongButton"),
  scoreHomeButton: document.querySelector("#scoreHomeButton"),
  clearProgressButton: document.querySelector("#clearProgressButton"),
};

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    return {
      favorites: parsed?.favorites ?? {},
      wrongCounts: parsed?.wrongCounts ?? {},
      attempts: parsed?.attempts ?? {},
    };
  } catch {
    return { favorites: {}, wrongCounts: {}, attempts: {} };
  }
}

function saveProgress() {
  localStorage.setItem(storageKey, JSON.stringify(state.progress));
  renderSummary();
}

function keyFor(question) {
  return question.uid;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function renderSummary() {
  const favorites = Object.values(state.progress.favorites).filter(Boolean).length;
  const wrongs = questions.filter((q) => (state.progress.wrongCounts[keyFor(q)] || 0) > 0).length;
  const answered = Object.keys(state.progress.attempts).length;
  const totals = Object.values(state.progress.attempts).reduce(
    (acc, item) => {
      acc.correct += item.correct || 0;
      acc.total += item.total || 0;
      return acc;
    },
    { correct: 0, total: 0 },
  );
  const accuracy = totals.total ? Math.round((totals.correct / totals.total) * 100) : 0;
  els.totalQuestions.textContent = questions.length;
  els.answeredCount.textContent = answered;
  els.accuracyRate.textContent = `${accuracy}%`;
  els.favoriteCount.textContent = favorites;
  els.wrongQuestionCount.textContent = wrongs;
}

function renderCategories() {
  els.categoryList.innerHTML = "";
  const maxWeight = Math.max(...bank.categories.map((cat) => cat.weight));
  bank.categories.forEach((category) => {
    const button = document.createElement("button");
    button.className = "category-button";
    button.type = "button";
    button.innerHTML = `
      <span>${category.title}</span>
      <small>${category.count} questions</small>
      <div class="weight-row">
        <b>${category.weight}%</b>
        <div class="weight-bar"><i style="width: ${(category.weight / maxWeight) * 100}%"></i></div>
      </div>
    `;
    button.addEventListener("click", () => {
      const pool = questions.filter((q) => q.category === category.title);
      startQuiz(`Topic Practice`, category.title, shuffle(pool));
    });
    els.categoryList.append(button);
  });
}

function showHome() {
  state.mode = "home";
  els.homeView.classList.remove("hidden");
  els.quizView.classList.add("hidden");
  els.scoreView.classList.add("hidden");
  renderSummary();
}

function startQuiz(modeLabel, title, pool) {
  if (!pool.length) {
    alert("No questions are available for this section yet.");
    return;
  }
  state.mode = modeLabel;
  state.title = title;
  state.basePool = [...pool];
  state.pool = [...pool];
  state.index = 0;
  state.session = { correct: 0, total: 0, missed: 0 };
  els.homeView.classList.add("hidden");
  els.quizView.classList.remove("hidden");
  els.scoreView.classList.add("hidden");
  renderQuestion();
}

function currentQuestion() {
  return state.pool[state.index];
}

function renderQuestion() {
  const question = currentQuestion();
  state.selected = new Set();
  state.answered = false;

  els.quizMode.textContent = state.mode;
  els.quizTitle.textContent = state.title;
  els.progressText.textContent = `${state.index + 1} / ${state.pool.length}`;
  els.progressFill.style.width = `${((state.index + 1) / state.pool.length) * 100}%`;
  els.questionNumber.textContent = `Question #${question.id}`;
  els.questionCategory.textContent = `${question.category} (${question.weight}%)`;
  els.questionText.textContent = question.question;
  const sessionAccuracy = state.session.total ? Math.round((state.session.correct / state.session.total) * 100) : 0;
  els.wrongCountText.textContent = `Mistakes: ${state.progress.wrongCounts[keyFor(question)] || 0} | Session: ${state.session.correct}/${state.session.total} (${sessionAccuracy}%)`;
  els.favoriteButton.textContent = state.progress.favorites[keyFor(question)] ? "Saved" : "Save";
  els.resetCurrentButton.disabled = (state.progress.wrongCounts[keyFor(question)] || 0) === 0;
  els.resultPanel.className = "result-panel hidden";
  els.submitButton.classList.remove("hidden");
  els.nextButton.classList.add("hidden");
  els.submitButton.disabled = true;

  els.optionsList.innerHTML = "";
  question.options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-button";
    button.dataset.label = option.label;
    button.innerHTML = `<span class="label">${option.label}</span><span>${option.text}</span>`;
    button.addEventListener("click", () => toggleOption(option.label));
    els.optionsList.append(button);
  });
}

function toggleOption(label) {
  if (state.answered) return;
  const question = currentQuestion();
  if (question.answer.length === 1) {
    state.selected = new Set([label]);
  } else if (state.selected.has(label)) {
    state.selected.delete(label);
  } else {
    state.selected.add(label);
  }
  document.querySelectorAll(".option-button").forEach((button) => {
    button.classList.toggle("selected", state.selected.has(button.dataset.label));
  });
  els.submitButton.disabled = state.selected.size === 0;
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function submitAnswer() {
  if (state.answered || state.selected.size === 0) return;
  const question = currentQuestion();
  const selected = [...state.selected].sort();
  const correct = [...question.answer].sort();
  const isCorrect = arraysEqual(selected, correct);

  state.answered = true;
  document.querySelectorAll(".option-button").forEach((button) => {
    const label = button.dataset.label;
    if (correct.includes(label)) button.classList.add("correct");
    if (selected.includes(label) && !correct.includes(label)) button.classList.add("incorrect");
  });

  if (!isCorrect) {
    const key = keyFor(question);
    state.progress.wrongCounts[key] = (state.progress.wrongCounts[key] || 0) + 1;
  }

  const key = keyFor(question);
  if (!state.progress.attempts[key]) state.progress.attempts[key] = { correct: 0, total: 0 };
  state.progress.attempts[key].total += 1;
  if (isCorrect) state.progress.attempts[key].correct += 1;
  state.session.total += 1;
  if (isCorrect) state.session.correct += 1;
  else state.session.missed += 1;
  saveProgress();

  els.resultPanel.className = `result-panel ${isCorrect ? "correct" : "incorrect"}`;
  els.resultTitle.textContent = isCorrect ? "Correct" : "Incorrect";
  els.correctAnswerText.textContent = `Answer: ${correct.join(", ")}`;
  els.explanationText.textContent = question.explanation;
  const sessionAccuracy = Math.round((state.session.correct / state.session.total) * 100);
  els.wrongCountText.textContent = `Mistakes: ${state.progress.wrongCounts[keyFor(question)] || 0} | Session: ${state.session.correct}/${state.session.total} (${sessionAccuracy}%)`;
  els.submitButton.classList.add("hidden");
  els.nextButton.classList.remove("hidden");
  els.nextButton.textContent = state.index >= state.pool.length - 1 ? "View Result" : "Next Question";
}

function nextQuestion() {
  state.index += 1;
  if (state.index >= state.pool.length) {
    renderScore();
    return;
  }
  renderQuestion();
}

function renderScore() {
  const pct = state.session.total ? Math.round((state.session.correct / state.session.total) * 100) : 0;
  const circumference = 2 * Math.PI * 56;
  els.homeView.classList.add("hidden");
  els.quizView.classList.add("hidden");
  els.scoreView.classList.remove("hidden");
  els.scoreTitle.textContent = pct >= 65 ? "Certification Line Reached" : "Keep Practicing";
  els.scorePercent.textContent = `${pct}%`;
  els.scoreDetail.textContent = `${state.title} | ${state.session.correct} correct out of ${state.session.total}. Passing reference: 65%.`;
  els.sessionCorrect.textContent = state.session.correct;
  els.sessionTotal.textContent = state.session.total;
  els.sessionWrong.textContent = state.session.missed;
  els.scoreCircle.style.strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
  renderSummary();
}

function toggleFavorite() {
  const question = currentQuestion();
  const key = keyFor(question);
  state.progress.favorites[key] = !state.progress.favorites[key];
  if (!state.progress.favorites[key]) delete state.progress.favorites[key];
  saveProgress();
  els.favoriteButton.textContent = state.progress.favorites[key] ? "Saved" : "Save";
}

function resetCurrentMistakes() {
  const question = currentQuestion();
  delete state.progress.wrongCounts[keyFor(question)];
  saveProgress();
  els.wrongCountText.textContent = "Mistakes: 0";
  els.resetCurrentButton.disabled = true;
}

function clearProgress() {
  if (!confirm("Clear all local practice progress, favorites, and mistake counts?")) return;
  localStorage.removeItem(storageKey);
  state.progress = { favorites: {}, wrongCounts: {}, attempts: {} };
  renderSummary();
  if (!els.quizView.classList.contains("hidden")) renderQuestion();
}

function restartQuiz() {
  startQuiz(state.mode, state.title, shuffle(state.basePool));
}

function startWrongReview() {
  const pool = questions.filter((q) => (state.progress.wrongCounts[keyFor(q)] || 0) > 0);
  startQuiz("Wrong Review", "Questions With Mistakes", shuffle(pool));
}

function bindEvents() {
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.mode;
      if (mode === "random") startQuiz("Random Practice", "All Questions", shuffle(questions));
      if (mode === "category") document.querySelector("#categoryTitle").scrollIntoView({ behavior: "smooth" });
      if (mode === "wrong") startWrongReview();
      if (mode === "favorites") {
        const pool = questions.filter((q) => state.progress.favorites[keyFor(q)]);
        startQuiz("Favorites", "Saved Questions", shuffle(pool));
      }
    });
  });
  els.homeButton.addEventListener("click", showHome);
  els.submitButton.addEventListener("click", submitAnswer);
  els.nextButton.addEventListener("click", nextQuestion);
  els.favoriteButton.addEventListener("click", toggleFavorite);
  els.resetCurrentButton.addEventListener("click", resetCurrentMistakes);
  els.restartButton.addEventListener("click", restartQuiz);
  els.scoreWrongButton.addEventListener("click", startWrongReview);
  els.scoreHomeButton.addEventListener("click", showHome);
  els.clearProgressButton.addEventListener("click", clearProgress);
}

renderSummary();
renderCategories();
bindEvents();
