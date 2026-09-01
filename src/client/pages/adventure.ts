import type { Adventure, Requirement, ActivityOption, PlanVersion } from "../../shared/types.js";
import adventuresData from "../../../content/adventures.json";
import { getSignUps, getPlanVersions, generatePlan } from "../api.js";

const adventures: Adventure[] = (adventuresData as { adventures: Adventure[] }).adventures;

let currentAdventure: Adventure | null = null;
let wizardStep: 1 | 2 | 3 = 1;
let chosen: Record<number, string> = {};
let planVersions: PlanVersion[] = [];
let activeVersionId: string | null = null;

export async function renderAdventure(adventureId: string): Promise<void> {
  const detailPage = document.getElementById("detail-page");
  const dashboardPage = document.getElementById("dashboard-page");
  if (!detailPage) return;

  if (!currentAdventure || currentAdventure.id !== adventureId) {
    currentAdventure = adventures.find((a) => a.id === adventureId) ?? null;
  }

  if (!currentAdventure) {
    detailPage.innerHTML = "<p>Adventure not found.</p>";
    detailPage.style.display = "block";
    return;
  }

  let html = "";

  // Back button + header
  html += `<button class="detail-back" onclick="window.location.hash='#/'">← Back to Dashboard</button>`;
  html += `<h1>${currentAdventure.name}</h1>`;
  html += `<p class="detail-category">${currentAdventure.category}</p>`;
  html += `<p>${currentAdventure.description}</p>`;

  // Wizard: stepper + current step body
  html += stepsHeaderHTML();
  html += `<div id="wizard-body"></div>`;

  detailPage.innerHTML = html;
  detailPage.style.display = "block";
  if (dashboardPage) dashboardPage.style.display = "none";

  renderWizardBody(adventureId);
}

function stepsHeaderHTML(): string {
  const labels = ["Activities", "Review & Sign Up", "Plan"];
  return `<div class="steps-header">${labels.map((label, i) => {
    const n = (i + 1) as 1 | 2 | 3;
    const cls = n === wizardStep ? "step active" : n < wizardStep ? "step done" : "step";
    const click = n < wizardStep ? ` onclick="window.__tigerWizardStep(${n})"` : "";
    return `<button class="${cls}"${click}><span class="step-num">${n < wizardStep ? "✓" : n}</span>${label}</button>`;
  }).join('<span class="step-line"></span>')}</div>`;
}

function renderWizardBody(adventureId: string): void {
  const body = document.getElementById("wizard-body");
  const stepsHeader = document.querySelector(".steps-header");
  if (!body) return;
  if (stepsHeader) stepsHeader.outerHTML = stepsHeaderHTML();
  body.innerHTML = wizardStep === 1 ? step1HTML() : wizardStep === 2 ? step2HTML() : step3HTML();
  if (wizardStep === 1) {
    restoreStep1Selections();
  }
  attachStepListeners(adventureId);
  if (wizardStep === 2) {
    refreshSignupList(adventureId);
  }
  if (wizardStep === 3) {
    getPlanVersions(adventureId).then((versions) => {
      planVersions = versions;
      if (versions.length > 0) {
        activeVersionId = versions[0].id;
        refreshVersionSelect();
        const content = document.getElementById("plan-content");
        if (content) content.innerHTML = formatPlan(versions[0].content);
      }
    }).catch(() => { /* keep going without history */ });
  }
}

function step1HTML(): string {
  let html = "";
  if (currentAdventure && currentAdventure.prerequisites.length > 0) {
    html += `<h3>Prerequisites</h3><ul class="prereqs-list">`;
    html += currentAdventure.prerequisites.map((p) => `<li>${p}</li>`).join("");
    html += `</ul>`;
  }
  if (currentAdventure && currentAdventure.materials.length > 0) {
    html += `<h3>Materials Needed</h3><ul class="materials-list">`;
    html += currentAdventure.materials.map((m) => `<li>${m}</li>`).join("");
    html += `</ul>`;
  }
  html += `<h3>Requirements</h3>`;
  if (currentAdventure) {
    for (const req of currentAdventure.requirements) html += renderRequirement(req);
  }
  html += `<div class="wizard-nav"><button class="btn btn-primary" id="wizard-next-1">Next →</button></div>`;
  return html;
}

