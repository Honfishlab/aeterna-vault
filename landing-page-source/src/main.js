const steps = Array.from(document.querySelectorAll(".timeline-step"));
let current = 0;

setInterval(() => {
  if (steps.length === 0) return;
  steps[current].classList.remove("active");
  current = (current + 1) % steps.length;
  steps[current].classList.add("active");
}, 3200);

const panel = document.querySelector("#accessPanel");
const panelMode = document.querySelector("#panelMode");
const panelTitle = document.querySelector("#panelTitle");
const panelSubmit = document.querySelector("#panelSubmit");
const passwordInput = panel.querySelector("input[type='password']");

function openPanel(mode) {
  const signup = mode === "signup";
  panelMode.textContent = signup ? "Begin your vault" : "Welcome back";
  panelTitle.textContent = signup ? "Create your Aeterna Vault" : "Log in to Aeterna Vault";
  panelSubmit.textContent = signup ? "Create Vault" : "Log In";
  passwordInput.autocomplete = signup ? "new-password" : "current-password";
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
  panel.querySelector("input").focus();
}

document.querySelectorAll("[data-panel]").forEach((button) => {
  button.addEventListener("click", () => openPanel(button.dataset.panel));
});

document.querySelector(".close-panel").addEventListener("click", () => {
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");
});

panel.addEventListener("click", (event) => {
  if (event.target === panel) {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && panel.classList.contains("open")) {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
  }
});
