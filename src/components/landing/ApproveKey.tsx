"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type KeyApi = { press: () => void; dispose: () => void }

/**
 * The landing's "Approve" key: Nodly's logo keycap in real 3D (three.js, loaded on demand).
 * It leans towards the cursor and presses down with a recoil and a shine when clicked,
 * tapped or when Enter is pressed. Falls back to the static logo image without WebGL or
 * with reduced motion — still clickable.
 */
export function ApproveKey({ onPress, label, className }: { onPress: () => void; label: string; className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const apiRef = useRef<KeyApi | null>(null)
  const onPressRef = useRef(onPress)
  const [live, setLive] = useState(false)
  const [tapped, setTapped] = useState(false)

  useEffect(() => { onPressRef.current = onPress }, [onPress])

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce || !canvasRef.current || !boxRef.current) return
    let cancelled = false
    createKey(canvasRef.current, boxRef.current, () => onPressRef.current())
      .then((api) => {
        if (cancelled) { api?.dispose(); return }
        apiRef.current = api
        setLive(!!api)
      })
      .catch(() => {})
    return () => { cancelled = true; apiRef.current?.dispose(); apiRef.current = null }
  }, [])

  function press() {
    if (apiRef.current) { apiRef.current.press(); return }
    // static fallback: a quick CSS press, then the same result
    setTapped(true)
    window.setTimeout(() => setTapped(false), 160)
    onPressRef.current()
  }

  // Enter anywhere on the page (outside form fields) presses the key too.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.repeat) return
      const el = e.target as HTMLElement | null
      if (el && (el.closest("input, textarea, select, button, a, [contenteditable=true]"))) return
      press()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  return (
    <div ref={boxRef} className={cn("relative aspect-square", className)}>
      <button
        type="button"
        aria-label={label}
        onClick={press}
        className="absolute inset-[14%] z-10 cursor-pointer rounded-[22%] outline-none"
      />
      <canvas ref={canvasRef} aria-hidden="true" className={cn("pointer-events-none absolute inset-0 size-full transition-opacity duration-500", live ? "opacity-100" : "opacity-0")} />
      {!live && (
        <span aria-hidden="true" className={cn("pointer-events-none absolute inset-[12%] transition-transform duration-150", tapped && "scale-[0.94]")}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static fallback while three.js loads */}
          <img src="/brand/nodly-key-light.png" alt="" className="size-full object-contain dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/nodly-key-dark.png" alt="" className="hidden size-full object-contain dark:block" />
        </span>
      )}
    </div>
  )
}

