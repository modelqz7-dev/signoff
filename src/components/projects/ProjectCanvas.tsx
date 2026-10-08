"use client"

import "@xyflow/react/dist/style.css"
import { createContext, memo, useCallback, useContext, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ConnectionMode, Handle, MarkerType, Position, ReactFlow, ReactFlowProvider,
  addEdge, useEdgesState, useNodesState, useReactFlow,
  type Connection, type Edge, type Node, type NodeProps,
} from "@xyflow/react"
import { ImageIcon, LayoutTemplateIcon, MinusIcon, PlusIcon, ScanIcon, SquareIcon, StickyNoteIcon, TypeIcon } from "lucide-react"
import type { Order } from "@/components/dashboard/types"
import { StatusChip, Thumb } from "@/components/projects/PostBits"
import { TemplatesDialog } from "@/components/projects/TemplatesDialog"
import { NODE_SIZE, type CanvasTemplate } from "@/components/projects/templates"
import { useTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { useT, type T } from "@/lib/i18n"

// A free canvas, edge to edge, with nothing on it but what the user puts there: blocks with a
// title and a description, posts (real post orders the client approves), plain text, sticky notes,
// and paths between them. A double click or a right click opens the menu of things to add, right
// where the pointer is. The canvas is saved as one { nodes, edges } document by whoever hosts it:
// a project (orders.board) or the workshop's own canvas (shops.board).

export type Board = { nodes: Node[]; edges: Edge[] }


type Kind = "block" | "post" | "text" | "note"
const SAVE_DELAY = 700

// Nodes read the project's posts and the translator from here rather than from their data,
// so the saved canvas only keeps what the user wrote.
const CanvasCtx = createContext<{ posts: Map<string, Order>; t: T; readOnly: boolean }>({ posts: new Map(), t: (s) => s, readOnly: false })

type CanvasProps = {
  initial: Board | null | undefined
  /** Stores the canvas; resolves to false when that failed. */
  save: (board: Board) => Promise<boolean>
  /** Posts that can sit on this canvas; without onCreatePosts there is no Post tool. */
  posts?: Order[]
  onCreatePosts?: (files: File[]) => Promise<Order[]>
  readOnly?: boolean
}

export function ProjectCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  )
}

