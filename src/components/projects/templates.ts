// Ready-made canvases for SMM work. Each is laid out with the canvas's own pieces (blocks, text,
// sticky notes and paths), so after it lands the user edits it like anything they drew themselves.
// Text is the English key; the Russian lives in i18n-ru like every other string.

export type TemplateNode =
  | { type: "block"; x: number; y: number; title: string; text: string }
  | { type: "text"; x: number; y: number; text: string }
  | { type: "note"; x: number; y: number; text: string }

export type CanvasTemplate = {
  id: string
  title: string
  description: string
  /** Card tint, any CSS colour. */
  tone: string
  /** What the gallery card shows, Notion style: three column names and a tag per row. */
  preview: { columns: [string, string, string]; tags: [string, string, string]; people?: boolean }
  nodes: TemplateNode[]
  /** Paths between nodes by index, with an optional label. */
  edges: [from: number, to: number, label?: string][]
}

const block = (x: number, y: number, title: string, text: string): TemplateNode => ({ type: "block", x, y, title, text })
const note = (x: number, y: number, text: string): TemplateNode => ({ type: "note", x, y, text })
const heading = (x: number, y: number, text: string): TemplateNode => ({ type: "text", x, y, text })

export const TEMPLATES: CanvasTemplate[] = [
  {
    id: "content-month",
    title: "Content plan for a month",
    description: "A brief, four weeks and the dates to keep in mind.",
    tone: "#3f9a5b",
    preview: { columns: ["Week", "Theme", "Format"], tags: ["Post", "Stories", "Reel"] },
    nodes: [
      heading(0, -120, "Content plan for the month"),
      block(0, 160, "Brief", "Goals, audience and tone of voice. What the client wants this month."),
      block(380, 0, "Week 1", "3 posts · 5 stories. Theme:"),
      block(380, 140, "Week 2", "3 posts · 5 stories. Theme:"),
      block(380, 280, "Week 3", "3 posts · 5 stories. Theme:"),
      block(380, 420, "Week 4", "3 posts · 5 stories. Theme:"),
      note(760, 180, "Holidays and dates to remember this month"),
    ],
    edges: [[1, 2], [1, 3], [1, 4], [1, 5]],
  },
  {
    id: "launch",
    title: "Product launch",
    description: "Teaser, announcement, launch day and the follow-up.",
    tone: "#3b78d8",
    preview: { columns: ["Stage", "What we post", "When"], tags: ["Teaser", "Announcement", "Launch day"] },
    nodes: [
      block(0, 0, "Teaser", "2–3 days before: a hint, no details."),
      block(340, 0, "Announcement", "What, when, and why it matters."),
      block(680, 0, "Launch day", "Post, stories and a reel. Link in bio."),
      block(1020, 0, "After the launch", "Reviews, questions, results."),
      note(360, 170, "Get the client's yes on every step before it goes live"),
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
  {
    id: "pillars",
    title: "Content pillars",
    description: "What the account posts about, around one centre.",
    tone: "#d9822b",
    preview: { columns: ["Pillar", "Examples", "Share of posts"], tags: ["Useful", "Selling", "Fun"] },
    nodes: [
      block(330, 230, "Content pillars", "What we post about, and how often."),
      block(0, 0, "Useful", "Tips, how-tos, checklists."),
      block(660, 0, "Selling", "Offers, prices, calls to action."),
      block(0, 460, "Behind the scenes", "The team, the process, everyday life."),
      block(660, 460, "Reviews", "Client stories and feedback."),
      block(330, 560, "Fun", "Trends, polls, light posts."),
    ],
    edges: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]],
  },
  {
    id: "approval-week",
    title: "Weekly approval cycle",
    description: "From ideas to published, with the client's yes in the middle.",
    tone: "#8b5cd6",
    preview: { columns: ["Step", "Owner", "Status"], tags: ["Ideas", "In review", "Approved"], people: true },
    nodes: [
      block(0, 0, "Ideas", "Topics for the week."),
      block(320, 0, "Captions", "Texts for every post."),
      block(640, 0, "Design", "Images and covers."),
      block(960, 0, "Client approval", "The client marks changes on the posts and approves."),
      block(1280, 0, "Publishing", "Scheduled for the agreed dates."),
      note(980, 170, "Add the posts here and send the client one link"),
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4, "approved"]],
  },
  {
    id: "onboarding",
    title: "Client onboarding",
    description: "Everything to collect before the first post.",
    tone: "#d4566b",
    preview: { columns: ["Item", "From the client", "Status"], tags: ["Received", "Waiting", "Received"], people: true },
    nodes: [
      heading(0, -120, "New client"),
      block(0, 0, "Brief", "Business, goals, audience."),
      block(330, 0, "Tone of voice", "How the brand talks. Words to use and avoid."),
      block(660, 0, "References", "Accounts and posts the client likes."),
      block(0, 180, "Access", "Logins, Meta Business, who approves."),
      block(330, 180, "Brand kit", "Logo, fonts, colours."),
      block(660, 180, "Competitors", "3–5 accounts to watch."),
    ],
    edges: [[1, 2], [2, 3]],
  },
  {
    id: "brainstorm",
    title: "Brainstorm",
    description: "One topic in the middle, ideas on stickies around it.",
    tone: "#c9a227",
    preview: { columns: ["Idea", "Author", "Priority"], tags: ["High", "Medium", "Low"], people: true },
    nodes: [
      block(300, 200, "Topic", "What are we looking for?"),
      note(0, 0, "Idea"),
      note(330, -10, "Idea"),
      note(660, 10, "Idea"),
      note(0, 400, "Idea"),
      note(330, 420, "Idea"),
      note(660, 400, "Idea"),
    ],
    edges: [],
  },
  {
    id: "funnel",
    title: "Content funnel",
    description: "Reach, engagement, request: what each piece of content does.",
    tone: "#2a9d99",
    preview: { columns: ["Stage", "Content", "Goal"], tags: ["Reach", "Engagement", "Sale"] },
    nodes: [
      block(0, 0, "Reach", "Reels and trends that bring new people."),
      block(0, 180, "Engagement", "Stories, polls and useful posts."),
      block(0, 360, "Request", "Offers, reviews, a clear call to action."),
      block(0, 540, "Sale", "Direct messages, booking, the link in bio."),
      note(340, 190, "Check which posts move people down"),
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
]

/** Rough size of each piece on the canvas, for the card previews and for centring. */
export const NODE_SIZE: Record<TemplateNode["type"], { w: number; h: number }> = {
  block: { w: 260, h: 110 },
  note: { w: 200, h: 80 },
  text: { w: 340, h: 44 },
}
