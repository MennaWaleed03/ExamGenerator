export async function apiFetch(url, options = {}) {
  const opts = { ...options };

  opts.credentials = "include"; // 🔥 important for cookies
  opts.headers = {
    ...(opts.headers || {}),
  };

  const res = await fetch(url, opts);

  if (res.status === 401) {
    window.location.href = "/users/login";
  }

  return res;
}