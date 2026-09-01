export interface Adventure {
  id: string;
  name: string;
  type: "required" | "optional";
  category: string;
  description: string;
  prerequisites: string[];
  materials: string[];
  requirements: Requirement[];
}

export interface Requirement {
  number: number;
  text: string;
  activities: ActivityOption[];
  location?: "Den" | "Home" | "Den/Home";
}

export interface ActivityOption {
  id: string;
  name: string;
  description?: string;
}

export interface SignUp {
  id: string;
  adventureId: string;
  parentName: string;
  timestamp: string;
}

export interface SignUpsData {
  signups: SignUp[];
}

export interface PlanRequest {
  adventureId: string;
  requirements: Record<number, string>;
  model?: string;
}

export interface ConfigResponse {
  hasPassword: boolean;
}

export interface PlanVersion {
  id: string;
  adventureId: string;
  requirements: Record<number, string>;
  content: string;
  timestamp: string;
}

export interface PlansData {
  plans: PlanVersion[];
}
