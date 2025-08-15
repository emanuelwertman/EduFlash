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

document.addEventListener("DOMContentLoaded", function () {
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", function (event) {
      handleFormSubmit(event, "register");
    });
  }

  // Handle login form submission
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      handleFormSubmit(event, "login");
    });
  }
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

async function createAccount(username, email, password) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);

    const res = await fetch("/createaccount", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ username, email, password }),
      signal: controller.signal
    });
    clearTimeout(id);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Prefer: server sets HttpOnly cookie. If not:
    const sessionKey = data.session || data.key || data.token;
    if (sessionKey && data.status !== "error") {
      document.cookie = `session=${sessionKey}; Max-Age=3600; Path=/; SameSite=Lax; Secure`;
      window.location.href = "#/paths";
    } else {
      alert(data.message || "This account is already taken. Please try again.");
    }
  } catch (err) {
    alert("Could not create account. Please try again.");
    console.error(err);
  }
}

async function startSession(username, password) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);

    const res = await fetch("/startsession", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ username, password }),
      signal: controller.signal
    });
    clearTimeout(id);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.status === "badpass" || data.error === "badpass") {
      alert("Wrong password (-_-)");
      return;
    }

    const sessionKey = data.session || data.key || data.token;
    if (sessionKey) {
      document.cookie = `session=${sessionKey}; Max-Age=3600; Path=/; SameSite=Lax; Secure`;
      window.location.href = "#/paths";
    } else {
      alert("Login failed. Please try again.");
    }
  } catch (err) {
    alert("Could not log in. Check your connection and try again.");
    console.error(err);
  }
}

function handleFormSubmit(event, formType) {
  event.preventDefault();

  if (formType === "register") {
    const form = document.getElementById("registerForm");
    const username = form.querySelector('input[placeholder="Username"]').value;
    const email = form.querySelector('input[placeholder="Email"]').value;
    const password = form.querySelector("#pass").value;

    if (valid()) {
      createAccount(username, email, password);
    }
  } else if (formType === "login") {
    const form = document.getElementById("loginForm");
    const username = form.querySelector('input[placeholder="Username"]').value;
    const password = form.querySelector('input[placeholder="Password"]').value;

    if (!username || !password) {
      alert("Please fill in all fields.");
      return;
    }

    startSession(username, password);
  }
}
