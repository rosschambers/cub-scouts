import { showApp } from "../app.js";
import { getConfig } from "../api.js";

export async function renderLogin(): Promise<void> {
  const gate = document.getElementById("password-gate");
  const input = document.getElementById("gate-password") as HTMLInputElement;
  const btn = document.getElementById("gate-submit") as HTMLButtonElement;
  const error = document.getElementById("gate-error") as HTMLElement;

  if (!gate || !input || !btn || !error) return;

  // If no password is configured, skip the gate entirely.
  try {
    const config = await getConfig();
    if (!config.hasPassword) {
      showApp();
      window.location.hash = "#/";
      return;
    }
  } catch {
    // Fall through: show the gate if config can't be reached.
  }

  gate.classList.remove("hidden");
  input.focus();

  async function unlock(): Promise<void> {
    const password = input.value;
    if (!password) return;

    btn.setAttribute("disabled", "disabled");
    error.textContent = "";

    const res = await fetch("/api/config", {
      headers: { "X-Password": password },
    });

    if (res.ok) {
      localStorage.setItem("tigerden-auth", password);
      showApp();
      window.location.hash = "#/";
    } else {
      error.textContent = "Incorrect password. Try again.";
      input.value = "";
      input.focus();
    }

    btn.removeAttribute("disabled");
  }

  btn.addEventListener("click", unlock);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") unlock();
  });
}
