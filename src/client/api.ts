import type { SignUp, SignUpsData, ConfigResponse, PlanVersion } from "../shared/types.js";

const PASSWORD_KEY = "tigerden-auth";

function getPassword(): string {
  return localStorage.getItem(PASSWORD_KEY) ?? "";
}

function headers(): Record<string, string> {
  return { "X-Password": getPassword(), "Content-Type": "application/json" };
}

// A 401 on any authenticated call means the stored password is stale. Clear it
// and reload so the login gate takes over instead of surfacing a raw error.
function handleUnauthorized(): void {
  localStorage.removeItem(PASSWORD_KEY);
  window.location.reload();
}

export async function getConfig(): Promise<ConfigResponse> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error(`Config error: ${res.status}`);
  return res.json();
}

export async function getSignUps(): Promise<SignUpsData> {
  const res = await fetch("/api/signups", { headers: headers() });
  if (!res.ok) throw new Error(`Sign-ups error: ${res.status}`);
  return res.json();
}

export async function createSignUp(
  adventureId: string,
  parentName: string
): Promise<SignUp> {
  const res = await fetch("/api/signups", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ adventureId, parentName }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? `Sign-up failed: ${res.status}`);
  }
  return res.json();
}

export async function deleteSignUp(id: string): Promise<void> {
  const res = await fetch(`/api/signups/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok && res.status !== 204) {
    const err = await res.json();
    throw new Error(err.error ?? `Delete failed: ${res.status}`);
  }
}

export async function getPlanVersions(adventureId: string): Promise<PlanVersion[]> {
  const res = await fetch(`/api/plans?adventureId=${encodeURIComponent(adventureId)}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Plans error: ${res.status}`);
  const data = (await res.json()) as { plans: PlanVersion[] };
  return data.plans;
}

export async function generatePlan(
  adventureId: string,
  requirements: Record<number, string>
): Promise<PlanVersion> {
  const res = await fetch("/api/plan", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ adventureId, requirements }),
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Your session expired. Please sign in again.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Plan generation failed: ${res.status}`);
  }
  return res.json();
}
