import { describe, expect, test } from "bun:test"
import { appendText, readText, writeText, appendTextQueued, writeTextQueued } from "../../src/util/persistence"

async function until(path: string, expected: string) {
  for (let i = 0; i < 100; i++) {
    if ((await readText(path).catch(() => "")) === expected) return true
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  return false
}

describe("persistence write queue", () => {
  test("serializes rewrites and appends to one file in call order", async () => {
    const file = `${import.meta.dir}/tmp/queue-order.jsonl`
    await writeText(file, "")
    writeTextQueued(file, "a\n")
    appendTextQueued(file, "b\n")
    writeTextQueued(file, "c\n")
    appendTextQueued(file, "d\n")
    expect(await until(file, "c\nd\n")).toBe(true)
  })

  test("a failed queued write does not block later writes to the same path", async () => {
    const blocker = `${import.meta.dir}/tmp/blocker.txt`
    await writeText(blocker, "blocker")
    const nested = `${blocker}/child.jsonl`
    // Parent is a file, so mkdir for the nested path always fails.
    writeTextQueued(nested, "will-fail\n")
    writeTextQueued(nested, "also-fails\n")
    const file = `${import.meta.dir}/tmp/queue-after-failure.jsonl`
    writeTextQueued(file, "ok\n")
    expect(await until(file, "ok\n")).toBe(true)
    expect(await readText(nested).catch(() => "")).toBe("")
  })
})
