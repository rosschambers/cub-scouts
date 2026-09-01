import type { SignUp, SignUpsData, ConfigResponse, PlanVersion } from "../shared/types.js";

const PASSWORD_KEY = "tigerden-auth";

function getPassword(): string {
  return localStorage.getItem(PASSWORD_KEY) ?? "";
}

function headers(): Record<string, string> {
  return { "X-Password": getPassword(), "Content-Type": "application/json" };
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
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? `Plan generation failed: ${res.status}`);
  }
  return res.json();
}
