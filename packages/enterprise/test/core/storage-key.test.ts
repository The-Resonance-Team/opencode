import { describe, expect, test } from "bun:test"
import { Storage } from "../../src/core/storage"

// The traversal guard is the enterprise bucket's last line of defense: shareID
// values arrive from client input and become object-path components.
describe("core.storage key guard", () => {
  test("accepts ordinary key segments", () => {
    expect(Storage.resolve(["share", "ab12CD34"])).toBe("share/ab12CD34.json")
    expect(Storage.resolve(["share_snapshot", "share-1.v2"])).toBe("share_snapshot/share-1.v2.json")
  })

  test("rejects traversal and non-key segments before reaching the adapter", () => {
    expect(() => Storage.resolve(["share", "../evil"])).toThrow("Invalid storage key segment")
    expect(() => Storage.resolve(["share", ".."])).toThrow("Invalid storage key segment")
    expect(() => Storage.resolve(["", "x"])).toThrow("Invalid storage key segment")
    expect(() => Storage.resolve(["share", "a b"])).toThrow("Invalid storage key segment")
    expect(() => Storage.resolve(["share", ".hidden"])).toThrow("Invalid storage key segment")
  })
})
