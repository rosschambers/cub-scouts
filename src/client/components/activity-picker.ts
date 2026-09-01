import type { Requirement, ActivityOption } from "../../shared/types.js";

export function renderActivityPicker(req: Requirement): string {
  let html = `<div class="activity-picker" data-req-num="${req.number}">`;

  for (const activity of req.activities) {
    html += `
      <label class="activity-option">
        <input type="radio" name="req-${req.number}" value="${activity.id}">
        <span class="activity-name">${activity.name}</span>
      </label>
    `;
  }

  html += `</div>`;
  return html;
}
