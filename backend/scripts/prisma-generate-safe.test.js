const assert = require('node:assert/strict')
const {
  formatLockedEngineHelp,
  getStaleEngineTempFiles,
  isWindowsEngineRenameLockError,
} = require('./prisma-generate-safe-lib')

const output = [
  'Error:',
  "EPERM: operation not permitted, rename 'D:\\repo\\backend\\node_modules\\.prisma\\client\\query_engine-windows.dll.node.tmp60520'",
  "-> 'D:\\repo\\backend\\node_modules\\.prisma\\client\\query_engine-windows.dll.node'",
].join('\n')

assert.equal(isWindowsEngineRenameLockError(output), true)
assert.equal(isWindowsEngineRenameLockError('different prisma error'), false)

const entries = [
  { isFile: () => true, name: 'query_engine-windows.dll.node.tmp60520' },
  { isFile: () => true, name: 'query_engine-windows.dll.node' },
  { isFile: () => true, name: 'schema.prisma' },
  { isFile: () => false, name: 'deno' },
]

assert.deepEqual(getStaleEngineTempFiles(entries), ['query_engine-windows.dll.node.tmp60520'])

const message = formatLockedEngineHelp({ attempts: 3, tmpFileCount: 9 })

assert.match(message, /after 3 attempts/i)
assert.match(message, /Windows still has the Prisma engine DLL locked/i)
assert.match(message, /Close any backend dev server/i)
assert.match(message, /Found 9 stale Prisma engine temp files/i)

console.log('prisma-generate-safe tests passed')
