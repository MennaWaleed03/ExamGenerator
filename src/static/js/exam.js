// static/js/exam.js
console.log("exam.js LOADED ✅");

document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     Format exam dates
     ========================= */
  document.querySelectorAll(".exam-date[data-iso]").forEach((el) => {
    const iso = el.getAttribute("data-iso");
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      el.textContent = d.toLocaleString();
    }
  });

  /* =========================
     Delete exam handling
     ========================= */
  let examIdToDelete = null;

  // Open delete modal (event delegation)
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-bs-target="#deleteExamModal"]');
    if (!btn) return;

    examIdToDelete = btn.dataset.examId || null;
    const examName = btn.dataset.examName || "this exam";

    const nameEl = document.getElementById("deleteExamName");
    if (nameEl) nameEl.textContent = examName;
  });

  // Confirm delete
  const confirmBtn = document.getElementById("confirmDeleteExamBtn");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", async () => {
      if (!examIdToDelete) return;

      try {
        const res = await fetch(`/exams/${encodeURIComponent(examIdToDelete)}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          alert("Failed to delete exam");
          return;
        }

        // Simple & reliable
        window.location.reload();

      } catch (err) {
        console.error("Delete exam error:", err);
        alert("Unexpected error while deleting exam");
      }
    });
  }

});
