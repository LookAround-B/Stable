const ENGINE_FILE_NAME = 'query_engine-windows.dll.node'

function isWindowsEngineRenameLockError(output) {
  return (
    typeof output === 'string' &&
    output.includes('EPERM: operation not permitted, rename') &&
    output.includes(ENGINE_FILE_NAME)
  )
}

function getPrismaClientDir(projectRoot) {
  return require('path').join(projectRoot, 'node_modules', '.prisma', 'client')
}

function getPrismaGenerateCommand({
  nodeExecutable = process.execPath,
  prismaCliPath = require.resolve('prisma/build/index.js'),
} = {}) {
  return {
    command: nodeExecutable,
    args: [prismaCliPath, 'generate'],
  }
}

function getStaleEngineTempFiles(entries) {
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith(`${ENGINE_FILE_NAME}.tmp`))
}

function formatLockedEngineHelp({ attempts, tmpFileCount }) {
  const retryLabel = attempts === 1 ? 'attempt' : 'attempts'
  const tmpLabel = tmpFileCount === 1 ? 'temp file' : 'temp files'

  return [
    '',
    `[prisma-generate-safe] Prisma could not replace ${ENGINE_FILE_NAME} after ${attempts} ${retryLabel}.`,
    '[prisma-generate-safe] Root cause: Windows still has the Prisma engine DLL locked by a running process.',
    '[prisma-generate-safe] Close any backend dev server, Next.js server, Prisma Studio, or other node process using this repo, then rerun the build.',
    `[prisma-generate-safe] Found ${tmpFileCount} stale Prisma engine ${tmpLabel} in node_modules/.prisma/client.`,
  ].join('\n')
}

module.exports = {
  ENGINE_FILE_NAME,
  formatLockedEngineHelp,
  getPrismaClientDir,
  getPrismaGenerateCommand,
  getStaleEngineTempFiles,
  isWindowsEngineRenameLockError,
}
