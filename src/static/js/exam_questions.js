// static/js/exam_questions.js
console.log("exam_questions.js LOADED ✅ 2026-02-27 COOKIE-AUTH-NOAPI");

document.addEventListener("DOMContentLoaded", () => {
  // Format ISO dates safely
  document.querySelectorAll(".js-date[data-iso]").forEach((el) => {
    const iso = el.dataset.iso; // same as getAttribute("data-iso")
    if (!iso) return;

    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      el.textContent = d.toLocaleString();
    }
  });

  // Toggle correct answers
  const btnToggle = document.getElementById("btnToggleAnswers");
  btnToggle?.addEventListener("click", () => {
    document.querySelectorAll(".js-correct").forEach((el) => {
      el.classList.toggle("d-none");
    });
  });
});