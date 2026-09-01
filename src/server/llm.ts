import { config } from "./config.js";
import type { PlanRequest, Adventure } from "../shared/types.js";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function generatePlan(
  request: PlanRequest,
  adventure: Adventure
): Promise<string> {
  const systemPrompt = `You are a helpful assistant for Cub Scout den parents.
Your job is to create a clear, practical meeting plan for a den Adventure.

Adventure: ${adventure.name}
Category: ${adventure.category}

Requirements and selected activities:
${adventure.requirements
  .map(
    (req) => {
      const selected = request.requirements[req.number];
      return `  Req ${req.number} (${req.text}):\n    Selected: ${selected || req.activities[0]?.name || "TBD"}`;
    }
  )
  .join("\n")}

Materials needed: ${adventure.materials.join(", ")}

Create a meeting plan with:
1. Meeting title
2. Timing breakdown (opening, each activity with approximate time, closing)
3. Materials checklist
4. Safety notes specific to this Adventure
5. Custom notes

Format the plan as plain text with clear section headings. Keep it concise and actionable for a parent running a 45-60 minute den meeting. Be specific about activity instructions, not just names.`;

  const userPrompt = `Generate a den meeting plan for the ${adventure.name} Adventure.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${config.frameApiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.frameApiKey}`,
      },
      body: JSON.stringify({
        model: config.frameModel,
        messages,
        max_tokens: 2048,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Frame API error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in Frame API response");
    }

    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}
