// static/js/questions.js
import { apiFetch } from "/static/js/api.js";
console.log("questions.js LOADED ✅ version=2026-02-27 COOKIE-AUTH-FIX");

document.addEventListener("DOMContentLoaded", () => {
  // If your router has a prefix (e.g. "/api/questions"), change this:
  const QUESTIONS_API_BASE = "/questions";

  function redirectToLogin() {
    window.location.href = "/users/login";
  }

  async function readErrorMessage(res, fallback) {
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

  async function safeReadJson(res) {
    try {
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) return null;
      return await res.json().catch(() => null);
    } catch {
      return null;
    }
  }

  // -----------------------------
  // Read initial questions data
  // -----------------------------
  const raw = document.getElementById("questions-data")?.textContent || "[]";
  let QUESTIONS = [];
  try {
    QUESTIONS = JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse #questions-data JSON", e);
    QUESTIONS = [];
  }

  const QMAP = new Map(QUESTIONS.map((q) => [String(q.id), q]));

  // -----------------------------
  // Edit modal refs
  // -----------------------------
  const editModalEl = document.getElementById("editquestionModal");
  const formEl = document.getElementById("EditQuestionForm");
  const errorBox = document.getElementById("editErrorBox");
  const saveBtn = document.getElementById("btnSaveQuestion");

  const editQuestionId = document.getElementById("editQuestionId");
  const editQuestionContent = document.getElementById("editQuestionContent");
  const choiceAContent = document.getElementById("editChoiceAContent");
  const choiceBContent = document.getElementById("editChoiceBContent");
  const choiceCContent = document.getElementById("editChoiceCContent");

  // -----------------------------
  // Delete modal refs
  // -----------------------------
  const deleteModalEl = document.getElementById("deleteQuestionModal");
  const deletePreviewEl = document.getElementById("deleteQuestionPreview");
  const confirmDeleteBtn = document.getElementById("confirmDeleteQuestionBtn");

  let pendingDeleteQuestionId = null;
  let isDeleting = false;

  // -----------------------------
  // Helpers
  // -----------------------------
  function removeQuestionNav(qid) {
    const nav = document.querySelector(
      `[data-question-nav="${CSS.escape(String(qid))}"]`
    );
    if (nav) nav.remove();
  }

  function renumberQuestionsUI() {
    // Renumber RIGHT side badges "Q1, Q2..."
    const cards = document.querySelectorAll("[data-question-card]");
    let i = 1;
    cards.forEach((card) => {
      const badge = card.querySelector(".badge.bg-dark");
      if (badge) badge.textContent = `Q${i}`;
      i++;
    });

    // Renumber LEFT side links "Q1 — ..."
    const navLinks = document.querySelectorAll(
      "#list-example a[data-question-nav]"
    );
    let j = 1;
    navLinks.forEach((a) => {
      const t = a.textContent || "";
      const newText = t.replace(/^Q\d+\s+—\s+/, `Q${j} — `);
      a.textContent = newText;
      j++;
    });
  }

  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg || "Unexpected error";
    errorBox.classList.remove("d-none");
  }

  function clearError() {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.classList.add("d-none");
  }

  function setCorrectRadio(letter) {
    if (!formEl) return;
    const r = formEl.querySelector(
      `input[name="edit_correct"][value="${letter}"]`
    );
    if (r) r.checked = true;
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function applyToUI(q) {
    const qid = String(q.id);

    // Update question content
    const h = document.querySelector(`[data-q-content="${CSS.escape(qid)}"]`);
    if (h) h.textContent = q.content ?? "";

    // Update choices UI
    const box = document.querySelector(`[data-q-choices="${CSS.escape(qid)}"]`);
    if (!box) return;

    const choices = Array.isArray(q.choices) ? q.choices : [];

    box.innerHTML = choices
      .map((ch) => {
        const isCorrect = !!ch.is_correct;
        return `
          <div class="list-group-item ${
            isCorrect ? "border border-success bg-success bg-opacity-10" : ""
          }">
            <div class="d-flex align-items-center justify-content-between">
              <span class="${isCorrect ? "fw-semibold" : ""}">${escapeHtml(
          ch.content
        )}</span>
              ${
                isCorrect
                  ? `<span class="badge bg-success"><i class="bi bi-check2-circle me-1"></i> Correct</span>`
                  : ""
              }
            </div>
          </div>
        `;
      })
      .join("");
  }

  function removeQuestionFromUI(qid) {
    const card = document.querySelector(
      `[data-question-card="${CSS.escape(String(qid))}"]`
    );
    if (card) card.remove();
  }

  // -----------------------------
  // CLICK HANDLER: Edit / Delete
  // -----------------------------
  document.body.addEventListener("click", (e) => {
    // ===== EDIT =====
    const editBtn = e.target.closest(".js-edit-question");
    if (editBtn) {
      clearError();

      const qid = editBtn.dataset.questionId;
      const q = QMAP.get(String(qid));

      if (!qid || !q) {
        showError("Question data not found.");
        return;
      }

      if (!Array.isArray(q.choices) || q.choices.length !== 3) {
        showError("This editor supports exactly 3 choices.");
        return;
      }

      if (editQuestionId) editQuestionId.value = q.id;
      if (editQuestionContent) editQuestionContent.value = q.content || "";
      if (choiceAContent) choiceAContent.value = q.choices[0]?.content || "";
      if (choiceBContent) choiceBContent.value = q.choices[1]?.content || "";
      if (choiceCContent) choiceCContent.value = q.choices[2]?.content || "";

      const idx = q.choices.findIndex((x) => x.is_correct === true);
      setCorrectRadio(idx === 0 ? "A" : idx === 1 ? "B" : "C");
      return;
    }

    // ===== DELETE (open modal) =====
    const delBtn = e.target.closest(".js-delete-question");
    if (delBtn) {
      const qid = delBtn.dataset.questionId;
      if (!qid) return;

      pendingDeleteQuestionId = String(qid);

      const q = QMAP.get(String(qid));
      const preview = (q?.content || "").trim();
      if (deletePreviewEl) {
        deletePreviewEl.textContent = preview || "This question has no content.";
      }

      try {
        bootstrap.Modal.getOrCreateInstance(deleteModalEl).show();
      } catch (err) {
        console.error(err);
        if (confirm("Delete this question?")) {
          pendingDeleteQuestionId = String(qid);
          confirmDeleteBtn?.click();
        }
      }
      return;
    }
  });

  // -----------------------------
  // CONFIRM DELETE
  // -----------------------------
  confirmDeleteBtn?.addEventListener("click", async () => {
    if (isDeleting) return;

    const qid = pendingDeleteQuestionId;
    if (!qid) return;

    isDeleting = true;
    confirmDeleteBtn.disabled = true;

    try {
      const url = `${QUESTIONS_API_BASE}/${encodeURIComponent(qid)}`;
      const res = await apiFetch(url, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });

      // ✅ cookie expired / not logged in
      if (res.status === 401) {
        redirectToLogin();
        return;
      }

      if (!res.ok) {
        const msg = await readErrorMessage(res, "Failed to delete question.");
        alert(msg);
        return;
      }

      // Some APIs return 204 No Content for DELETE
      const data = await safeReadJson(res);

      // If you return {"ok": true}, we'll respect it.
      // If you return 204, data will be null and that's still success.
      if (data && data.ok === false) {
        alert("Delete failed (unexpected response).");
        return;
      }

      // Remove from cache and UI
      QMAP.delete(String(qid));
      removeQuestionFromUI(qid);
      removeQuestionNav(qid);
      renumberQuestionsUI();

      // Refresh ScrollSpy
      try {
        const spyEl = document.querySelector(
          '[data-bs-spy="scroll"][data-bs-target="#list-example"]'
        );
        if (spyEl) {
          const spy =
            bootstrap.ScrollSpy.getInstance(spyEl) || new bootstrap.ScrollSpy(spyEl);
          spy.refresh();
        }
      } catch {}

      // If edit modal open for same question, close it
      try {
        const openId = editQuestionId?.value ? String(editQuestionId.value) : null;
        if (openId && openId === String(qid) && editModalEl) {
          bootstrap.Modal.getOrCreateInstance(editModalEl).hide();
        }
      } catch {}

      // Close delete modal
      try {
        if (deleteModalEl) bootstrap.Modal.getOrCreateInstance(deleteModalEl).hide();
      } catch {}

      pendingDeleteQuestionId = null;
    } catch (err) {
      console.error(err);
      alert("Network error while deleting.");
    } finally {
      confirmDeleteBtn.disabled = false;
      isDeleting = false;
    }
  });

  // Optional: when delete modal closes, clear pending id
  deleteModalEl?.addEventListener("hidden.bs.modal", () => {
    pendingDeleteQuestionId = null;
    if (deletePreviewEl) deletePreviewEl.textContent = "";
    if (confirmDeleteBtn) confirmDeleteBtn.disabled = false;
    isDeleting = false;
  });

  // -----------------------------
  // Submit PATCH (Edit)
  // -----------------------------
  formEl?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const qid = editQuestionId?.value;
    if (!qid) return showError("Question ID missing.");

    const checked = formEl.querySelector('input[name="edit_correct"]:checked');
    if (!checked) return showError("Please select the correct answer.");

    const correct = checked.value; // A/B/C

    const payload = {
      content: (editQuestionContent?.value ?? "").trim(),
      choices: [
        { content: (choiceAContent?.value ?? "").trim(), is_correct: correct === "A" },
        { content: (choiceBContent?.value ?? "").trim(), is_correct: correct === "B" },
        { content: (choiceCContent?.value ?? "").trim(), is_correct: correct === "C" },
      ],
    };

    if (!payload.content) return showError("Question content is required.");
    if (payload.choices.some((ch) => !ch.content)) return showError("All choices must have content.");

    if (saveBtn) saveBtn.disabled = true;

    try {
      const url = `${QUESTIONS_API_BASE}/${encodeURIComponent(qid)}`;
      const res = await apiFetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      // ✅ cookie expired / not logged in
      if (res.status === 401) {
        redirectToLogin();
        return;
      }

      if (!res.ok) {
        const msg = await readErrorMessage(res, "Failed to update question.");
        return showError(msg);
      }

      const updated = await safeReadJson(res);
      if (!updated || !updated.id) {
        return showError("Update succeeded but response is missing question data.");
      }

      // Update local cache + UI
      QMAP.set(String(updated.id), updated);
      applyToUI(updated);

      // Close edit modal
      try {
        if (editModalEl) bootstrap.Modal.getOrCreateInstance(editModalEl).hide();
      } catch {}
    } catch (err) {
      console.error(err);
      return showError("Network error while saving.");
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  });
});