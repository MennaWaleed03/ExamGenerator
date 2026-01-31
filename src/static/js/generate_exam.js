// static/js/exams.js
console.log("exams.js LOADED ✅ version = 2026-02-01");

document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // Refs
  // -------------------------
  const courseId = window.__courseId ?? null;

  const btnOpen = document.getElementById("btnOpenGenerateExamModal");

  const generateModalEl = document.getElementById("generateExamModal");
  const generateForm = document.getElementById("generateExamForm");
  const generateErrorEl = document.getElementById("generateExamError");
  const btnGenerate = document.getElementById("btnGenerateExamSubmit");
  const spinnerGenerate = document.getElementById("generateExamSpinner");

  const resultModalEl = document.getElementById("generatedExamModal");
  const resultBodyEl = document.getElementById("generatedExamBody");
  const resultErrEl = document.getElementById("generatedExamError");
  const examIdEl = document.getElementById("generatedExamId");
  const examStatusEl = document.getElementById("generatedExamStatus");

  const btnRegenerate = document.getElementById("btnRegenerateExam");
  const btnSave = document.getElementById("btnSaveExam");

  if (!courseId) {
    console.warn("window.__courseId is missing. Exam generation disabled.");
    btnOpen?.setAttribute("disabled", "disabled");
    return;
  }

  // Bootstrap helpers
  function showModal(modalEl) {
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }
  function hideModal(modalEl) {
    try { bootstrap.Modal.getInstance(modalEl)?.hide(); } catch {}
  }

  // -------------------------
  // State
  // -------------------------
  let lastConstraints = null;   // keep constraints for regenerate
  let currentExam = null;       // last response: { exam_id, exam_status, questions }
  let isGenerating = false;
  let isSaving = false;
  let regenerateCount = 0;      // client-side display only

  // -------------------------
  // Small UI helpers
  // -------------------------
  function setError(el, msg) {
    if (!el) return;
    if (!msg) {
      el.classList.add("d-none");
      el.textContent = "";
      return;
    }
    el.textContent = msg;
    el.classList.remove("d-none");
  }

  function setLoadingGenerating(on) {
    isGenerating = on;
    if (btnGenerate) btnGenerate.disabled = on;
    if (spinnerGenerate) spinnerGenerate.classList.toggle("d-none", !on);
    if (btnRegenerate) btnRegenerate.disabled = on;
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Render exam in the result modal
  function renderExam(exam) {
    if (!exam) return;


    const questions = Array.isArray(exam.questions) ? exam.questions : [];
    if (questions.length === 0) {
      resultBodyEl.innerHTML = `<div class="text-muted">No questions returned.</div>`;
      return;
    }

    const html = questions.map((q, idx) => {
      const choices = Array.isArray(q.choices) ? q.choices : [];
      return `
        <div class="border rounded p-3 mb-3">
          <div class="d-flex justify-content-between align-items-start gap-3">
            <div class="fw-semibold">${idx + 1}. ${escapeHtml(q.content)}</div>
            <div class="text-muted small text-end">
              <div>Difficulty: ${escapeHtml(q.difficulty)}</div>
              <div>Objective: ${escapeHtml(q.objective)}</div>
              </div>
            </div>
          </div>

          <ol class="mt-2 mb-0">
            ${choices.map(c => `
              <li>
                ${escapeHtml(c.content)}
                ${c.is_correct ? `<span class="badge bg-success ms-2">correct</span>` : ``}
                
              </li>
            `).join("")}
          </ol>
        </div>
      `;
    }).join("");

    resultBodyEl.innerHTML = html;
  }

  // -------------------------
  // Collect constraints from form -> payload for API
  // -------------------------
  function getConstraintsPayload() {
    const fd = new FormData(generateForm);

    // IMPORTANT: names here match your ExamDetailsRequestModel fields
    // (you wrote remembring_questions with that spelling, so we keep it)
    const payload = {
      questions_per_chapter: Number(fd.get("questions_per_chapter")),
      difficult_questions: Number(fd.get("difficult_questions")),
      simple_questions: Number(fd.get("simple_questions")),
      remembring_questions: Number(fd.get("remembring_questions")),
      understanding_questions: Number(fd.get("understanding_questions")),
      creative_questions: Number(fd.get("creative_questions")),
    };

    // hard validation (numbers + non-negative + integers)
    for (const [k, v] of Object.entries(payload)) {
      if (!Number.isFinite(v)) throw new Error(`${k} must be a number.`);
      if (v < 0) throw new Error(`${k} must be >= 0.`);
      if (!Number.isInteger(v)) throw new Error(`${k} must be an integer.`);
    }
    if (payload.questions_per_chapter < 1) {
      throw new Error("questions_per_chapter must be at least 1.");
    }

    return payload;
  }

  // -------------------------
  // API calls
  // -------------------------
  async function apiGenerateExam(constraints) {
    const url = `/courses/${encodeURIComponent(courseId)}/Exam`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(constraints),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = data?.detail || data?.message || "Failed to generate exam.";
      throw new Error(msg);
    }
    return data;
  }

  // TODO: implement in backend:
  // PATCH /{course_id}/exams/{exam_id} { exam_status: "final" }
 async function apiSaveExam(examId) {
  const url = `/exams/${encodeURIComponent(examId)}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Accept": "application/json" },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.detail || data?.message || `Failed to save exam (HTTP ${res.status}).`;
    throw new Error(msg);
  }

  return data;
}

  // -------------------------
  // Events
  // -------------------------
  btnOpen?.addEventListener("click", () => {
    setError(generateErrorEl, "");
    generateForm?.reset();
    generateForm?.classList.remove("was-validated");
    showModal(generateModalEl);
  });

  generateForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setError(generateErrorEl, "");

    // HTML validation
    if (!generateForm.checkValidity()) {
      generateForm.classList.add("was-validated");
      return;
    }

    if (isGenerating) return;

    let constraints;
    try {
      constraints = getConstraintsPayload();
    } catch (err) {
      setError(generateErrorEl, err?.message || "Invalid inputs.");
      return;
    }

    setLoadingGenerating(true);

    try {
      const exam = await apiGenerateExam(constraints);
      // Must match ExamResponseModel: { exam_id, exam_status, questions }
      currentExam = exam;
      lastConstraints = constraints;
      regenerateCount = 0;

      renderExam(currentExam);

      hideModal(generateModalEl);
      showModal(resultModalEl);

    } catch (err) {
      setError(generateErrorEl, err?.message || "Failed to generate exam.");
    } finally {
      setLoadingGenerating(false);
    }
  });

  btnRegenerate?.addEventListener("click", async () => {
    setError(resultErrEl, "");
    if (isGenerating) return;

    if (!lastConstraints) {
      setError(resultErrEl, "Missing constraints. Please generate again.");
      return;
    }



    setLoadingGenerating(true);

    try {
      const exam = await apiGenerateExam(lastConstraints);
      currentExam = exam;
      regenerateCount += 1;

      renderExam(currentExam);

    } catch (err) {
      setError(resultErrEl, err?.message || "Failed to regenerate exam.");
    } finally {
      setLoadingGenerating(false);
    }
  });

  btnSave?.addEventListener("click", async () => {
    setError(resultErrEl, "");
    if (isSaving) return;

    const examId = currentExam?.exam_id;
    if (!examId) {
      setError(resultErrEl, "Missing exam_id. Generate again.");
      return;
    }

    // If you don’t have the PATCH endpoint yet, comment this out
    isSaving = true;
    btnSave.disabled = true;

    try {
      await apiSaveExam(courseId, examId);
      // Optionally update UI
      examStatusEl.textContent = "final";
      setError(resultErrEl, "");
      alert("Exam saved ✅");
      hideModal(resultModalEl);

    } catch (err) {
      setError(resultErrEl, err?.message || "Failed to save exam.");
    } finally {
      isSaving = false;
      btnSave.disabled = false;
    }
  });
});
