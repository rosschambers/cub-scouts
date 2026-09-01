import type { Adventure, SignUp } from "../../shared/types.js";
import adventuresData from "../../../content/adventures.json";
import { getSignUps } from "../api.js";

const adventures: Adventure[] = (adventuresData as { adventures: Adventure[] }).adventures;

export async function renderDashboard(): Promise<void> {
  const dashboardPage = document.getElementById("dashboard-page");
  if (!dashboardPage) return;

  // Sign-ups are the only live data the dashboard needs; adventures are static.
  let signups: SignUp[] = [];
  try {
    const data = await getSignUps();
    signups = data.signups;
  } catch {
    // Sign-ups unavailable — still render the adventure cards.
  }

  const required = adventures.filter((a) => a.type === "required");
  const optional = adventures.filter((a) => a.type === "optional");

  let html = "";

  if (required.length > 0) {
    html += `<h2>Required Adventures</h2>`;
    html += renderAdventureGrid(required, signups);
  }

  if (optional.length > 0) {
    html += `<h2>Optional Adventures</h2>`;
    html += renderAdventureGrid(optional, signups);
  }

  if (adventures.length === 0) {
    html = `<p>No adventures available.</p>`;
  }

  dashboardPage.innerHTML = html;
  dashboardPage.style.display = "block";
  const detailPage = document.getElementById("detail-page");
  if (detailPage) detailPage.style.display = "none";
}

function signupsFor(adventureId: string, signups: SignUp[]): SignUp[] {
  return signups.filter((s) => s.adventureId === adventureId);
}

function statusClass(count: number): string {
  if (count === 0) return "available";
  return "partial";
}

function statusLabel(count: number): string {
  if (count === 0) return "Available";
  return `${count} signed up`;
}

function renderAdventureGrid(items: Adventure[], signups: SignUp[]): string {
  const cards = items
    .map((adv) => {
      const adventureSignups = signupsFor(adv.id, signups);
      const count = adventureSignups.length;
      const names = adventureSignups.map((s) => s.parentName).join(", ");
      return `
    <a class="adventure-card" href="#/adventure/${adv.id}">
      <div class="card-top">
        <span class="card-category">${adv.category}</span>
        <span class="status-dot ${statusClass(count)}">${statusLabel(count)}</span>
      </div>
      <h3 class="card-title">${adv.name}</h3>
      <p class="card-desc">${adv.description}</p>
      <div class="card-meta">
        <span class="card-signup">${names ? `Signed up: ${names}` : "No volunteers yet"}</span>
        <span class="card-btn">Sign Up</span>
      </div>
    </a>
  `;
    })
    .join("");

  return `<div class="adventure-grid">${cards}</div>`;
}
