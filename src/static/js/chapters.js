// static/js/chapters.js
console.log("chapters.js LOADED ✅ version = 2026-01-31 FIXED-3 (nested payload)");

document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // Tooltips (safe)
  // =========================
  function initTooltips(scope = document) {
    try {
      scope.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
        bootstrap.Tooltip.getOrCreateInstance(el);
      });
    } catch {}
  }
  initTooltips();

  // =========================
  // Refs
  // =========================
  const addQuestionsModalEl = document.getElementById("AddQuestionsModal");
  const addQuestionsForm = document.getElementById("addQuestionsForm");
  const discardQuestionsBtn = document.getElementById("discardQuestionsBtn");

  const deleteChapterModalEl = document.getElementById("deleteChapterModal");
  const deleteChapterIdEl = document.getElementById("deleteChapterId");
  const confirmDeleteChapterBtn = document.getElementById("confirmDeleteChapterBtn");

  const courseId = window.__courseId ?? null;

  let activeChapterId = null;
  let isSubmitting = false;

  // =========================
  // Collapse/expand blocks inside modal
  // =========================
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-q-toggle]");
    if (!btn) return;

    const target = btn.dataset.target;
    if (!target) return;

    const box = document.querySelector(target);
    if (!box) return;

    const icon = btn.querySelector("i.bi");
    const willOpen = box.classList.contains("d-none");

    box.classList.toggle("d-none");

    if (icon) {
      icon.classList.toggle("bi-caret-down-fill", !willOpen);
      icon.classList.toggle("bi-caret-up-fill", willOpen);
    }
  });

  // =========================
  // Discard (clear everything)
  // =========================
  discardQuestionsBtn?.addEventListener("click", () => {
    addQuestionsForm?.reset();
    addQuestionsForm?.classList.remove("was-validated");
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

      if (actionEl.classList.contains("disabled") || actionEl.getAttribute("aria-disabled") === "true") {
        return;
      }

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
  // Helpers: build nested payload from form
  // =========================

  // Map UI values to API enums if needed
  // If your backend expects "easy"/"difficult", set these to identity.
  // If it expects "simple"/"difficult", map easy -> simple as below.
  const difficultyMap = {
    easy: "simple",
    difficult: "difficult",
  };

  const objectiveSet = new Set(["remembering", "understanding", "creativity"]);

  // Parse names like: easy_remembering_q1_text, difficult_creativity_q2_B, ... etc.
  function parseFieldName(name) {
    // expected: {diff}_{lvl}_q{n}_{field}
    const m = /^([a-z]+)_([a-z]+)_q([12])_(text|A|B|C|correct)$/.exec(name);
    if (!m) return null;
    return {
      diff: m[1],
      lvl: m[2],
      q: parseInt(m[3], 10),
      field: m[4],
    };
  }

  // Build questions list in the exact order:
  // 1) easy remembering q1,q2
  // 2) easy understanding q1,q2
  // 3) easy creativity q1,q2
  // 4) difficult remembering q1,q2
  // 5) difficult understanding q1,q2
  // 6) difficult creativity q1,q2
  function buildPayloadFromForm(formEl) {
    const fd = new FormData(formEl);

    // Structure:
    // buckets[diff][lvl][q] = { text, A, B, C, correct }
    const buckets = {};

    for (const [name, valueRaw] of fd.entries()) {
      const info = parseFieldName(name);
      if (!info) continue;

      const value = String(valueRaw ?? "").trim();

      buckets[info.diff] ??= {};
      buckets[info.diff][info.lvl] ??= {};
      buckets[info.diff][info.lvl][info.q] ??= { text: "", A: "", B: "", C: "", correct: "" };

      buckets[info.diff][info.lvl][info.q][info.field] = value;
    }

    // Now flatten into API payload
    const order = [
      ["easy", "remembering"],
      ["easy", "understanding"],
      ["easy", "creativity"],
      ["difficult", "remembering"],
      ["difficult", "understanding"],
      ["difficult", "creativity"],
    ];

    const questions = [];

    for (const [diff, lvl] of order) {
      if (!objectiveSet.has(lvl)) throw new Error(`Invalid objective: ${lvl}`);

      for (const qn of [1, 2]) {
        const row = buckets?.[diff]?.[lvl]?.[qn];
        if (!row) {
          throw new Error(`Missing fields for ${diff}_${lvl}_q${qn}`);
        }

        const mappedDifficulty = difficultyMap[diff] ?? diff;

        const correct = row.correct; // "A" or "B" or "C"
        if (!["A", "B", "C"].includes(correct)) {
          throw new Error(`Select the correct choice for ${diff} / ${lvl} / Q${qn}`);
        }

        questions.push({
          content: row.text,
          difficulty: mappedDifficulty,
          objective: lvl,
          choices: [
            { content: row.A, is_correct: correct === "A" },
            { content: row.B, is_correct: correct === "B" },
            { content: row.C, is_correct: correct === "C" },
          ],
        });
      }
    }

    if (questions.length !== 12) {
      throw new Error("You must submit exactly 12 questions.");
    }

    return { questions };
  }

  // Strong validation:
  // - HTML required check
  // - plus: ensure each radio group has a selection (safety)
  function validateQuestionsForm(formEl) {
    if (!formEl.checkValidity()) {
      formEl.classList.add("was-validated");
      return false;
    }

    const radioGroups = [...new Set(
      [...formEl.querySelectorAll('input[type="radio"][name$="_correct"]')].map(r => r.name)
    )];

    for (const name of radioGroups) {
      const checked = formEl.querySelector(`input[type="radio"][name="${CSS.escape(name)}"]:checked`);
      if (!checked) {
        alert("Please select the correct choice for every question.");
        return false;
      }
    }

    return true;
  }

  // Update row UI after success
  function markChapterCompletedUI(chapterId) {
    const row = document.querySelector(`tr[data-chapter-row-id="${CSS.escape(String(chapterId))}"]`);
    if (!row) return;

    // Status badge cell (2nd column)
    const tds = row.querySelectorAll("td");
    const statusCell = tds[0];
    const dateCell = tds[1];

    if (statusCell) {
      statusCell.innerHTML = `<span class="badge bg-success">Completed</span>`;
    }

    if (dateCell) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      dateCell.textContent = `${yyyy}-${mm}-${dd}`;
    }

    // Disable generate button
    const genBtn = row.querySelector('[data-action="generate-questions"][data-generate-btn="1"]');
    if (genBtn) {
      genBtn.classList.add("disabled");
      genBtn.setAttribute("aria-disabled", "true");
      genBtn.setAttribute("tabindex", "-1");
      genBtn.setAttribute("data-bs-title", "Questions already generated");

      try {
        bootstrap.Tooltip.getInstance(genBtn)?.dispose();
      } catch {}
      initTooltips(row);
    }
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

    if (!validateQuestionsForm(addQuestionsForm)) return;

    let payload;
    try {
      payload = buildPayloadFromForm(addQuestionsForm);
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

    // Reset only after success (Discard is for clearing anytime)
    addQuestionsForm.reset();
    addQuestionsForm.classList.remove("was-validated");

    // Update UI
    markChapterCompletedUI(activeChapterId);

    activeChapterId = null;
    isSubmitting = false;
 

    alert("Questions submitted successfully ✅");
  });
});