function Canvas({ initial: saved0, save, posts = [], onCreatePosts, readOnly = false }: CanvasProps) {
  const { t } = useT()
  const theme = useTheme()
  const flow = useReactFlow()
  const initial = saved0 ?? { nodes: [], edges: [] }
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges)
  const [saved, setSaved] = useState<"saved" | "saving" | "error">("saved")
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  // The add menu, where the user double- or right-clicked: on screen, and on the canvas.
  const [menu, setMenu] = useState<{ left: number; top: number; at: { x: number; y: number } } | null>(null)
  const postsAt = useRef<{ x: number; y: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const postMap = new Map(posts.map((p) => [p.id, p]))

  // Autosave: what the user wrote and where things stand, never selection or drag state.
  const first = useRef(true)
  useEffect(() => {
    if (readOnly) return
    if (first.current) { first.current = false; return }
    const timer = window.setTimeout(async () => {
      setSaved("saving")
      const board: Board = {
        nodes: nodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
        edges: edges.map(({ id, source, target, sourceHandle, targetHandle, label }) => ({ id, source, target, sourceHandle, targetHandle, label })),
      }
      setSaved((await save(board)) ? "saved" : "error")
    }, SAVE_DELAY)
    return () => window.clearTimeout(timer)
  }, [nodes, edges, save, readOnly])

  const onConnect = useCallback((c: Connection) => setEdges((es) => addEdge({ ...c, id: `e-${crypto.randomUUID()}` }, es)), [setEdges])

  /** Somewhere free near the middle of what's on screen, so new things don't pile up. */
  const spot = (i = 0) => {
    const box = document.querySelector(".react-flow")?.getBoundingClientRect()
    const center = box
      ? flow.screenToFlowPosition({ x: box.left + box.width / 2, y: box.top + box.height / 2 })
      : { x: 0, y: 0 }
    return { x: center.x - 120 + i * 230 + (nodes.length % 5) * 18, y: center.y - 60 + (nodes.length % 5) * 18 }
  }

  function add(kind: Exclude<Kind, "post">, at = spot()) {
    const data = kind === "block" ? { title: "", text: "" } : { text: "" }
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { id: `n-${crypto.randomUUID()}`, type: kind, position: at, data, selected: true }])
  }

  async function addPosts(files: File[]) {
    if (!onCreatePosts) return
    const at = postsAt.current
    postsAt.current = null
    const created = await onCreatePosts(files)
    setNodes((ns) => [
      ...ns,
      ...created.map((post, i) => ({
        id: `p-${post.id}`,
        type: "post",
        position: at ? { x: at.x + i * 230, y: at.y } : spot(i),
        data: { postId: post.id },
      })),
    ])
  }

  /** Opens the add menu at the pointer, unless the click landed on something already there. */
  function openMenu(e: React.MouseEvent | MouseEvent) {
    const target = e.target as HTMLElement
    if (readOnly || !target.classList.contains("react-flow__pane")) return
    e.preventDefault()
    const box = boxRef.current?.getBoundingClientRect()
    if (!box) return
    setMenu({
      left: Math.min(e.clientX - box.left, box.width - 220),
      top: Math.min(e.clientY - box.top, box.height - 250),
      at: flow.screenToFlowPosition({ x: e.clientX, y: e.clientY }),
    })
  }

  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [menu])

  type MenuItem = { id: "templates" | "block" | "post" | "text" | "note"; icon: typeof SquareIcon; label: string }
  const menuItems: MenuItem[] = [
    { id: "templates", icon: LayoutTemplateIcon, label: t("Templates") },
    { id: "block", icon: SquareIcon, label: t("Block") },
    ...(onCreatePosts ? [{ id: "post" as const, icon: ImageIcon, label: t("Post") }] : []),
    { id: "text", icon: TypeIcon, label: t("Text") },
    { id: "note", icon: StickyNoteIcon, label: t("Note") },
  ]

  function pick(id: MenuItem["id"]) {
    const at = menu?.at
    setMenu(null)
    if (id === "templates") setTemplatesOpen(true)
    else if (id === "post") { postsAt.current = at ?? null; fileRef.current?.click() }
    else add(id, at)
  }

  /** Lays a template out around the middle of the screen, with fresh ids and the user's language. */
  function applyTemplate(tpl: CanvasTemplate) {
    const ids = tpl.nodes.map(() => `n-${crypto.randomUUID()}`)
    const boxes = tpl.nodes.map((n) => ({ ...n, ...NODE_SIZE[n.type] }))
    const minX = Math.min(...boxes.map((b) => b.x)), maxX = Math.max(...boxes.map((b) => b.x + b.w))
    const minY = Math.min(...boxes.map((b) => b.y)), maxY = Math.max(...boxes.map((b) => b.y + b.h))
    const mid = spot()
    const dx = mid.x + 120 - (minX + maxX) / 2
    const dy = mid.y + 60 - (minY + maxY) / 2
    const added: Node[] = tpl.nodes.map((n, i) => ({
      id: ids[i],
      type: n.type,
      position: { x: n.x + dx, y: n.y + dy },
      data: n.type === "block" ? { title: t(n.title), text: t(n.text) } : { text: t(n.text) },
    }))
    // join the sides that face each other, so paths run straight
    const links: Edge[] = tpl.edges.map(([a, b, label]) => {
      const A = boxes[a], B = boxes[b]
      const ddx = B.x + B.w / 2 - (A.x + A.w / 2), ddy = B.y + B.h / 2 - (A.y + A.h / 2)
      const across = Math.abs(ddx) >= Math.abs(ddy)
      return {
        id: `e-${crypto.randomUUID()}`,
        source: ids[a],
        target: ids[b],
        sourceHandle: across ? (ddx > 0 ? "r" : "l") : (ddy > 0 ? "b" : "t"),
        targetHandle: across ? (ddx > 0 ? "l" : "r") : (ddy > 0 ? "t" : "b"),
        label: label ? t(label) : undefined,
      }
    })
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), ...added])
    setEdges((es) => [...es, ...links])
    window.setTimeout(() => flow.fitView({ nodes: added.map((n) => ({ id: n.id })), maxZoom: 1, padding: 0.25, duration: 400 }), 60)
  }

  function renamePath(_: React.MouseEvent, edge: Edge) {
    if (readOnly) return
    const label = window.prompt(t("Text on the path"), typeof edge.label === "string" ? edge.label : "")
    if (label === null) return
    setEdges((es) => es.map((e) => (e.id === edge.id ? { ...e, label: label.trim() || undefined } : e)))
  }

  return (
    <CanvasCtx.Provider value={{ posts: postMap, t, readOnly }}>
      <div ref={boxRef} className="relative h-full w-full" onDoubleClick={openMenu}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={onConnect}
          onEdgeDoubleClick={renamePath}
          onPaneContextMenu={openMenu}
          onPaneClick={() => setMenu(null)}
          onMoveStart={() => setMenu(null)}
          zoomOnDoubleClick={false}
          nodeTypes={NODE_TYPES}
          connectionMode={ConnectionMode.Loose}
          defaultEdgeOptions={{ type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 }, style: { strokeWidth: 1.5 } }}
          colorMode={theme}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          fitView={initial.nodes.length > 0}
          fitViewOptions={{ maxZoom: 1, padding: 0.3 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
          className="!bg-transparent"
        />

        {nodes.length === 0 && !readOnly && (
          <>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center">
              <p className="text-sm font-medium text-foreground">{t("A blank canvas")}</p>
              <p className="max-w-xs text-xs text-muted-foreground">{t("Double-click or right-click anywhere to add a block, a post or a note. Drag from a dot on one block to another to draw a path.")}</p>
            </div>
            {/* like Notion's "Get started with" */}
            <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col gap-2">
              <p className="text-xs text-muted-foreground">{t("Get started with")}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTemplatesOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-foreground/[0.06] px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/[0.1]"
                >
                  <LayoutTemplateIcon className="size-4" />
                  {t("Templates")}
                </button>
              </div>
            </div>
          </>
        )}

        <TemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} onPick={(tpl) => { if (tpl) applyTemplate(tpl) }} />

        {/* the add menu, where the user clicked */}
        {menu && (
          <div
            role="menu"
            className="absolute z-20 flex w-52 flex-col gap-0.5 rounded-xl bg-popover p-1.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)] ring-1 ring-border"
            style={{ left: menu.left, top: menu.top }}
          >
            {menuItems.map(({ id, icon: Icon, label }, i) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                autoFocus={i === 1}
                onClick={() => pick(id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-foreground/90 transition-colors outline-none hover:bg-hover focus-visible:bg-hover",
                  i === 0 && "mb-0.5 border-b border-border pb-2"
                )}
              >
                <Icon className="size-4 text-muted-foreground" />
                {label}
              </button>
            ))}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf"
          multiple
          className="hidden"
          onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; if (files.length) addPosts(files) }}
        />

        {/* zoom */}
        <div className="absolute right-4 bottom-4 flex items-center gap-0.5 rounded-xl bg-card p-1 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)] ring-1 ring-border">
          <Tool icon={MinusIcon} label={t("Zoom out")} onClick={() => flow.zoomOut()} />
          <Tool icon={PlusIcon} label={t("Zoom in")} onClick={() => flow.zoomIn()} />
          <Tool icon={ScanIcon} label={t("Fit to screen")} onClick={() => flow.fitView({ maxZoom: 1, padding: 0.3, duration: 300 })} />
        </div>

        {!readOnly && (
          <p className="pointer-events-none absolute top-3 right-4 text-[11px] text-muted-foreground">
            {saved === "saving" ? t("Saving...") : saved === "error" ? t("Couldn't save") : t("Saved")}
          </p>
        )}
      </div>
    </CanvasCtx.Provider>
  )
}

