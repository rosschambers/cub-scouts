import { renderLogin } from "./pages/login.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderAdventure } from "./pages/adventure.js";

let currentHash = window.location.hash || "#/";

export function initApp(): void {
  // Check auth
  const auth = localStorage.getItem("tigerden-auth");
  if (auth) {
    showApp();
    navigate();
  } else {
    renderLogin();
  }

  window.addEventListener("hashchange", navigate);
}

export function showApp(): void {
  const gate = document.getElementById("password-gate");
  const app = document.getElementById("app");

  if (gate) gate.classList.add("hidden");
  if (app) app.classList.add("visible");
}

function navigate(): void {
  currentHash = window.location.hash || "#/";
  const match = currentHash.match(/^#\/adventure\/([\w-]+)$/);

  if (match) {
    renderAdventure(match[1]);
  } else {
    renderDashboard();
  }
}
