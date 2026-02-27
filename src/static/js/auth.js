// ===== Token storage =====


export function setUser(user) {
  sessionStorage.setItem("user_email", user?.email ?? "");
  sessionStorage.setItem("user_uid", user?.uid ?? "");
}

export function getUser() {
  return {
    email: sessionStorage.getItem("user_email") || null,
    uid: sessionStorage.getItem("user_uid") || null,
  };
}