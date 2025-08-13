function showRegister() {
	document.getElementById("loginForm").style.display = "none";
	document.getElementById("registerForm").style.display = "block";
}

function showLogin() {
	document.getElementById("registerForm").style.display = "none";
	document.getElementById("loginForm").style.display = "block";
}

function valid() {
	const password = document.getElementById("pass").value;
	const confirmPassword = document.getElementById("confirmPass").value;
	const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]{8,}$/;
	
	if (!passwordRegex.test(password)) {
		alert("Password must be at least 8 characters long and contain:\n- One uppercase letter\n- One lowercase letter\n- One number\n- One special character (@$!%*?&)");
		return false;
	}
	
	if (password !== confirmPassword) {
		alert("Passwords do not match! Please make sure both password fields are identical.");
		return false;
	}
	
	return true;
}