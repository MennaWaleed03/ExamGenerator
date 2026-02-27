// static/js/exam.js
import { apiFetch } from "/static/js/api.js";
console.log("exam.js LOADED ✅ version = 2026-02-27 COOKIE-AUTH-FIX");

document.addEventListener("DOMContentLoaded", () => {
  function redirectToLogin() {
    window.location.href = "/users/login";
  }

  /* =========================
     Format exam dates
     ========================= */
  document.querySelectorAll(".exam-date[data-iso]").forEach((el) => {
    const iso = el.dataset.iso;
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
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
        const res = await apiFetch(`/exams/${encodeURIComponent(examIdToDelete)}`, {
          method: "DELETE",
        });

        // ✅ cookie expired / not logged in
        if (res.status === 401) {
          redirectToLogin();
          return;
        }

        // ✅ if failed, try to extract message (sometimes API returns JSON, sometimes not)
        if (!res.ok) {
          let msg = "Failed to delete the exam!";
          try {
            if (res.status !== 204) {
              const data = await res.json().catch(() => null);
              msg = data?.detail || data?.message || msg;
            }
          } catch {}

          await Swal.fire({
            icon: "error",
            title: "Oops...",
            text: msg,
          });
          return;
        }

        // ✅ Success → hide modal
        const deleteModalEl = document.getElementById("deleteExamModal");
        if (deleteModalEl) {
          bootstrap.Modal.getOrCreateInstance(deleteModalEl).hide();
        }

        await Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Exam deleted successfully",
          timer: 1200,
          showConfirmButton: false,
        });

        window.location.reload();
      } catch (err) {
        console.error("Delete exam error:", err);
        await Swal.fire({
          icon: "error",
          title: "Unexpected error",
          text: "Unexpected error while deleting exam.",
        });
      }
    });
  }
});