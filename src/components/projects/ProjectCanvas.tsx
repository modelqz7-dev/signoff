"use client"

import "@xyflow/react/dist/style.css"
import { createContext, memo, useCallback, useContext, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  Background, BackgroundVariant, ConnectionMode, Handle, MarkerType, Position, ReactFlow, ReactFlowProvider,
  addEdge, useEdgesState, useNodesState, useReactFlow,
  type Connection, type Edge, type Node, type NodeProps,
} from "@xyflow/react"
import { ImageIcon, MinusIcon, PlusIcon, ScanIcon, SquareIcon, StickyNoteIcon, TypeIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Order } from "@/components/dashboard/types"
import { StatusChip, Thumb } from "@/components/projects/PostBits"
import { useTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { useT, type T } from "@/lib/i18n"

// The project's free canvas: the SMM specialist lays out whatever they need — blocks with a title
// and a description, posts (real post orders, approved by the client), plain text, sticky notes —
// and draws paths between them. The whole canvas is saved on the project as { nodes, edges }.

export type Board = { nodes: Node[]; edges: Edge[] }

type Kind = "block" | "post" | "text" | "note"
const ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf"
const SAVE_DELAY = 700

// Nodes read the project's posts and the translator from here rather than from their data,
// so the saved canvas only keeps what the user wrote.
const CanvasCtx = createContext<{ posts: Map<string, Order>; t: T; readOnly: boolean }>({ posts: new Map(), t: (s) => s, readOnly: false })

export function ProjectCanvas(props: {
  project: Order
  posts: Order[]
  onCreatePosts: (files: File[]) => Promise<Order[]>
  readOnly?: boolean
}) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  )
}

function Canvas({ project, posts, onCreatePosts, readOnly = false }: {
  project: Order
  posts: Order[]
  onCreatePosts: (files: File[]) => Promise<Order[]>
  readOnly?: boolean
}) {
  const { t } = useT()
  const theme = useTheme()
  const flow = useReactFlow()
  const initial = (project.board as Board | null | undefined) ?? { nodes: [], edges: [] }
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges)
  const [saved, setSaved] = useState<"saved" | "saving" | "error">("saved")
  const fileRef = useRef<HTMLInputElement>(null)
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
      const { error } = await supabase.from("orders").update({ board }).eq("id", project.id)
      setSaved(error ? "error" : "saved")
    }, SAVE_DELAY)
    return () => window.clearTimeout(timer)
  }, [nodes, edges, project.id, readOnly])

  const onConnect = useCallback((c: Connection) => setEdges((es) => addEdge({ ...c, id: `e-${crypto.randomUUID()}` }, es)), [setEdges])

  /** Somewhere free near the middle of what's on screen, so new things don't pile up. */
  const spot = (i = 0) => {
    const box = document.querySelector(".react-flow")?.getBoundingClientRect()
    const center = box
      ? flow.screenToFlowPosition({ x: box.left + box.width / 2, y: box.top + box.height / 2 })
      : { x: 0, y: 0 }
    return { x: center.x - 120 + i * 230 + (nodes.length % 5) * 18, y: center.y - 60 + (nodes.length % 5) * 18 }
  }

  function add(kind: Exclude<Kind, "post">) {
    const data = kind === "block" ? { title: "", text: "" } : { text: "" }
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { id: `n-${crypto.randomUUID()}`, type: kind, position: spot(), data, selected: true }])
  }

  async function addPosts(files: File[]) {
    const created = await onCreatePosts(files)
    setNodes((ns) => [
      ...ns,
      ...created.map((post, i) => ({ id: `p-${post.id}`, type: "post", position: spot(i), data: { postId: post.id } })),
    ])
  }

  function renamePath(_: React.MouseEvent, edge: Edge) {
    if (readOnly) return
    const label = window.prompt(t("Text on the path"), typeof edge.label === "string" ? edge.label : "")
    if (label === null) return
    setEdges((es) => es.map((e) => (e.id === edge.id ? { ...e, label: label.trim() || undefined } : e)))
  }

  return (
    <CanvasCtx.Provider value={{ posts: postMap, t, readOnly }}>
      <div className="relative h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={onConnect}
          onEdgeDoubleClick={renamePath}
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
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} className="!bg-transparent opacity-70" />
        </ReactFlow>

        {nodes.length === 0 && !readOnly && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center">
            <p className="text-sm font-medium text-foreground">{t("A blank canvas")}</p>
            <p className="max-w-xs text-xs text-muted-foreground">{t("Add blocks, posts and notes below, then drag from a dot on one block to another to draw a path.")}</p>
          </div>
        )}

        {/* tools */}
        {!readOnly && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-xl bg-card p-1 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)] ring-1 ring-border">
            <Tool icon={SquareIcon} label={t("Block")} onClick={() => add("block")} />
            <Tool icon={ImageIcon} label={t("Post")} onClick={() => fileRef.current?.click()} />
            <Tool icon={TypeIcon} label={t("Text")} onClick={() => add("text")} />
            <Tool icon={StickyNoteIcon} label={t("Note")} onClick={() => add("note")} />
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
            <Tool icon={MinusIcon} label={t("Zoom out")} onClick={() => flow.zoomOut()} compact />
            <Tool icon={PlusIcon} label={t("Zoom in")} onClick={() => flow.zoomIn()} compact />
            <Tool icon={ScanIcon} label={t("Fit to screen")} onClick={() => flow.fitView({ maxZoom: 1, padding: 0.3, duration: 300 })} compact />
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; if (files.length) addPosts(files) }}
            />
          </div>
        )}

        {!readOnly && (
          <p className="pointer-events-none absolute top-3 right-4 text-[11px] text-muted-foreground">
            {saved === "saving" ? t("Saving...") : saved === "error" ? t("Couldn't save") : t("Saved")}
          </p>
        )}
      </div>
    </CanvasCtx.Provider>
  )
}

function Tool({ icon: Icon, label, onClick, compact }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-lg text-sm text-muted-foreground transition-colors hover:bg-hover hover:text-foreground",
        compact ? "w-9 justify-center" : "px-3"
      )}
    >
      <Icon className="size-4" />
      {!compact && <span className="hidden sm:inline">{label}</span>}
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