function step2HTML(): string {
  let html = `<h3>Review Your Choices</h3>`;
  html += `<div class="review-list">`;
  if (currentAdventure) {
    for (const req of currentAdventure.requirements) {
      const choice = chosen[req.number];
      const choiceHtml = choice
        ? `<span class="review-choice">${choice}</span>`
        : `<span class="review-missing">Not chosen</span>`;
      html += `<div class="review-row"><span class="review-req">Req ${req.number}: ${req.text}</span>${choiceHtml}</div>`;
    }
  }
  html += `</div>`;

  // Signups + form
  html += `<h3>Who's Running This Meeting</h3>`;
  html += `<ul class="signup-list" id="signup-list"></ul>`;
  html += `<h3>Sign Up to Run This Meeting</h3>`;
  html += `
    <form class="signup-form" id="signup-form">
      <input type="text" id="parent-name" placeholder="Your name" required>
      <button type="submit" class="btn btn-primary">Sign Up</button>
    </form>
    <div id="signup-status"></div>
  `;
  html += `<div class="wizard-nav"><button class="btn btn-secondary" id="wizard-back-2">← Back</button><button class="btn btn-primary" id="wizard-next-2">Next →</button></div>`;
  return html;
}

function step3HTML(): string {
  let html = `<h3>Meeting Plans</h3>`;
  html += `<label class="version-label" for="version-select">Plan version</label>`;
  html += `<select id="version-select" class="version-select">`;
  html += `<option value="">No saved plans yet</option>`;
  html += `</select>`;
  html += `<div id="plan-output">`;
  html += `<button class="btn btn-primary" id="generate-plan-btn">Generate Plan</button>`;
  html += `<div id="plan-spinner" style="display:none;" class="spinner-row"><span class="spinner"></span> Generating plan (this takes about a minute)...</div>`;
  html += `<div id="plan-content"></div>`;
  html += `</div>`;
  html += `<div class="wizard-nav"><button class="btn btn-secondary" id="wizard-back-3">← Back</button></div>`;
  return html;
}

function renderRequirement(req: Requirement): string {
  let html = `<div class="requirement-block" data-req-num="${req.number}">`;
  html += `<h4>Req ${req.number}: ${req.text}</h4>`;

  // Activity picker
  if (req.activities.length > 0) {
    html += `<div class="activity-picker">`;
    for (const activity of req.activities) {
      html += `
        <label class="activity-option">
          <input type="radio" name="req-${req.number}" value="${activity.id}">
          <span class="activity-name">${activity.name}</span>
          ${activity.description ? `<span class="activity-desc">${activity.description}</span>` : ""}
        </label>
      `;
    }
    html += `</div>`;
  }

  // Custom activity input
  html += `
    <div class="custom-activity">
      <label for="custom-${req.number}">Custom activity (optional)</label>
      <input type="text" id="custom-${req.number}" placeholder="Describe your own activity" class="custom-activity-input">
    </div>
  `;

  html += `</div>`;
  return html;
}

function activityName(activityId: string, activities: ActivityOption[]): string {
  const match = activities.find((a) => a.id === activityId);
  return match ? match.name : activityId;
}

function restoreStep1Selections(): void {
  for (const [reqNum, choice] of Object.entries(chosen)) {
    if (choice.startsWith("Custom: ")) {
      const customInput = document.getElementById(`custom-${reqNum}`) as HTMLInputElement | null;
      if (customInput) customInput.value = choice.slice("Custom: ".length);
      continue;
    }
    // Match the radio whose label text equals the chosen activity name
    const radio = [...document.querySelectorAll<HTMLInputElement>(`input[name="req-${reqNum}"]`)].find((r) => {
      const label = r.closest("label");
      const name = label?.querySelector(".activity-name")?.textContent?.trim();
      return name === choice;
    });
    if (radio) radio.checked = true;
  }
}

function formatPlan(planText: string): string {
  const formatted = planText
    .split("\n")
    .map((line: string) => {
      if (line.startsWith("###")) return `<h3>${line.replace("### ", "")}</h3>`;
      if (line.startsWith("##")) return `<h2>${line.replace("## ", "")}</h2>`;
      if (line.startsWith("#")) return `<h2>${line.replace("# ", "")}</h2>`;
      if (line.startsWith("- ")) return `<li>${line.replace("- ", "")}</li>`;
      if (line.trim() === "") return "<br>";
      return `<p>${line}</p>`;
    })
    .join("");
  return `<div class="plan-card">${formatted}<div class="plan-actions"><button class="btn btn-secondary" onclick="window.print()">🖨️ Print as PDF</button></div></div>`;
}

