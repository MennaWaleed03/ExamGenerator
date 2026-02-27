// static/js/generate_exam.js
import { apiFetch } from "/static/js/api.js";
console.log("generate_exam.js LOADED ✅ version = 2026-02-27 COOKIE-AUTH-FIX");

document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // Globals from template
  // -------------------------
  const courseId = window.__courseId ?? null;
  const totalChapters = Number(window.__totalChapters ?? 0);

  // -------------------------
  // Refs (DOM)
  // -------------------------
  const btnOpen = document.getElementById("btnOpenGenerateExamModal");

  const generateModalEl = document.getElementById("generateExamModal");
  const generateForm = document.getElementById("generateExamForm");
  const generateErrorEl = document.getElementById("generateExamError");
  const btnGenerate = document.getElementById("btnGenerateExamSubmit");
  const spinnerGenerate = document.getElementById("generateExamSpinner");

  const resultModalEl = document.getElementById("generatedExamModal");
  const resultBodyEl = document.getElementById("generatedExamBody");
  const resultErrEl = document.getElementById("generatedExamError");
  const examStatusEl = document.getElementById("generatedExamStatus");

  const btnRegenerate = document.getElementById("btnRegenerateExam");
  const btnSave = document.getElementById("btnSaveExam");

  // Totals UI refs
  const requiredTotalText = document.getElementById("requiredTotalText");
  const difficultyTotalText = document.getElementById("difficultyTotalText");
  const objectiveTotalText = document.getElementById("objectiveTotalText");
  const totalsMismatchText = document.getElementById("totalsMismatchText");

  function redirectToLogin() {
    window.location.href = "/users/login";
  }

  if (!courseId) {
    console.warn("window.__courseId is missing. Exam generation disabled.");
    btnOpen?.setAttribute("disabled", "disabled");
    return;
  }

  if (!generateForm) {
    console.error("generateExamForm not found in DOM.");
    return;
  }

  // -------------------------
  // Form input refs
  // -------------------------
  const qpEl = generateForm.querySelector('input[name="questions_per_chapter"]');

  const diffEl = generateForm.querySelector('input[name="difficult_questions"]');
  const simpleEl = generateForm.querySelector('input[name="simple_questions"]');

  const remEl = generateForm.querySelector('input[name="remembering_questions"]');
  const undEl = generateForm.querySelector('input[name="understanding_questions"]');
  const creEl = generateForm.querySelector('input[name="creative_questions"]');

  // -------------------------
  // Bootstrap helpers
  // -------------------------
  function showModal(modalEl) {
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }
  function hideModal(modalEl) {
    try {
      bootstrap.Modal.getInstance(modalEl)?.hide();
    } catch {}
  }

  // -------------------------
  // State
  // -------------------------
  let lastConstraints = null;
  let currentExam = null;
  let isGenerating = false;
  let isSaving = false;

  // -------------------------
  // Helpers
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

  function n(v) {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }

  async function readErrorMessage(res, fallback) {
    // Try JSON, then text, else fallback
    try {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const data = await res.json().catch(() => null);
        return data?.detail || data?.message || fallback;
      }
      const txt = await res.text().catch(() => "");
      return txt?.trim() || fallback;
    } catch {
      return fallback;
    }
  }

  // -------------------------
  // Dynamic Totals UI
  // -------------------------
  function updateTotalsUI() {
    const qpc = n(qpEl?.value);
    const required = qpc * totalChapters;

    const diffTotal = n(diffEl?.value) + n(simpleEl?.value);
    const objTotal = n(remEl?.value) + n(undEl?.value) + n(creEl?.value);

    if (requiredTotalText) requiredTotalText.textContent = String(required);
    if (difficultyTotalText) difficultyTotalText.textContent = String(diffTotal);
    if (objectiveTotalText) objectiveTotalText.textContent = String(objTotal);

    let msg = "";
    if (required > 0) {
      if (diffTotal !== required) msg += `Difficulty total must equal ${required}. `;
      if (objTotal !== required) msg += `Objective total must equal ${required}.`;
    }

    if (totalsMismatchText) {
      if (msg.trim()) {
        totalsMismatchText.textContent = msg.trim();
        totalsMismatchText.classList.remove("d-none");
      } else {
        totalsMismatchText.textContent = "";
        totalsMismatchText.classList.add("d-none");
      }
    }
  }

  ["input", "change"].forEach((evt) => {
    qpEl?.addEventListener(evt, updateTotalsUI);
    diffEl?.addEventListener(evt, updateTotalsUI);
    simpleEl?.addEventListener(evt, updateTotalsUI);
    remEl?.addEventListener(evt, updateTotalsUI);
    undEl?.addEventListener(evt, updateTotalsUI);
    creEl?.addEventListener(evt, updateTotalsUI);
  });

  updateTotalsUI();

  // -------------------------
  // Summary renderer
  // -------------------------
  function renderSummary(exam, constraints) {
    const summaryEl = document.getElementById("generatedExamSummary");
    if (!summaryEl) return;

    const diff = exam?.diff_counts || {};
    const obj = exam?.obj_counts || {};

    const reqSimple = Number(constraints?.simple_questions ?? 0);
    const reqDiff = Number(constraints?.difficult_questions ?? 0);

    const reqRem = Number(constraints?.remembering_questions ?? 0);
    const reqUnd = Number(constraints?.understanding_questions ?? 0);
    const reqCre = Number(constraints?.creative_questions ?? 0);

    const genSimple = Number(diff.simple ?? 0);
    const genDiff = Number(diff.difficult ?? 0);

    const genRem = Number(obj.remembering ?? 0);
    const genUnd = Number(obj.understanding ?? 0);
    const genCre = Number(obj.creativity ?? 0);

    const badge = (gen, req) => {
      const ok = gen === req;
      return `<span class="badge ${ok ? "bg-success" : "bg-warning text-dark"}">${gen}/${req}</span>`;
    };

    summaryEl.innerHTML = `
      <div class="border rounded p-2">
        <div class="fw-semibold mb-2">Summary (generated / required)</div>

        <div class="d-flex flex-wrap gap-2 align-items-center">
          <span class="text-muted">Difficulty:</span>
          <span>Simple ${badge(genSimple, reqSimple)}</span>
          <span>Difficult ${badge(genDiff, reqDiff)}</span>
        </div>

        <div class="d-flex flex-wrap gap-2 align-items-center mt-2">
          <span class="text-muted">Objective:</span>
          <span>Remembering ${badge(genRem, reqRem)}</span>
          <span>Understanding ${badge(genUnd, reqUnd)}</span>
          <span>Creativity ${badge(genCre, reqCre)}</span>
        </div>
      </div>
    `;
  }

  function renderExam(exam) {
    if (!exam) return;

    renderSummary(exam, lastConstraints);

    const questions = Array.isArray(exam.questions) ? exam.questions : [];
    if (questions.length === 0) {
      if (resultBodyEl) resultBodyEl.innerHTML = `<div class="text-muted">No questions returned.</div>`;
      return;
    }

    const html = questions
      .map((q, idx) => {
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

          <ol class="mt-2 mb-0">
            ${choices
              .map(
                (c) => `
              <li>
                ${escapeHtml(c.content)}
                ${c.is_correct ? `<span class="badge bg-success ms-2">correct</span>` : ``}
              </li>
            `
              )
              .join("")}
          </ol>
        </div>
      `;
      })
      .join("");

    if (resultBodyEl) resultBodyEl.innerHTML = html;
  }

  // -------------------------
  // Payload builder
  // -------------------------
  function getConstraintsPayload() {
    const fd = new FormData(generateForm);

    const payload = {
      questions_per_chapter: Number(fd.get("questions_per_chapter")),
      difficult_questions: Number(fd.get("difficult_questions")),
      simple_questions: Number(fd.get("simple_questions")),
      remembering_questions: Number(fd.get("remembering_questions")),
      understanding_questions: Number(fd.get("understanding_questions")),
      creative_questions: Number(fd.get("creative_questions")),
    };

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
  // API calls (cookie-auth safe)
  // -------------------------
  async function apiGenerateExam(constraints) {
    const url = `/courses/${encodeURIComponent(courseId)}/exam`;

    const res = await apiFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(constraints),
    });

    if (res.status === 401) {
      redirectToLogin();
      throw new Error("Not authenticated.");
    }

    if (!res.ok) {
      const msg = await readErrorMessage(res, `Failed to generate exam (HTTP ${res.status}).`);
      throw new Error(msg);
    }

    return await res.json().catch(() => null);
  }

  async function apiRegenerateExam(examId) {
    const url = `/courses/${encodeURIComponent(courseId)}/exams/${encodeURIComponent(examId)}/regenerate`;

    const res = await apiFetch(url, {
      method: "POST",
      headers: { Accept: "application/json" },
    });

    if (res.status === 401) {
      redirectToLogin();
      throw new Error("Not authenticated.");
    }

    if (!res.ok) {
      const msg = await readErrorMessage(res, `Failed to regenerate exam (HTTP ${res.status}).`);
      throw new Error(msg);
    }

    return await res.json().catch(() => null);
  }

  async function apiSaveExam(examId) {
    const url = `/exams/${encodeURIComponent(examId)}`;

    const res = await apiFetch(url, {
      method: "PATCH",
      headers: { Accept: "application/json" },
    });

    if (res.status === 401) {
      redirectToLogin();
      throw new Error("Not authenticated.");
    }

    if (!res.ok) {
      const msg = await readErrorMessage(res, `Failed to save exam (HTTP ${res.status}).`);
      throw new Error(msg);
    }

    return await res.json().catch(() => null);
  }

  // -------------------------
  // Events
  // -------------------------
  btnOpen?.addEventListener("click", () => {
    setError(generateErrorEl, "");
    generateForm.reset();
    generateForm.classList.remove("was-validated");
    updateTotalsUI();
    showModal(generateModalEl);
  });

  generateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setError(generateErrorEl, "");

    updateTotalsUI();

    if (!generateForm.checkValidity()) {
      generateForm.classList.add("was-validated");
      return;
    }
    if (isGenerating) return;

    const required = n(qpEl?.value) * totalChapters;
    const diffTotal = n(diffEl?.value) + n(simpleEl?.value);
    const objTotal = n(remEl?.value) + n(undEl?.value) + n(creEl?.value);

    if (required > 0 && (diffTotal !== required || objTotal !== required)) {
      setError(generateErrorEl, "Totals mismatch: Difficulty/Objectives must equal the required total.");
      return;
    }

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

      currentExam = exam;
      lastConstraints = constraints;

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

    const examId = currentExam?.exam_id ?? currentExam?.id ?? null;
    if (!examId) {
      setError(resultErrEl, "Missing exam_id. Generate an exam first.");
      return;
    }

    setLoadingGenerating(true);

    try {
      const newExam = await apiRegenerateExam(examId);
      currentExam = newExam;
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

    const examId = currentExam?.exam_id ?? currentExam?.id ?? null;
    if (!examId) {
      setError(resultErrEl, "Missing exam_id. Generate again.");
      return;
    }

    isSaving = true;
    if (btnSave) btnSave.disabled = true;

    try {
      await apiSaveExam(examId);
      if (examStatusEl) examStatusEl.textContent = "final";
      alert("Exam saved ✅");
      hideModal(resultModalEl);
    } catch (err) {
      setError(resultErrEl, err?.message || "Failed to save exam.");
    } finally {
      isSaving = false;
      if (btnSave) btnSave.disabled = false;
    }
  });
});