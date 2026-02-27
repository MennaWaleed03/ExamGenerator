// static/js/login.js  (COOKIE-BASED AUTH)

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const loginBtn = document.getElementById("loginBtn");
  const errorBox = document.getElementById("errorBox");
  const successBox = document.getElementById("successBox");

  const emailEl = document.getElementById("email");
  const passwordEl = document.getElementById("password");

  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.remove("d-none");
    if (successBox) successBox.classList.add("d-none");
  }

  function showSuccess(msg) {
    if (!successBox) return;
    successBox.textContent = msg;
    successBox.classList.remove("d-none");
    if (errorBox) errorBox.classList.add("d-none");
  }

  function setLoading(isLoading) {
    if (!loginBtn) return;
    loginBtn.disabled = isLoading;
    loginBtn.innerHTML = isLoading
      ? `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Logging in...`
      : `<span class="me-2">Login</span><i class="bi bi-box-arrow-in-right"></i>`;
  }

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    form.classList.add("was-validated");
    if (!form.checkValidity()) {
      showError("Please fix the highlighted fields.");
      return;
    }

    const payload = {
      email: (emailEl?.value || "").trim(),
      password: passwordEl?.value || "",
    };

    if (errorBox) errorBox.classList.add("d-none");
    if (successBox) successBox.classList.add("d-none");
    setLoading(true);

    try {
      const res = await fetch("/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include", // ✅ allows browser to accept/set cookies
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showError(data?.detail || `Login failed (HTTP ${res.status}).`);
        setLoading(false);
        return;
      }

      // ✅ With httpOnly cookies, tokens are NOT returned to JS.
      // Server sets Set-Cookie headers. We just redirect.
      showSuccess("Login successful! Redirecting...");
      setLoading(false);

      setTimeout(() => {
        window.location.href = "/courses/";
      }, 250);
    } catch {
      showError("Network error. Please try again.");
      setLoading(false);
    }
  });
});