const nameInput = document.querySelector("#name");
const roleSelect = document.querySelector("#role");
const agreeInput = document.querySelector("#agree");
const submitButton = document.querySelector("#submit-btn");
const statusText = document.querySelector("#status");

submitButton?.addEventListener("click", () => {
	const name = nameInput?.value?.trim() || "Anonymous";
	const role = roleSelect?.value || "tester";
	const agreed = agreeInput?.checked ? "yes" : "no";
	const status = `Submitted: ${name} (${role}) agree=${agreed}`;
	if (statusText) {
		statusText.textContent = status;
	}
	localStorage.setItem("lastSubmission", status);
	console.info(status);
});
