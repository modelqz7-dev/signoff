export type PanelId =
  | "profile" | "billing" | "notifications" | "security" | "appearance"
  | "help" | "contact" | "docs" | "status"

/** Dispatch `new CustomEvent(OPEN_PANEL_EVENT, { detail: "profile" })` to open a panel from anywhere. */
export const OPEN_PANEL_EVENT = "signoff:open-panel"

export function openPanel(panel: PanelId) {
  window.dispatchEvent(new CustomEvent(OPEN_PANEL_EVENT, { detail: panel }))
}
