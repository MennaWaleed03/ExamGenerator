import { apiFetch } from "/static/js/api.js";

document.addEventListener("DOMContentLoaded", () => {
  function redirectToLogin() {
    window.location.href = "/users/login";
  }

  function initTooltips(scope = document) {
    try {
      scope.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
        bootstrap.Tooltip.getOrCreateInstance(el);
      });
    } catch {}
  }

  initTooltips();

  // =========================
  // DOM refs
  // =========================
  const addQuestionsModalEl = document.getElementById("AddQuestionsModal");
  const addQuestionsForm = document.getElementById("addQuestionsForm");
  const discardQuestionsBtn = document.getElementById("discardQuestionsBtn");

  const chooseQuestionMethodModalEl = document.getElementById("ChooseQuestionMethodModal");
  const btnChooseManual = document.getElementById("btnChooseManual");
  const btnChooseAI = document.getElementById("btnChooseAI");

  const aiGenerateQuestionsModalEl = document.getElementById("AIGenerateQuestionsModal");
  const aiGenerateForm = document.getElementById("aiGenerateForm");
  const aiQuestionCount = document.getElementById("aiQuestionCount");

  const questionsContainer = document.getElementById("questionsContainer");
  const questionCardTemplate = document.getElementById("questionCardTemplate");
  const btnAddQuestion = document.getElementById("btnAddQuestion");

  const deleteChapterModalEl = document.getElementById("deleteChapterModal");
  const deleteChapterIdEl = document.getElementById("deleteChapterId");
  const confirmDeleteChapterBtn = document.getElementById("confirmDeleteChapterBtn");

  const courseId = window.__courseId ?? null;

  let activeChapterId = null;
  let isSubmitting = false;
  let isAIGenerating = false;

  const MAX_QUESTIONS = 50;
  const objectiveSet = new Set(["remembering", "understanding", "creativity"]);
  const difficultySet = new Set(["simple", "difficult"]);

  // =========================
  // File upload
  // =========================
  document.addEventListener("change", async (e) => {
    const input = e.target.closest(".chapter-file-input");
    if (!input) return;

    const chapterId = input.dataset.chapterId;
    const file = input.files?.[0];

    if (!chapterId || !file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/chapters/${encodeURIComponent(chapterId)}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);
      console.log("Upload response:", response.status, data);

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      if (!response.ok) {
        alert(data?.detail || data?.message || "Upload failed");
        return;
      }

      alert(data?.message || "File uploaded successfully ✅");
      window.location.reload();
    } catch (err) {
      console.error("Upload error:", err);
      alert("Unexpected error while uploading file");
    } finally {
      input.value = "";
    }
  });

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

      card.dataset.qIndex = String(idx);

      const radioName = `q${idx}_correct`;
      card.querySelectorAll('input.q-correct[type="radio"]').forEach((r) => {
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

    if (prefill) {
      const diffSel = card.querySelector(".q-difficulty");
      const objSel = card.querySelector(".q-objective");
      const textIn = card.querySelector(".q-text");

      if (diffSel && prefill.difficulty) diffSel.value = prefill.difficulty;
      if (objSel && prefill.objective) objSel.value = prefill.objective;
      if (textIn && prefill.content) textIn.value = prefill.content;

      const choiceInputs = card.querySelectorAll(".q-choice");
      choiceInputs.forEach((inp) => {
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
    addQuestionCard();
    addQuestionsForm?.classList.remove("was-validated");
  }

  function hideModal(modalEl) {
    try {
      bootstrap.Modal.getInstance(modalEl)?.hide();
    } catch {}
  }

  function showModal(modalEl) {
    if (!modalEl) return;
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }

  // =========================
  // Manual/AI choice buttons
  // =========================
  btnChooseManual?.addEventListener("click", () => {
    hideModal(chooseQuestionMethodModalEl);
    showModal(addQuestionsModalEl);
  });

  btnChooseAI?.addEventListener("click", () => {
    hideModal(chooseQuestionMethodModalEl);
    aiGenerateForm?.classList.remove("was-validated");
    showModal(aiGenerateQuestionsModalEl);
  });

  // =========================
  // Add/remove/discard dynamic questions
  // =========================
  btnAddQuestion?.addEventListener("click", () => addQuestionCard());

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btnRemoveQuestion");
    if (!btn) return;

    const card = btn.closest(".question-card");
    if (!card) return;

    const cards = getCards();
    if (cards.length <= 1) {
      alert("At least one question is required.");
      return;
    }

    card.remove();
    updateCardNumbers();
  });

  discardQuestionsBtn?.addEventListener("click", () => {
    addQuestionsForm?.reset();
    resetQuestionsUI();
  });

  // =========================
  // Delete modal chapter id
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

    const res = await apiFetch(`/chapters/${encodeURIComponent(chapterId)}`, {
      method: "DELETE",
    });

    if (res.status === 401) {
      redirectToLogin();
      return;
    }

    let data = null;
    if (res.status !== 204) data = await res.json().catch(() => null);

    if (!res.ok) {
      alert(data?.detail || data?.message || "Failed to delete chapter");
      return;
    }

    hideModal(deleteChapterModalEl);
    window.location.reload();
  });

  // =========================
  // Main action handler
  // =========================
  document.addEventListener("click", async (e) => {
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;

    const action = actionEl.dataset.action;

    if (action === "add-chapter") {
      e.preventDefault();

      if (!courseId) {
        alert("courseId missing (window.__courseId).");
        return;
      }

      const res = await apiFetch(`/courses/${encodeURIComponent(courseId)}/chapters`, {
        method: "POST",
      });

      if (res.status === 401) {
        redirectToLogin();
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.detail || "Failed to add chapter");
        return;
      }

      window.location.reload();
      return;
    }

    if (action === "view-questions") {
      e.preventDefault();
      return;
    }

    if (action === "generate-questions") {
      e.preventDefault();

      const chapterId = actionEl.dataset.chapterId;
      if (!chapterId) return;

      activeChapterId = chapterId;

      if (!chooseQuestionMethodModalEl) {
        alert("ChooseQuestionMethodModal is missing in HTML.");
        return;
      }

      showModal(chooseQuestionMethodModalEl);
      return;
    }

    if (action === "delete-chapter") {
      if (actionEl.tagName === "A") e.preventDefault();
      return;
    }
  });

  // =========================
  // Manual questions payload
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

      if (!A || !B || !C) {
        throw new Error("Each question must have choices A, B, and C.");
      }

      const correctEl = card.querySelector('input.q-correct[type="radio"]:checked');
      const correct = correctEl?.value ?? "";
      if (!["A", "B", "C"].includes(correct)) {
        throw new Error("Select the correct choice for every question.");
      }

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

  function validateDynamicForm(formEl) {
    if (!formEl.checkValidity()) {
      formEl.classList.add("was-validated");
      return false;
    }

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
  // Submit manual questions
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

    try {
      const url = `/chapters/${encodeURIComponent(activeChapterId)}/questions`;

      const res = await apiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        redirectToLogin();
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.detail || data?.message || "Failed to submit questions");
        return;
      }

      hideModal(addQuestionsModalEl);
      addQuestionsForm.reset();
      resetQuestionsUI();
      activeChapterId = null;

      alert(data?.message || "Questions submitted successfully ✅");
      window.location.reload();
    } finally {
      isSubmitting = false;
    }
  });

  // =========================
  // Submit AI generation
  // =========================
    // =========================
  // Submit AI generation
  // =========================
  aiGenerateForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!activeChapterId) {
      alert("No chapter selected.");
      return;
    }

    if (isAIGenerating) return;

    const count = Number(aiQuestionCount?.value ?? 0);

    if (!Number.isInteger(count) || count < 1 || count > MAX_QUESTIONS) {
      aiGenerateForm.classList.add("was-validated");
      alert(`Please enter a valid number between 1 and ${MAX_QUESTIONS}.`);
      return;
    }

    isAIGenerating = true;

    try {
      const payload = {
        questions_num: count,
      };

      const url = `/chapters/${encodeURIComponent(activeChapterId)}/questions/ai-generate`;

      const res = await apiFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        redirectToLogin();
        return;
      }

      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        alert(data?.detail || data?.message || "Failed to generate AI questions");
        return;
      }

      hideModal(aiGenerateQuestionsModalEl);
      aiGenerateForm.reset();
      aiGenerateForm.classList.remove("was-validated");
      activeChapterId = null;

      alert(data?.message || "AI question generation finished ✅");
      window.location.reload();
    } catch (err) {
      console.error("AI generation error:", err);
      alert("Unexpected error while generating AI questions");
    } finally {
      isAIGenerating = false;
    }
  });

  // =========================
  // Initial setup
  // =========================
  if (questionsContainer && questionCardTemplate) {
    resetQuestionsUI();
  }
});