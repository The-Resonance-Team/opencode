import path from "path"
import { appendFile, mkdir, rename, rm } from "fs/promises"

export function readText(filePath: string) {
  return Bun.file(filePath).text()
}

export function readJson<T>(filePath: string) {
  return Bun.file(filePath).json() as Promise<T>
}

export async function writeText(filePath: string, content: string) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await Bun.write(filePath, content)
}

export async function appendText(filePath: string, content: string) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await appendFile(filePath, content)
}

export async function writeJsonAtomic(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true })
  const temporary = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`
  await Bun.write(temporary, JSON.stringify(value)).catch(async (error) => {
    await rm(temporary, { force: true }).catch(() => undefined)
    throw error
  })
  await rename(temporary, filePath).catch(async (error) => {
    await rm(temporary, { force: true }).catch(() => undefined)
    throw error
  })
}

// Writes to one file serialize: full rewrites and appends from the same session
// must never interleave (a late append resurrects trimmed entries). Failures
// surface to the console instead of silently losing user drafts.
// ponytail: keyed by the small fixed set of state file paths; never evicted.
const queues = new Map<string, Promise<void>>()
function queued(filePath: string, write: () => Promise<void>) {
  const next = (queues.get(filePath) ?? Promise.resolve())
    .then(write)
    .catch((error) => console.error(`failed to persist ${filePath}`, error))
  queues.set(filePath, next)
}

export function writeTextQueued(filePath: string, content: string) {
  queued(filePath, () => writeText(filePath, content))
}

export function appendTextQueued(filePath: string, content: string) {
  queued(filePath, () => appendText(filePath, content))
}
