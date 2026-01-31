// static/js/questions.js
console.log("questions.js LOADED ✅ version=2026-01-31 FIXED-PATCH-SCHEMA");

document.addEventListener("DOMContentLoaded", () => {
  const modalEl = document.getElementById("editquestionModal");
  const formEl = document.getElementById("EditQuestionForm");
  const errorBox = document.getElementById("editErrorBox");
  const saveBtn = document.getElementById("btnSaveQuestion");

  const editQuestionId = document.getElementById("editQuestionId");
  const editQuestionContent = document.getElementById("editQuestionContent");

  const choiceAContent = document.getElementById("editChoiceAContent");
  const choiceBContent = document.getElementById("editChoiceBContent");
  const choiceCContent = document.getElementById("editChoiceCContent");

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

  function getQuestionData(questionId) {
    const scriptEl = document.getElementById(`qdata-${questionId}`);
    if (!scriptEl) return null;
    try {
      return JSON.parse(scriptEl.textContent || "{}");
    } catch {
      return null;
    }
  }

  function setRadioCorrect(letter) {
    const radio = formEl.querySelector(`input[name="edit_correct"][value="${letter}"]`);
    if (radio) radio.checked = true;
  }

  // Fill modal when it opens
  modalEl?.addEventListener("show.bs.modal", (event) => {
    clearError();

    const btn = event.relatedTarget;
    const qid = btn?.getAttribute("data-question-id");
    if (!qid) {
      showError("Question ID missing.");
      return;
    }

    const q = getQuestionData(qid);
    if (!q) {
      showError("Could not load question data.");
      return;
    }

    if (!Array.isArray(q.choices) || q.choices.length !== 3) {
      showError("This editor supports exactly 3 choices.");
      return;
    }

    // Fill question text
    editQuestionId.value = q.id;
    editQuestionContent.value = q.content || "";

    // Fill choices
    choiceAContent.value = q.choices[0]?.content || "";
    choiceBContent.value = q.choices[1]?.content || "";
    choiceCContent.value = q.choices[2]?.content || "";

    // Set correct radio
    const correctIndex = q.choices.findIndex(x => x.is_correct === true);
    const correctLetter = correctIndex === 0 ? "A" : correctIndex === 1 ? "B" : "C";
    setRadioCorrect(correctLetter);
  });

  // Submit PATCH request
  formEl?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const qid = editQuestionId.value;
    if (!qid) {
      showError("Question ID missing.");
      return;
    }

    // Validate correct selection
    const checked = formEl.querySelector('input[name="edit_correct"]:checked');
    if (!checked) {
      showError("Please select the correct answer.");
      return;
    }
    const correct = checked.value; // A/B/C

    // Build payload EXACTLY as your backend expects (no IDs)
    const payload = {
      content: editQuestionContent.value.trim(),
      choices: [
        { content: choiceAContent.value.trim(), is_correct: correct === "A" },
        { content: choiceBContent.value.trim(), is_correct: correct === "B" },
        { content: choiceCContent.value.trim(), is_correct: correct === "C" },
      ],
    };

    // Required checks
    if (!payload.content) {
      showError("Question content is required.");
      return;
    }
    if (payload.choices.some(ch => !ch.content)) {
      showError("All choices must have content.");
      return;
    }

    saveBtn.disabled = true;

    const res = await fetch(`/questions/${encodeURIComponent(qid)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
    });

    const updatedQuestion = await res.json().catch(() => null);

    saveBtn.disabled = false;

    if (!res.ok) {
      showError(updatedQuestion?.detail || updatedQuestion?.message || "Failed to update question.");
      return;
    }

    // updatedQuestion is the server-returned Question object with choices + ids
    // Update UI from SERVER RESPONSE (most correct)
    applyUpdatedQuestionToUI(updatedQuestion);

    // Update cached JSON so next time modal opens it shows updated data
    const scriptEl = document.getElementById(`qdata-${qid}`);
    if (scriptEl) {
      scriptEl.textContent = JSON.stringify(updatedQuestion);
    }

    // Close modal
    try {
      bootstrap.Modal.getInstance(modalEl)?.hide();
    } catch {}
  });

  function applyUpdatedQuestionToUI(q) {
    if (!q?.id) return;

    // Update question text
    const h = document.querySelector(`[data-q-content="${CSS.escape(String(q.id))}"]`);
    if (h) h.textContent = q.content ?? "";

    // Update choices list by rebuilding it completely (safe even if IDs changed)
    const choicesBox = document.querySelector(`[data-q-choices="${CSS.escape(String(q.id))}"]`);
    if (!choicesBox) return;

    const choices = Array.isArray(q.choices) ? q.choices : [];
    if (choices.length !== 3) {
      // still rebuild whatever exists
    }

    choicesBox.innerHTML = choices.map(ch => {
      const isCorrect = !!ch.is_correct;
      return `
        <div class="list-group-item ${isCorrect ? "border border-success bg-success bg-opacity-10" : ""}"
             data-choice-id="${escapeAttr(ch.id)}"
             data-is-correct="${isCorrect ? "1" : "0"}">
          <div class="d-flex align-items-center justify-content-between">
            <span class="fw-semibold">${escapeHtml(ch.content)}</span>
            ${isCorrect ? `<span class="badge bg-success"><i class="bi bi-check2-circle me-1"></i> Correct</span>` : ``}
          </div>
        </div>
      `;
    }).join("");
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(str) {
    return String(str ?? "").replaceAll('"', "&quot;");
  }
});
