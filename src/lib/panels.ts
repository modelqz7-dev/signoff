export type PanelId =
  | "profile" | "billing" | "notifications" | "security" | "appearance"
  | "help" | "contact" | "docs" | "status"

/** Dispatch `new CustomEvent(OPEN_PANEL_EVENT, { detail: "profile" })` to open a panel from anywhere. */
export const OPEN_PANEL_EVENT = "signoff:open-panel"

export function openPanel(panel: PanelId) {
  window.dispatchEvent(new CustomEvent(OPEN_PANEL_EVENT, { detail: panel }))
}

/** Opens the navigation drawer on phones and tablets (the sidebar is always visible on desktop). */
export const OPEN_NAV_EVENT = "signoff:open-nav"

export function openNav() {
  window.dispatchEvent(new Event(OPEN_NAV_EVENT))
}

/** Fired when a project is created or renamed, so the sidebar's list catches up. */
export const PROJECTS_CHANGED = "signoff:projects-changed"
/** A project renamed from the sidebar; detail: { id, title }. Its open page takes the new name. */
export const PROJECT_RENAMED = "signoff:project-renamed"

/** Opens the dashboard's calendar when the dashboard is already on screen. */
export const OPEN_CALENDAR_EVENT = "signoff:open-calendar"
