document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");
  const signupBtn = document.getElementById("signupBtn");
  const errorBox = document.getElementById("errorBox");
  const successBox = document.getElementById("successBox");

  const firstNameEl = document.getElementById("first_name");
  const lastNameEl = document.getElementById("last_name");
  const usernameEl = document.getElementById("username");
  const emailEl = document.getElementById("email");
  const passwordEl = document.getElementById("password");

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove("d-none");
    successBox.classList.add("d-none");
  }

  function showSuccess(msg) {
    successBox.textContent = msg;
    successBox.classList.remove("d-none");
    errorBox.classList.add("d-none");
  }

  function setLoading(isLoading) {
    signupBtn.disabled = isLoading;
    signupBtn.innerHTML = isLoading
      ? `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Creating account...`
      : `<span class="me-2">Sign Up</span><i class="bi bi-person-plus"></i>`;
  }

  function formatFastApiValidation(detail) {
    // detail is typically: [{loc: [...], msg: "...", type: "..."}]
    if (!Array.isArray(detail)) return null;

    const parts = detail.map((err) => {
      const loc = Array.isArray(err.loc) ? err.loc.join(".") : "field";
      const msg = err.msg || "Invalid value";
      // loc often looks like: body.email -> show as email
      const cleanLoc = loc.replace(/^body\./, "");
      return `${cleanLoc}: ${msg}`;
    });

    return parts.join(" | ");
  }

  // Optional: if user is already logged in, you may redirect:
  // if (sessionStorage.getItem("access_token")) window.location.href = "/courses";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Bootstrap validation visuals
    form.classList.add("was-validated");
    if (!form.checkValidity()) {
      showError("Please fix the highlighted fields.");
      return;
    }

    const payload = {
      first_name: firstNameEl.value.trim(),
      last_name: lastNameEl.value.trim(),
      username: usernameEl.value.trim(),
      email: emailEl.value.trim(),
      password: passwordEl.value,
    };

    errorBox.classList.add("d-none");
    successBox.classList.add("d-none");
    setLoading(true);

    try {
      const res = await fetch("/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        // if backend didn't return JSON
      }

      if (!res.ok) {
        const fastApiMsg = data?.detail ? formatFastApiValidation(data.detail) : null;
        const msg =
          fastApiMsg ||
          data?.detail ||
          `Signup failed (HTTP ${res.status}).`;
        showError(msg);
        setLoading(false);
        return;
      }

      showSuccess("Account created successfully! Redirecting to login...");
      setLoading(false);

      setTimeout(() => {
        window.location.href = "/login";
      }, 900);
    } catch (err) {
      showError("Network error. Please try again.");
      setLoading(false);
    }
  });
});