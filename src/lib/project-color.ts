// Every project gets one of Apple's system colours, the same one wherever it shows: its dot in the
// rail, its marks on the home page. Picked from the id, so it never changes. All carry white text.

export const PROJECT_COLORS = ["#ff9f0a", "#bf5af2", "#ff375f", "#30d158", "#0a84ff", "#5e5ce6"]

export function projectColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return PROJECT_COLORS[Math.abs(h) % PROJECT_COLORS.length]
}
