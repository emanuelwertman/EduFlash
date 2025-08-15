const showForm = (mode) => {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");

  registerForm.style.display = mode === "register" ? "block" : "none";
  loginForm.style.display = mode === "login" ? "block" : "none";
};

document.addEventListener("click", (e) => {
  const id = e.target && e.target.id;
  if (id === "register") showForm("register");
  else if (id === "login") showForm("login");
});

(function checkMode() {
  const hash = location.hash || "";
  const params = new URLSearchParams(hash.split("?")[1] || "");
  const mode = params.get("mode");
  if (mode) showForm(mode);
})();

function valid() {
  const password = document.getElementById("pass").value;
  const confirmPassword = document.getElementById("confirmPass").value;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]{8,}$/;

  if (!passwordRegex.test(password)) {
    alert(
      "Password must be at least 8 characters long and contain:\n- One uppercase letter\n- One lowercase letter\n- One number\n- One special character (@$!%*?&)"
    );
    return false;
  }

  if (password !== confirmPassword) {
    alert(
      "Passwords do not match! Please make sure both password fields are identical."
    );
    return false;
  }

  return true;
}
