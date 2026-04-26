#!/usr/bin/env node

const fs = require('fs/promises')
const path = require('path')
const { spawn } = require('child_process')
const {
  formatLockedEngineHelp,
  getPrismaClientDir,
  getPrismaGenerateCommand,
  getStaleEngineTempFiles,
  isWindowsEngineRenameLockError,
} = require('./prisma-generate-safe-lib')

const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 750
const PROJECT_ROOT = path.resolve(__dirname, '..')
const CLIENT_DIR = getPrismaClientDir(PROJECT_ROOT)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function listPrismaClientEntries() {
  try {
    return await fs.readdir(CLIENT_DIR, { withFileTypes: true })
  } catch {
    return []
  }
}

async function removeStaleEngineTempFiles() {
  const entries = await listPrismaClientEntries()
  const staleFiles = getStaleEngineTempFiles(entries)

  await Promise.all(
    staleFiles.map(async (name) => {
      try {
        await fs.unlink(path.join(CLIENT_DIR, name))
      } catch {
        // Ignore temp-file cleanup failures; the real signal comes from prisma generate.
      }
    })
  )

  return staleFiles.length
}

function runPrismaGenerate() {
  return new Promise((resolve) => {
    const { command, args } = getPrismaGenerateCommand()
    const child = spawn(command, args, {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    })
    let settled = false

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      stdout += text
      process.stdout.write(text)
    })

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      stderr += text
      process.stderr.write(text)
    })

    child.on('error', (error) => {
      if (settled) return
      settled = true
      resolve({
        code: 1,
        output: `${stdout}\n${stderr}\n${error instanceof Error ? error.message : String(error)}`,
      })
    })

    child.on('close', (code) => {
      if (settled) return
      settled = true
      resolve({ code: code || 0, output: `${stdout}\n${stderr}` })
    })
  })
}

async function main() {
  let lastOutput = ''
  let lastTmpFileCount = 0

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    lastTmpFileCount = await removeStaleEngineTempFiles()
    const result = await runPrismaGenerate()
    lastOutput = result.output

    if (result.code === 0) {
      await removeStaleEngineTempFiles()
      return
    }

    if (!isWindowsEngineRenameLockError(result.output)) {
      process.exit(result.code)
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_DELAY_MS)
    }
  }

  process.stderr.write(
    `${formatLockedEngineHelp({
      attempts: MAX_ATTEMPTS,
      tmpFileCount: lastTmpFileCount,
    })}\n`
  )
  process.exit(1)
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`)
  process.exit(1)
})
