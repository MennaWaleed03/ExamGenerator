// static/js/exam_questions.js
console.log("exam_questions.js LOADED ✅ 2026-02-01");

document.addEventListener("DOMContentLoaded", () => {
  // Format ISO dates
  document.querySelectorAll(".js-date[data-iso]").forEach((el) => {
    const d = new Date(el.getAttribute("data-iso"));
    if (!Number.isNaN(d.getTime())) el.textContent = d.toLocaleString();
  });

  // Toggle correct answers
  const btnToggle = document.getElementById("btnToggleAnswers");
  btnToggle?.addEventListener("click", () => {
    document.querySelectorAll(".js-correct").forEach((b) => b.classList.toggle("d-none"));
  });

  // Expand / Collapse all (details tags)
  const allDetails = () => Array.from(document.querySelectorAll("details[data-q-details]"));

  document.getElementById("btnExpandAll")?.addEventListener("click", () => {
    allDetails().forEach((d) => (d.open = true));
  });

  document.getElementById("btnCollapseAll")?.addEventListener("click", () => {
    allDetails().forEach((d) => (d.open = false));
  });
});