function refreshVersionSelect(): void {
  const select = document.getElementById("version-select") as HTMLSelectElement | null;
  if (!select) return;
  select.innerHTML = planVersions.map((v, i) => {
    const label = `v${planVersions.length - i} — ${new Date(v.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
    const selected = v.id === activeVersionId ? " selected" : "";
    return `<option value="${v.id}"${selected}>${label}</option>`;
  }).join("");
}

async function refreshSignupList(adventureId: string): Promise<void> {
  try {
    const data = await getSignUps();
    const signups = data.signups.filter((s) => s.adventureId === adventureId);
    const list = document.getElementById("signup-list");
    if (list) {
      list.innerHTML = signups.map((s) => `<li>${s.parentName}</li>`).join("");
    }
  } catch {
    // keep going without signup data
  }
}

function attachStepListeners(adventureId: string): void {
  if (wizardStep === 1) {
    const nextBtn = document.getElementById("wizard-next-1");
    if (nextBtn && currentAdventure) {
      const adventure = currentAdventure;
      nextBtn.addEventListener("click", () => {
        chosen = {};
        for (const req of adventure.requirements) {
          const selected = document.querySelector(
            `input[name="req-${req.number}"]:checked`
          ) as HTMLInputElement;
          const customInput = document.getElementById(
            `custom-${req.number}`
          ) as HTMLInputElement;
          const customText = customInput?.value?.trim();
          if (customText) {
            chosen[req.number] = `Custom: ${customText}`;
          } else if (selected) {
            chosen[req.number] = activityName(selected.value, req.activities);
          }
        }
        wizardStep = 2;
        renderWizardBody(adventureId);
      });
    }
  }

  if (wizardStep === 2) {
    const backBtn = document.getElementById("wizard-back-2");
    backBtn?.addEventListener("click", () => { wizardStep = 1; renderWizardBody(adventureId); });

    const nextBtn = document.getElementById("wizard-next-2");
    nextBtn?.addEventListener("click", () => { wizardStep = 3; renderWizardBody(adventureId); });

    const form = document.getElementById("signup-form") as HTMLFormElement | null;
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById("parent-name") as HTMLInputElement | null;
        const status = document.getElementById("signup-status");
        if (!nameInput || !status) return;
        try {
          const res = await fetch("/api/signups", {
            method: "POST",
            headers: {
              "X-Password": localStorage.getItem("tigerden-auth") ?? "",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ adventureId, parentName: nameInput.value }),
          });
          if (res.ok) {
            status.textContent = "You're signed up!";
            nameInput.value = "";
            refreshSignupList(adventureId);
          } else {
            const err = await res.json();
            status.textContent = `Error: ${err.error}`;
          }
        } catch (err) {
          status.textContent = `Failed to sign up: ${(err as Error).message}`;
        }
      });
    }
  }

  if (wizardStep === 3) {
    const backBtn = document.getElementById("wizard-back-3");
    backBtn?.addEventListener("click", () => { wizardStep = 2; renderWizardBody(adventureId); });

    const versionSelect = document.getElementById("version-select") as HTMLSelectElement | null;
    versionSelect?.addEventListener("change", () => {
      activeVersionId = versionSelect.value;
      const version = planVersions.find((v) => v.id === activeVersionId);
      const content = document.getElementById("plan-content");
      if (version && content) content.innerHTML = formatPlan(version.content);
    });

    const planBtn = document.getElementById("generate-plan-btn");
    if (planBtn && currentAdventure) {
      planBtn.addEventListener("click", async () => {
        const spinner = document.getElementById("plan-spinner");
        const content = document.getElementById("plan-content");
        if (!spinner || !content) return;
        spinner.style.display = "flex";
        content.innerHTML = "";
        planBtn.setAttribute("disabled", "disabled");
        try {
          const version = await generatePlan(adventureId, chosen);
          planVersions = [version, ...planVersions];
          activeVersionId = version.id;
          refreshVersionSelect();
          content.innerHTML = formatPlan(version.content);
        } catch (err) {
          content.innerHTML = `<p style="color:var(--red-600);">Failed to generate plan: ${(err as Error).message}</p>`;
        } finally {
          spinner.style.display = "none";
          planBtn.removeAttribute("disabled");
        }
      });
    }
  }
}

(window as unknown as Record<string, unknown>).__tigerWizardStep = (n: number) => {
  if (n < wizardStep) {
    wizardStep = n as 1 | 2 | 3;
    if (currentAdventure) renderWizardBody(currentAdventure.id);
  }
};
