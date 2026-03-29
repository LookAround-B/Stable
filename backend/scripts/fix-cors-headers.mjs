/**
 * Script to migrate all API routes from inline CORS headers to setCorsHeaders()
 * Run with: node scripts/fix-cors-headers.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const apiDir = path.join(__dirname, '..', 'src', 'pages', 'api')

// The inline CORS block pattern (5-6 lines)
const CORS_BLOCK_RE = /  \/\/ Set CORS headers[^\n]*\n(?:  res\.setHeader\([^\n]+\n){3,6}/g

// Alternative: just the setHeader lines without comment
const CORS_LINES_RE = /  res\.setHeader\('Access-Control-Allow-Origin'[^\n]+\n  res\.setHeader\('Access-Control-Allow-Methods'[^\n]+\n  res\.setHeader\('Access-Control-Allow-Headers'[^\n]+\n  res\.setHeader\('Access-Control-Allow-Credentials'[^\n]+\n(?:  res\.setHeader\('Cross-Origin-[^\n]+\n)*/g

const IMPORT_CORS = `import { setCorsHeaders } from '@/lib/cors'`
const CORS_CALL = `  const origin = req.headers.origin\n  setCorsHeaders(res, origin as string | undefined)\n`

function walkDir(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkDir(full))
    } else if (entry.name.endsWith('.ts')) {
      results.push(full)
    }
  }
  return results
}

let modified = 0
let skipped = 0

for (const file of walkDir(apiDir)) {
  let content = fs.readFileSync(file, 'utf-8')
  
  // Skip files that already use setCorsHeaders
  if (content.includes('setCorsHeaders')) {
    skipped++
    continue
  }
  
  // Skip if no CORS headers found
  if (!content.includes("Access-Control-Allow-Origin")) {
    skipped++
    continue
  }

  const original = content

  // Replace the CORS block (with comment)
  content = content.replace(CORS_BLOCK_RE, CORS_CALL)
  
  // If the comment version didn't match, try just the setHeader lines
  if (content === original) {
    content = content.replace(CORS_LINES_RE, CORS_CALL)
  }

  // Only proceed if we actually changed something
  if (content === original) {
    console.log(`  SKIP (pattern not matched): ${path.relative(apiDir, file)}`)
    skipped++
    continue
  }

  // Add the import for setCorsHeaders if not already present
  if (!content.includes('setCorsHeaders')) {
    // We already replaced, so this shouldn't happen, but just in case
    skipped++
    continue
  }

  // Add import near top of file
  if (!content.includes("import { setCorsHeaders }") && !content.includes("from '@/lib/cors'")) {
    // Find the last import line
    const lines = content.split('\n')
    let lastImportIdx = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ') || lines[i].startsWith('import{')) {
        lastImportIdx = i
      }
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, IMPORT_CORS)
      content = lines.join('\n')
    }
  }

  fs.writeFileSync(file, content)
  modified++
  console.log(`  FIXED: ${path.relative(apiDir, file)}`)
}

console.log(`\nDone. Modified: ${modified}, Skipped: ${skipped}`)
