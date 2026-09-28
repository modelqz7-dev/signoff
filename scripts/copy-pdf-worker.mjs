// Copies the pdf.js worker next to the site so PDFs don't depend on a third-party CDN.
// Runs before `dev` and `build`; the copy always matches the installed pdfjs-dist version.
import { copyFileSync, mkdirSync } from "node:fs"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const source = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs")
mkdirSync("public", { recursive: true })
copyFileSync(source, "public/pdf.worker.min.mjs")