function Tool({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
    >
      <Icon className="size-4" />
    </button>
  )
}

// ── nodes ────────────────────────────────────────────────

/** Dots on all four sides; any dot can start or end a path. */
function Dots() {
  const { readOnly } = useContext(CanvasCtx)
  if (readOnly) return null
  const cls = "!size-2.5 !border-2 !border-background !bg-foreground/60 opacity-0 transition-opacity group-hover:opacity-100"
  return (
    <>
      <Handle type="source" position={Position.Top} id="t" className={cls} />
      <Handle type="source" position={Position.Right} id="r" className={cls} />
      <Handle type="source" position={Position.Bottom} id="b" className={cls} />
      <Handle type="source" position={Position.Left} id="l" className={cls} />
    </>
  )
}

/** Text typed straight into a node. */
function Field({ id, field, value, placeholder, className, multiline }: {
  id: string
  field: string
  value: string
  placeholder: string
  className?: string
  multiline?: boolean
}) {
  const { updateNodeData } = useReactFlow()
  const { readOnly } = useContext(CanvasCtx)
  if (readOnly) return value ? <p className={cn("whitespace-pre-wrap", className)}>{value}</p> : null
  const props = {
    value,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateNodeData(id, { [field]: e.target.value }),
    className: cn("nodrag nowheel w-full bg-transparent outline-none placeholder:text-muted-foreground/50", className),
  }
  return multiline ? <textarea {...props} rows={1} className={cn(props.className, "field-sizing-content resize-none")} /> : <input {...props} />
}

