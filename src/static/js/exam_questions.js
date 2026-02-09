// static/js/exam_questions.js
console.log("exam_questions.js LOADED ✅ 2026-02-01");

document.addEventListener("DOMContentLoaded", () => {
  // Format ISO dates

  document.querySelectorAll(".js-date[data-iso]").forEach((el)=>{

      const d= new Date(el.getAttribute("data-iso"));
      if(! Number.isNaN(d.getTime()) )
      el.textContent=d.toLocaleString();

  });


  const btnToggle=document.getElementById("btnToggleAnswers");

  btnToggle?.addEventListener("click",()=>{
    document.querySelectorAll('.js-correct').forEach((el)=>{
      el.classList.toggle("d-none")
    });
  });

  // Toggle correct answers
});