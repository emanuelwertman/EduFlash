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

function createAccount(username, email, password) {
  console.log("Creating account for:", username);
  const xhr = new XMLHttpRequest();

  xhr.open("POST", "/createaccount", false);
  xhr.setRequestHeader("Content-Type", "application/json");

  const payload = {
    username: username,
    email: email,
    password: password,
  };

  console.log("Sending payload:", payload);
  xhr.send(JSON.stringify(payload));
  
  console.log("Response status:", xhr.status);
  console.log("Response text:", xhr.responseText);

  if (xhr.responseText === "ok") {
    alert("Account created successfully!");
    const sessionToken = Date.now().toString();
    document.cookie = "session=" + sessionToken + "; max-age=3600;";
    window.location.href = "#/paths";
  } else {
    try {
      const response = JSON.parse(xhr.responseText);
      console.error("Error creating account:", response);
      alert("This account is already taken. Please try again.");
    } catch (e) {
      console.error("Error creating account:", xhr.responseText);
      alert("Error creating account. Please try again.");
    }
  }
}

function startSession(username, password) {
  console.log("Starting session for:", username);
  const xhr = new XMLHttpRequest();

  xhr.open("POST", "/startsession", false);
  xhr.setRequestHeader("Content-Type", "application/json");

  const payload = {
    username: username,
    password: password,
  };

  console.log("Sending login payload:", payload);
  xhr.send(JSON.stringify(payload));
  
  console.log("Login response status:", xhr.status);
  console.log("Login response text:", xhr.responseText);

  if (xhr.responseText === "badpass") {
    alert("Wrong password (-_-)");
  } else {
    try {
      const response = JSON.parse(xhr.responseText);
      const sessionKey = response.session || response.key || response.token;
      document.cookie = "session=" + sessionKey + "; max-age=3600;";
      window.location.href = "#/paths";
    } catch (e) {
      console.log("Using response as session token:", xhr.responseText);
      document.cookie = "session=" + xhr.responseText + "; max-age=3600;";
      window.location.href = "#/paths";
    }
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
