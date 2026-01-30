// create_course.js (UPDATED: View + Edit + Delete with modals + pagination)
console.log("create_course.js LOADED ✅ version = 2026-01-30 A");
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("coursesGrid");
  const pager = document.getElementById("coursesPager");
  const form = document.getElementById("createCourseForm");

  // Edit modal elements
  const editModalEl = document.getElementById("editCourseModal");
  const editForm = document.getElementById("editCourseForm");
  const editIdEl = document.getElementById("editCourseId");
  const editNameEl = document.getElementById("editCourseName");
  const editChaptersEl = document.getElementById("editCourseChapters");

  // Delete modal elements
  const deleteModalEl = document.getElementById("deleteCourseModal");
  const deleteIdEl = document.getElementById("deleteCourseId");
  const deleteNameEl = document.getElementById("deleteCourseName");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

  // Safety checks (so file doesn’t crash if a modal is missing)
  const hasEditModal = !!(editModalEl && editForm && editIdEl && editNameEl && editChaptersEl);
  const hasDeleteModal = !!(deleteModalEl && deleteIdEl && deleteNameEl && confirmDeleteBtn);

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

    // render grid
    const start = (page - 1) * pageSize;
    const items = courses.slice(start, start + pageSize);

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="col-12">
          <div class="p-4 text-center border rounded">No courses yet.</div>
        </div>`;
    } else {
        grid.innerHTML = items.map(c => `
        <div class="col-12 col-md-4">
            <div class="card h-100 shadow-sm course-card cursor-pointer"
                data-course-id="${c.id}">
            <div class="card-body d-flex flex-column">
                <h5 class="card-title">${escapeHtml(c.name)}</h5>
                <p class="card-text mb-3">
                Chapters: ${escapeHtml(c.number_of_chapters)}
                </p>

                <div class="mt-auto d-flex gap-2">
                <a href="#"
                    class="btn btn-outline-primary btn-sm flex-fill">
                    Generate Exam
                </a>

                <button class="btn btn-outline-secondary btn-sm flex-fill"
                        data-action="edit"
                        data-id="${c.id}">
                    Rename
                </button>

                <button class="btn btn-outline-danger btn-sm flex-fill"
                        data-action="delete"
                        data-id="${c.id}">
                    Delete
                </button>
                </div>
            </div>
            </div>
        </div>
        `).join("");
    }

    // render pager
    pager.innerHTML = "";

    const tp = totalPages();
    const prevDisabled = page === 1 ? "disabled" : "";
    const nextDisabled = page === tp ? "disabled" : "";

    pager.innerHTML += `
      <li class="page-item ${prevDisabled}">
        <a class="page-link" href="#" data-page="${page - 1}">Previous</a>
      </li>
    `;

    // page numbers (window of 5)
    const windowSize = 5;
    let startP = Math.max(1, page - Math.floor(windowSize / 2));
    let endP = Math.min(tp, startP + windowSize - 1);
    startP = Math.max(1, endP - windowSize + 1);

    for (let p = startP; p <= endP; p++) {
      pager.innerHTML += `
        <li class="page-item ${p === page ? "active" : ""}">
          <a class="page-link" href="#" data-page="${p}">${p}</a>
        </li>
      `;
    }

    pager.innerHTML += `
      <li class="page-item ${nextDisabled}">
        <a class="page-link" href="#" data-page="${page + 1}">Next</a>
      </li>
    `;
  }
    grid.addEventListener("click", (e) => {
    // Ignore clicks on buttons or links
    if (e.target.closest("button, a")) return;

    const card = e.target.closest(".course-card");
    if (!card) return;

    const courseId = card.dataset.courseId;
    if (!courseId) return;

    window.location.href = `/courses/${courseId}/chapters`;
    });
  // --- Pager click ---
  pager.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-page]");
    if (!a) return;
    e.preventDefault();
    const p = parseInt(a.dataset.page, 10);
    if (!Number.isFinite(p)) return;
    page = p;
    render();
  });

  // --- Card buttons (View/Edit/Delete) via event delegation ---
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    const course = courses.find((c) => String(c.id) === String(id));
    if (!course) return;

    if (action === "view") {
      window.location.href = `/chapters?course_id=${encodeURIComponent(id)}`;
      return;
    }

    if (action === "edit") {
      if (!hasEditModal) {
        alert("Edit modal is missing in HTML (editCourseModal).");
        return;
      }
      openEditModal(course);
      return;
    }

    if (action === "delete") {
      if (!hasDeleteModal) {
        alert("Delete modal is missing in HTML (deleteCourseModal).");
        return;
      }
      openDeleteModal(course);
      return;
    }
  });

  // --- Edit modal helpers ---
  function openEditModal(course) {
    editIdEl.value = course.id;
    editNameEl.value = course.name ?? "";
    editChaptersEl.value = course.number_of_chapters ?? 1;

    bootstrap.Modal.getOrCreateInstance(editModalEl).show();
  }

  // --- Delete modal helpers ---
  function openDeleteModal(course) {
    deleteIdEl.value = course.id;
    deleteNameEl.textContent = course.name ?? "";

    bootstrap.Modal.getOrCreateInstance(deleteModalEl).show();
  }

  // --- Create course ---
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

    courses.unshift(data);

    // close modal and reset
    const modalEl = document.getElementById("exampleModal");
    bootstrap.Modal.getInstance(modalEl)?.hide();
    form.reset();

    page = 1;
    render();
  });

  // --- Submit edit (PATCH /courses/{id}) ---
  if (hasEditModal) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const id = editIdEl.value;
      const name = editNameEl.value.trim();
      const number_of_chapters = parseInt(editChaptersEl.value, 10);

      const res = await fetch(`/courses/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, number_of_chapters }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.detail || "Failed to update course");
        return;
      }

      // Update local state with returned course object
      const idx = courses.findIndex((c) => String(c.id) === String(id));
      if (idx !== -1) courses[idx] = data;

      bootstrap.Modal.getInstance(editModalEl)?.hide();
      render();
    });
  }

  // --- Confirm delete (DELETE /courses/{id}) ---
  if (hasDeleteModal) {
    confirmDeleteBtn.addEventListener("click", async () => {
      const id = deleteIdEl.value;

      const res = await fetch(`/courses/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.detail || "Failed to delete course");
        return;
      }

      // Remove from local state
      courses = courses.filter((c) => String(c.id) !== String(id));

      // If current page becomes empty, move back
      clampPage();

      bootstrap.Modal.getInstance(deleteModalEl)?.hide();
      render();
    });
  }

  // initial render
  render();
});
