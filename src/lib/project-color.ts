// Every project gets one of a few bright colours, the same one wherever it shows: its dot in the
// rail, its cards on the home page. Picked from the id, so it never changes.

export const PROJECT_COLORS = ["#f4661b", "#c19af5", "#ec4f9a", "#fdc019", "#2fc76b", "#6b9bff"]

export function projectColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return PROJECT_COLORS[Math.abs(h) % PROJECT_COLORS.length]
}