const BlockNode = memo(function BlockNode({ id, data, selected }: NodeProps) {
  const { t } = useContext(CanvasCtx)
  const d = data as { title?: string; text?: string }
  return (
    <div className={cn("group w-[260px] rounded-xl bg-card p-3.5 shadow-sm ring-1 ring-border", selected && "ring-2 ring-foreground/60")}>
      <Dots />
      <Field id={id} field="title" value={d.title ?? ""} placeholder={t("Title")} className="text-[15px] font-semibold text-foreground" />
      <Field id={id} field="text" value={d.text ?? ""} placeholder={t("Description")} multiline className="mt-1 text-sm leading-snug text-muted-foreground" />
    </div>
  )
})

const TextNode = memo(function TextNode({ id, data, selected }: NodeProps) {
  const { t } = useContext(CanvasCtx)
  return (
    <div className={cn("group min-w-[160px] rounded-md px-1", selected && "ring-2 ring-foreground/40")}>
      <Dots />
      <Field id={id} field="text" value={(data as { text?: string }).text ?? ""} placeholder={t("Text")} multiline className="font-[family-name:var(--font-brand)] text-2xl font-bold tracking-[-0.02em] text-foreground" />
    </div>
  )
})

const NoteNode = memo(function NoteNode({ id, data, selected }: NodeProps) {
  const { t } = useContext(CanvasCtx)
  return (
    <div className={cn("group w-[200px] -rotate-1 rounded-md bg-[#fdf1a8] p-3 shadow-md dark:bg-[#5a4d17]", selected && "ring-2 ring-foreground/50")}>
      <Dots />
      <Field id={id} field="text" value={(data as { text?: string }).text ?? ""} placeholder={t("Note")} multiline className="text-sm leading-snug text-[#3d3510] placeholder:text-[#3d3510]/40 dark:text-[#f5ecc4] dark:placeholder:text-[#f5ecc4]/40" />
    </div>
  )
})

const PostNode = memo(function PostNode({ data, selected }: NodeProps) {
  const { posts, t } = useContext(CanvasCtx)
  const post = posts.get((data as { postId?: string }).postId ?? "")
  return (
    <div className={cn("group w-[200px] overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border", selected && "ring-2 ring-foreground/60")}>
      <Dots />
      {post ? (
        <>
          <Thumb url={post.file_url} className="aspect-[4/5] w-full" />
          <div className="flex flex-col gap-2 border-t border-border p-2.5">
            <p className="truncate text-sm font-medium text-foreground">{post.title}</p>
            <div className="flex items-center justify-between gap-2">
              <StatusChip t={t} order={post} />
              <Link href={`/orders/${post.id}`} className="nodrag rounded-md px-1.5 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase ring-1 ring-border hover:text-foreground">
                {t("Open")}
              </Link>
            </div>
          </div>
        </>
      ) : (
        <p className="p-4 text-xs text-muted-foreground">{t("This post was deleted.")}</p>
      )}
    </div>
  )
})

const NODE_TYPES = { block: BlockNode, text: TextNode, note: NoteNode, post: PostNode }