/** Builds the three.js scene; returns null when WebGL isn't available. */
async function createKey(canvas: HTMLCanvasElement, box: HTMLElement, onBottomOut: () => void): Promise<KeyApi | null> {
  const THREE = await import("three")
  const { RoundedBoxGeometry } = await import("three/examples/jsm/geometries/RoundedBoxGeometry.js")
  const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js")

  let renderer: import("three").WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  } catch {
    return null
  }
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  const camera = new THREE.PerspectiveCamera(7.2, 1, 1, 80)
  camera.position.set(0, 0, 30)
  const sun = new THREE.DirectionalLight(0xffffff, 1.2)
  sun.position.set(-3, 5, 10)
  scene.add(sun)

  // The keycap: a rounded box whose sides taper towards the top face.
  const capGeo = new RoundedBoxGeometry(2.3, 2.3, 0.95, 16, 0.3)
  const pos = capGeo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const f = 1 - 0.26 * Math.min(Math.max((pos.getZ(i) + 0.475) / 0.95, 0), 1)
    pos.setXY(i, pos.getX(i) * f, pos.getY(i) * f)
  }
  capGeo.computeVertexNormals()

  const key = new THREE.Group()
  scene.add(key)
  const keyInv = { value: new THREE.Matrix4() }
  const sweep = { value: -9 }

  // White key, dark top face (by surface direction), plus a diagonal shine band.
  const capMat = new THREE.MeshStandardMaterial({ roughness: 0.72, envMapIntensity: 0.3 })
  capMat.onBeforeCompile = (sh) => {
    sh.uniforms.keyMatrix = keyInv
    sh.uniforms.uSweep = sweep
    sh.vertexShader = "uniform mat4 keyMatrix;\nvarying vec3 vKeyPos;\nvarying vec3 vLocalN;\n" + sh.vertexShader
      .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\n vLocalN = objectNormal;")
      .replace("#include <project_vertex>", "#include <project_vertex>\n vKeyPos = (keyMatrix * modelMatrix * vec4(transformed, 1.0)).xyz;")
    sh.fragmentShader = "uniform float uSweep;\nvarying vec3 vKeyPos;\nvarying vec3 vLocalN;\n" + sh.fragmentShader
      .replace("#include <color_fragment>", "#include <color_fragment>\n diffuseColor.rgb = mix(vec3(0.94, 0.93, 0.91), vec3(0.045, 0.043, 0.042), smoothstep(0.845, 0.865, normalize(vLocalN).z));")
      .replace("#include <dithering_fragment>", "#include <dithering_fragment>\n float d = (vKeyPos.x - vKeyPos.y * 0.62) - uSweep;\n gl_FragColor.rgb += (exp(-d * d / 0.03) + 0.3 * exp(-d * d / 0.5)) * 0.55;")
  }
  const cap = new THREE.Mesh(capGeo, capMat)
  key.add(cap)

  // Contour around the key: light on dark pages, dark on light pages.
  const hullMat = new THREE.MeshBasicMaterial({ color: 0xf1efec, side: THREE.BackSide })
  const hull = new THREE.Mesh(capGeo, hullMat)
  hull.scale.set(1.045, 1.045, 1.06)
  key.add(hull)
  const syncTheme = () => hullMat.color.set(document.documentElement.classList.contains("dark") ? 0xf1efec : 0x121212)
  syncTheme()
  const themeObserver = new MutationObserver(syncTheme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

  // The N on the top face.
  const n = new THREE.Shape()
  ;[[-0.5, -0.56], [-0.235, -0.56], [-0.235, 0.16], [0.27, -0.56], [0.5, -0.56], [0.5, 0.56], [0.235, 0.56], [0.235, -0.16], [-0.27, 0.56], [-0.5, 0.56]]
    .forEach(([x, y], i) => (i ? n.lineTo(x, y) : n.moveTo(x, y)))
  const nMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(n, { depth: 0.012, bevelEnabled: false }),
    new THREE.MeshBasicMaterial({ color: 0xf1efec, toneMapped: false })
  )
  nMesh.position.set(0, 0, 0.478)
  nMesh.scale.setScalar(0.97)
  key.add(nMesh)

  // ── motion ──
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 }
  let pressAt = -1
  let bottomedOut = true
  let sweepFrom = -1
  const clock = new THREE.Clock()

  function onPointer(e: PointerEvent) {
    const r = box.getBoundingClientRect()
    const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth
    const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight
    tilt.ty = Math.max(-1, Math.min(1, dx * 2.2)) * 0.32
    tilt.tx = Math.max(-1, Math.min(1, dy * 2.2)) * 0.26
  }
  window.addEventListener("pointermove", onPointer, { passive: true })

  function resize() {
    const w = box.clientWidth, h = box.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(box)
  resize()

  // Only animate while on screen and the tab is visible.
  let visible = true
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
  io.observe(box)

  let frame = 0
  function loop() {
    frame = requestAnimationFrame(loop)
    if (!visible || document.hidden) return
    const t = clock.getElapsedTime()
    tilt.x += (tilt.tx - tilt.x) * 0.08
    tilt.y += (tilt.ty - tilt.y) * 0.08

    // press: down in 110 ms, then a damped spring back past rest (the recoil)
    let depth = 0
    if (pressAt >= 0) {
      const p = t - pressAt
      if (p < 0.11) depth = p / 0.11
      else {
        if (!bottomedOut) { bottomedOut = true; sweepFrom = t; onBottomOut() }
        const r = p - 0.11
        depth = Math.exp(-5.5 * r) * Math.cos(10 * r)
        if (r > 1.2) pressAt = -1
      }
    }
    const float = Math.sin(t * 1.3) * 0.05
    key.position.set(0, float * 0.6, -0.55 * depth)
    key.scale.setScalar(1 - 0.06 * depth)
    key.rotation.set(0.12 + tilt.x + float * 0.3, -0.16 + tilt.y, 0)
    key.updateMatrixWorld()
    keyInv.value.copy(key.matrixWorld).invert()
    sweep.value = sweepFrom >= 0 && t - sweepFrom < 0.9 ? -2.6 + 5.2 * ((t - sweepFrom) / 0.9) : -9
    renderer.render(scene, camera)
  }
  loop()

  return {
    press() {
      pressAt = clock.getElapsedTime()
      bottomedOut = false
    },
    dispose() {
      cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", onPointer)
      resizeObserver.disconnect()
      io.disconnect()
      themeObserver.disconnect()
      capGeo.dispose(); capMat.dispose(); hullMat.dispose(); pmrem.dispose()
      renderer.dispose()
    },
  }
}
