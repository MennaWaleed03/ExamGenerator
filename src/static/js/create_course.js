// static/js/create_course.js
console.log("create_course.js LOADED ✅ version = 2026-02-01 SHOW-EXAMS-FIX");

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("coursesGrid");
  const pager = document.getElementById("coursesPager");
  const form = document.getElementById("createCourseForm");

  if (!grid || !pager || !form) {
    console.warn("Missing required elements: coursesGrid/coursesPager/createCourseForm");
    return;
  }

  // Modals
  const editModalEl = document.getElementById("editCourseModal");
  const editForm = document.getElementById("editCourseForm");
  const editIdEl = document.getElementById("editCourseId");
  const editNameEl = document.getElementById("editCourseName");
  const editChaptersEl = document.getElementById("editCourseChapters");

  const deleteModalEl = document.getElementById("deleteCourseModal");
  const deleteIdEl = document.getElementById("deleteCourseId");
  const deleteNameEl = document.getElementById("deleteCourseName");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

  const hasEditModal = !!(editModalEl && editForm && editIdEl && editNameEl && editChaptersEl);
  const hasDeleteModal = !!(deleteModalEl && deleteIdEl && deleteNameEl && confirmDeleteBtn);

  // state
  let courses = Array.isArray(window.__courses) ? window.__courses : [];
  let page = 1;
  const pageSize = 6;

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function totalPages() {
    return Math.max(1, Math.ceil(courses.length / pageSize));
  }

  function clampPage() {
    const tp = totalPages();
    if (page > tp) page = tp;
    if (page < 1) page = 1;
  }

  function render() {
    clampPage();

    const start = (page - 1) * pageSize;
    const items = courses.slice(start, start + pageSize);

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="col-12">
          <div class="p-4 text-center border rounded">No courses yet.</div>
        </div>`;
    } else {
      // IMPORTANT: Show Exams is now a data-action link handled by JS (prevents /courses#)
      grid.innerHTML = items.map((c) => `
        <div class="col-12 col-md-4">
          <div class="card h-100 shadow-sm course-card cursor-pointer" data-course-id="${c.id}">
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">${escapeHtml(c.name)}</h5>
              <p class="card-text mb-3">Chapters: ${escapeHtml(c.number_of_chapters)}</p>

              <div class="mt-auto d-flex gap-2">
                <a href="/courses/${encodeURIComponent(c.id)}/exams"
                  class="btn btn-outline-primary btn-sm flex-fill show-exams-link">
                  Show Exams
                </a>

                <button class="btn btn-outline-secondary btn-sm flex-fill" data-action="edit" data-id="${c.id}">
                  Rename
                </button>

                <button class="btn btn-outline-danger btn-sm flex-fill" data-action="delete" data-id="${c.id}">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      `).join("");
    }

    // pager
    pager.innerHTML = "";
    const tp = totalPages();
    const prevDisabled = page === 1 ? "disabled" : "";
    const nextDisabled = page === tp ? "disabled" : "";

    pager.innerHTML += `
      <li class="page-item ${prevDisabled}">
        <a class="page-link" href="#" data-page="${page - 1}">Previous</a>
      </li>`;

    const windowSize = 5;
    let startP = Math.max(1, page - Math.floor(windowSize / 2));
    let endP = Math.min(tp, startP + windowSize - 1);
    startP = Math.max(1, endP - windowSize + 1);

    for (let p = startP; p <= endP; p++) {
      pager.innerHTML += `
        <li class="page-item ${p === page ? "active" : ""}">
          <a class="page-link" href="#" data-page="${p}">${p}</a>
        </li>`;
    }

    pager.innerHTML += `
      <li class="page-item ${nextDisabled}">
        <a class="page-link" href="#" data-page="${page + 1}">Next</a>
      </li>`;
  }

  // ✅ bypass caching
  async function refreshCoursesFromServer() {
    const url = `/courses/api?t=${Date.now()}`; // cache buster

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Accept": "application/json",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
    });

    if (!res.ok) {
      console.warn("Failed to refresh courses from server.", res.status);
      return;
    }

    const data = await res.json().catch(() => []);
    courses = Array.isArray(data) ? data : [];
    render();
  }

  // render instantly then refresh
  render();
  refreshCoursesFromServer();

  // ✅ bfcache fix: update when coming back
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) refreshCoursesFromServer();
  });

  // ✅ SHOW EXAMS FIX (must be BEFORE card navigation)
  grid.addEventListener("click", (e) => {
    const a = e.target.closest('a[data-action="show-exams"]');
    if (!a) return;

    e.preventDefault();     // prevents /courses#
    e.stopPropagation();    // prevents card click handler
    const courseId = a.dataset.id;
    if (!courseId) return;

    window.location.href = `/courses/${encodeURIComponent(courseId)}/exams`;
  });

  // navigation to chapters (clicking on card body)
  grid.addEventListener("click", (e) => {
    if (e.target.closest("button, a")) return;
    const card = e.target.closest(".course-card");
    if (!card) return;
    const courseId = card.dataset.courseId;
    if (!courseId) return;
    window.location.href = `/courses/${encodeURIComponent(courseId)}/chapters`;
  });

  // pager click
  pager.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-page]");
    if (!a) return;
    e.preventDefault();
    const p = parseInt(a.dataset.page, 10);
    if (!Number.isFinite(p)) return;
    page = p;
    render();
  });

  // open edit/delete modals
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const course = courses.find((c) => String(c.id) === String(id));
    if (!course) return;

    if (action === "edit") {
      if (!hasEditModal) return alert("Edit modal missing in HTML.");
      editIdEl.value = course.id;
      editNameEl.value = course.name ?? "";
      editChaptersEl.value = course.number_of_chapters ?? 1;
      bootstrap.Modal.getOrCreateInstance(editModalEl).show();
      return;
    }

    if (action === "delete") {
      if (!hasDeleteModal) return alert("Delete modal missing in HTML.");
      deleteIdEl.value = course.id;
      deleteNameEl.textContent = course.name ?? "";
      bootstrap.Modal.getOrCreateInstance(deleteModalEl).show();
      return;
    }
  });

  // create course
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("courseName").value.trim();
    const chapters = parseInt(document.getElementById("numChapters").value, 10);

    const res = await fetch("/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, number_of_chapters: chapters }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      alert(data?.detail || "Failed");
      return;
    }

    bootstrap.Modal.getInstance(document.getElementById("exampleModal"))?.hide();
    form.reset();

    await refreshCoursesFromServer();
  });

  // edit
  if (hasEditModal) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const id = editIdEl.value;
      const name = editNameEl.value.trim();

      const res = await fetch(`/courses/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.detail || "Failed to update course");
        return;
      }

      bootstrap.Modal.getInstance(editModalEl)?.hide();
      await refreshCoursesFromServer();
    });
  }

  // delete
  if (hasDeleteModal) {
    confirmDeleteBtn.addEventListener("click", async () => {
      const id = deleteIdEl.value;

      const res = await fetch(`/courses/${encodeURIComponent(id)}`, { method: "DELETE" });

      let data = null;
      if (res.status !== 204) data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 404) {
          bootstrap.Modal.getInstance(deleteModalEl)?.hide();
          await refreshCoursesFromServer();
          return;
        }
        alert(data?.detail || "Failed to delete course");
        return;
      }

      bootstrap.Modal.getInstance(deleteModalEl)?.hide();
      await refreshCoursesFromServer();
    });
  }
});
