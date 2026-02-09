document.addEventListener("DOMContentLoaded", () => {

  function initTooltips(scope = document) {
    try {
      scope.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
        bootstrap.Tooltip.getOrCreateInstance(el);
      });
    } catch {}
  }
  initTooltips();

  const addQuestionsModalEl = document.getElementById("AddQuestionsModal");
  const addQuestionsForm = document.getElementById("addQuestionsForm");
  const discardQuestionsBtn = document.getElementById("discardQuestionsBtn");

  // Dynamic questions UI refs
  const questionsContainer = document.getElementById("questionsContainer");
  const questionCardTemplate = document.getElementById("questionCardTemplate");
  const btnAddQuestion = document.getElementById("btnAddQuestion");

  const deleteChapterModalEl = document.getElementById("deleteChapterModal");
  const deleteChapterIdEl = document.getElementById("deleteChapterId");
  const confirmDeleteChapterBtn = document.getElementById("confirmDeleteChapterBtn");

  const courseId = window.__courseId ?? null;

  let activeChapterId = null;
  let isSubmitting = false;

  const MAX_QUESTIONS = 50;
  const objectiveSet = new Set(["remembering", "understanding", "creativity"]);
  const difficultySet = new Set(["simple", "difficult"]);

  // =========================
  // Helpers: dynamic cards
  // =========================
  function getCards() {
    return [...(questionsContainer?.querySelectorAll(".question-card") ?? [])];
  }

  function updateCardNumbers() {
    const cards = getCards();
    cards.forEach((card, idx) => {
      const n = idx + 1;
      const numEl = card.querySelector(".q-number");
      if (numEl) numEl.textContent = n;

      // Store index for payload
      card.dataset.qIndex = String(idx);

      // IMPORTANT: make radio "name" unique per question so they don't interfere
      const radioName = `q${idx}_correct`;
      card.querySelectorAll('input.q-correct[type="radio"]').forEach(r => {
        r.name = radioName;
      });
    });
  }

  function addQuestionCard(prefill = null) {
    if (!questionsContainer || !questionCardTemplate) return;

    const count = getCards().length;
    if (count >= MAX_QUESTIONS) {
      alert(`Maximum is ${MAX_QUESTIONS} questions.`);
      return;
    }

    const node = questionCardTemplate.content.cloneNode(true);
    const card = node.querySelector(".question-card");
    if (!card) return;

    // Apply prefill if provided
    if (prefill) {
      const diffSel = card.querySelector(".q-difficulty");
      const objSel = card.querySelector(".q-objective");
      const textIn = card.querySelector(".q-text");
      if (diffSel && prefill.difficulty) diffSel.value = prefill.difficulty;
      if (objSel && prefill.objective) objSel.value = prefill.objective;
      if (textIn && prefill.content) textIn.value = prefill.content;

      const choiceInputs = card.querySelectorAll(".q-choice");
      choiceInputs.forEach(inp => {
        const k = inp.dataset.choice;
        if (k && prefill.choices?.[k] != null) inp.value = prefill.choices[k];
      });

      if (prefill.correct) {
        const r = card.querySelector(`input.q-correct[value="${prefill.correct}"]`);
        if (r) r.checked = true;
      }
    }

    questionsContainer.appendChild(node);
    updateCardNumbers();
  }

  function resetQuestionsUI() {
    if (!questionsContainer) return;
    questionsContainer.innerHTML = "";
    addQuestionCard(); // start with 1 card
    addQuestionsForm?.classList.remove("was-validated");
  }

  // Add button
  btnAddQuestion?.addEventListener("click", () => addQuestionCard());

  // Remove button (event delegation)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btnRemoveQuestion");
    if (!btn) return;

    const card = btn.closest(".question-card");
    if (!card) return;

    // Keep at least 1 question
    const cards = getCards();
    if (cards.length <= 1) {
      alert("At least one question is required.");
      return;
    }

    card.remove();
    updateCardNumbers();
  });

  // Discard (clear everything back to 1 question)
  discardQuestionsBtn?.addEventListener("click", () => {
    addQuestionsForm?.reset();
    resetQuestionsUI();
  });

  // =========================
  // Store chapterId when opening delete modal
  // =========================
  document.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="delete-chapter"]');
    if (!btn) return;

    const chapterId = btn.dataset.chapterId;
    if (!chapterId) return;

    if (deleteChapterIdEl) deleteChapterIdEl.value = chapterId;
  });

  // =========================
  // Confirm delete
  // =========================
  confirmDeleteChapterBtn?.addEventListener("click", async () => {
    const chapterId = deleteChapterIdEl?.value;
    if (!chapterId) {
      alert("Chapter ID missing.");
      return;
    }

    const res = await fetch(`/chapters/${encodeURIComponent(chapterId)}`, {
      method: "DELETE",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      alert(data?.detail || data?.message || "Failed to delete chapter");
      return;
    }

    try {
      bootstrap.Modal.getInstance(deleteChapterModalEl)?.hide();
    } catch {}

    window.location.reload();
  });

  // =========================
  // ONE Action handler
  // =========================
  document.addEventListener("click", async (e) => {
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;

    const action = actionEl.dataset.action;

    // Add chapter
    if (action === "add-chapter") {
      e.preventDefault();

      if (!courseId) {
        alert("courseId missing (window.__courseId).");
        return;
      }

      const res = await fetch(`/courses/${encodeURIComponent(courseId)}/chapters`, {
        method: "POST",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.detail || "Failed to add chapter");
        return;
      }

      window.location.reload();
      return;
    }

    // View questions (leave as TODO)
    if (action === "view-questions") {
      e.preventDefault();
      return;
    }

    // Generate questions => open modal
    if (action === "generate-questions") {
      e.preventDefault();

      const chapterId = actionEl.dataset.chapterId;
      if (!chapterId) return;

      activeChapterId = chapterId;

      if (!addQuestionsModalEl) {
        alert("AddQuestionsModal is missing in HTML.");
        return;
      }

      bootstrap.Modal.getOrCreateInstance(addQuestionsModalEl).show();
      return;
    }

    // Delete chapter: let Bootstrap open modal
    if (action === "delete-chapter") {
      if (actionEl.tagName === "A") e.preventDefault();
      return;
    }
  });

  // =========================
  // Build payload from dynamic cards
  // =========================
  function buildPayloadFromCards() {
    const cards = getCards();
    if (cards.length < 1) throw new Error("Please add at least one question.");
    if (cards.length > MAX_QUESTIONS) throw new Error(`Max is ${MAX_QUESTIONS} questions.`);

    const questions = [];

    for (const card of cards) {
      const content = (card.querySelector(".q-text")?.value ?? "").trim();
      const difficulty = (card.querySelector(".q-difficulty")?.value ?? "").trim();
      const objective = (card.querySelector(".q-objective")?.value ?? "").trim();

      if (!content) throw new Error("Some question content is empty.");
      if (!difficultySet.has(difficulty)) throw new Error(`Invalid difficulty: ${difficulty}`);
      if (!objectiveSet.has(objective)) throw new Error(`Invalid objective: ${objective}`);

      const A = (card.querySelector('.q-choice[data-choice="A"]')?.value ?? "").trim();
      const B = (card.querySelector('.q-choice[data-choice="B"]')?.value ?? "").trim();
      const C = (card.querySelector('.q-choice[data-choice="C"]')?.value ?? "").trim();

      if (!A || !B || !C) throw new Error("Each question must have choices A, B, and C.");

      const correctEl = card.querySelector('input.q-correct[type="radio"]:checked');
      const correct = correctEl?.value ?? "";
      if (!["A", "B", "C"].includes(correct)) throw new Error("Select the correct choice for every question.");

      questions.push({
        content,
        difficulty,
        objective,
        choices: [
          { content: A, is_correct: correct === "A" },
          { content: B, is_correct: correct === "B" },
          { content: C, is_correct: correct === "C" },
        ],
      });
    }

    return { questions };
  }

  // Strong validation:
  // - HTML5 checkValidity()
  // - plus: ensure each card has checked correct answer
  function validateDynamicForm(formEl) {
    // HTML constraints
    if (!formEl.checkValidity()) {
      formEl.classList.add("was-validated");
      return false;
    }

    // Ensure each card has a checked radio
    const cards = getCards();
    for (const card of cards) {
      const checked = card.querySelector('input.q-correct[type="radio"]:checked');
      if (!checked) {
        alert("Please select the correct choice for every question.");
        return false;
      }
    }

    return true;
  }

  // =========================
  // Submit questions
  // =========================
  addQuestionsForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!activeChapterId) {
      alert("No chapter selected.");
      return;
    }
    if (isSubmitting) return;

    if (!validateDynamicForm(addQuestionsForm)) return;

    let payload;
    try {
      payload = buildPayloadFromCards();
    } catch (err) {
      alert(err?.message || "Invalid form data.");
      return;
    }

    isSubmitting = true;

    const url = `/chapters/${encodeURIComponent(activeChapterId)}/questions`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      isSubmitting = false;
      alert(data?.detail || "Failed to submit questions");
      return;
    }

    // Close modal
    try {
      bootstrap.Modal.getInstance(addQuestionsModalEl)?.hide();
    } catch {}

    // Reset after success
    addQuestionsForm.reset();
    resetQuestionsUI();

    activeChapterId = null;
    isSubmitting = false;

    alert("Questions submitted successfully ✅");
    window.location.reload();
  });

  // Initialize modal UI once (in case modal is opened without clicking generate)
  if (questionsContainer && questionCardTemplate) {
    resetQuestionsUI();
  }
});
