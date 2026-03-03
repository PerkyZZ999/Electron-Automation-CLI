const state = {
	counter: 0,
	doubleClicks: 0,
	dropped: false,
};

const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");
const roleSelect = document.getElementById("role-select");
const notesInput = document.getElementById("notes-input");
const rememberCheck = document.getElementById("remember-check");
const notifyCheck = document.getElementById("notify-check");
const submitBtn = document.getElementById("submit-btn");
const resetBtn = document.getElementById("reset-btn");
const formResult = document.getElementById("form-result");

const counterBtn = document.getElementById("counter-btn");
const dblclickBtn = document.getElementById("dblclick-btn");
const counterOutput = document.getElementById("counter-output");
const hoverTarget = document.getElementById("hover-target");
const hoverOutput = document.getElementById("hover-output");
const keyboardOutput = document.getElementById("keyboard-output");
const pingMainBtn = document.getElementById("ping-main-btn");
const pingOutput = document.getElementById("ping-output");

const dragSource = document.getElementById("drag-source");
const dropZone = document.getElementById("drop-zone");
const dropOutput = document.getElementById("drop-output");

const modal = document.getElementById("modal");
const openModalBtn = document.getElementById("open-modal-btn");
const closeModalBtn = document.getElementById("close-modal-btn");

function updateCounterOutput() {
	if (counterOutput) {
		counterOutput.textContent = `counter=${state.counter}, dblclicks=${state.doubleClicks}`;
	}
}

function updateDropOutput() {
	if (dropOutput) {
		dropOutput.textContent = `dropped=${state.dropped}`;
	}
}

function openModal() {
	if (!modal) {
		return;
	}

	modal.classList.add("is-open");
	modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
	if (!modal) {
		return;
	}

	modal.classList.remove("is-open");
	modal.setAttribute("aria-hidden", "true");
}

submitBtn?.addEventListener("click", () => {
	const payload = {
		email: emailInput?.value ?? "",
		passwordLength: passwordInput?.value?.length ?? 0,
		role: roleSelect?.value ?? "",
		notes: notesInput?.value ?? "",
		remember: rememberCheck?.checked ?? false,
		notify: notifyCheck?.checked ?? false,
	};

	if (formResult) {
		formResult.textContent = JSON.stringify(payload, null, 2);
	}
});

resetBtn?.addEventListener("click", () => {
	if (emailInput) {
		emailInput.value = "";
	}
	if (passwordInput) {
		passwordInput.value = "";
	}
	if (roleSelect) {
		roleSelect.value = "viewer";
	}
	if (notesInput) {
		notesInput.value = "";
	}
	if (rememberCheck) {
		rememberCheck.checked = false;
	}
	if (notifyCheck) {
		notifyCheck.checked = true;
	}
	if (formResult) {
		formResult.textContent = "Form reset.";
	}
});

counterBtn?.addEventListener("click", () => {
	state.counter += 1;
	updateCounterOutput();
});

dblclickBtn?.addEventListener("dblclick", () => {
	state.doubleClicks += 1;
	updateCounterOutput();
});

hoverTarget?.addEventListener("mouseenter", () => {
	hoverTarget.classList.add("is-hovered");
	if (hoverOutput) {
		hoverOutput.textContent = "hovered=true";
	}
});

hoverTarget?.addEventListener("mouseleave", () => {
	hoverTarget.classList.remove("is-hovered");
	if (hoverOutput) {
		hoverOutput.textContent = "hovered=false";
	}
});

window.addEventListener("keydown", (event) => {
	if (keyboardOutput) {
		keyboardOutput.textContent = `last-key=${event.key}`;
	}
});

openModalBtn?.addEventListener("click", openModal);
closeModalBtn?.addEventListener("click", closeModal);
modal?.addEventListener("click", (event) => {
	if (event.target === modal) {
		closeModal();
	}
});

dragSource?.addEventListener("dragstart", (event) => {
	event.dataTransfer?.setData("text/plain", "drag-source");
});

dropZone?.addEventListener("dragover", (event) => {
	event.preventDefault();
	dropZone.classList.add("is-dragover");
});

dropZone?.addEventListener("dragleave", () => {
	dropZone.classList.remove("is-dragover");
});

dropZone?.addEventListener("drop", (event) => {
	event.preventDefault();
	dropZone.classList.remove("is-dragover");
	state.dropped = true;
	updateDropOutput();
});

pingMainBtn?.addEventListener("click", async () => {
	if (!window.appApi?.ping) {
		if (pingOutput) {
			pingOutput.textContent = "Preload API not available.";
		}
		return;
	}

	const response = await window.appApi.ping();
	if (pingOutput) {
		pingOutput.textContent = JSON.stringify(response, null, 2);
	}
});

updateCounterOutput();
updateDropOutput();
