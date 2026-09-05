import { Resource } from "sst"

import { and, Database, inArray } from "@opencode-ai/console-core/drizzle/index.js"
import { ModelTpsRateLimitTable } from "@opencode-ai/console-core/schema/ip.sql.js"

const MAX_IDS = 500

type Result = Record<string, { interval: number; qualify: number; unqualify: number }[]>

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 })

    // The worker reaches the production database; only operators holding the
    // admin secret may drive it, and each call is bounded so `ids` cannot turn
    // into an unbounded inArray scan.
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${Resource.ADMIN_SECRET.value}`) return new Response("Unauthorized", { status: 401 })

    const parsed = (await request.json().catch(() => undefined)) as { ids?: unknown } | undefined
    const ids = parsed?.ids
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string") || ids.length > MAX_IDS)
      return new Response("Invalid request", { status: 400 })
    if (ids.length === 0) return Response.json({} satisfies Result)

    const toInterval = (date: Date) =>
      parseInt(
        date
          .toISOString()
          .replace(/[^0-9]/g, "")
          .substring(0, 12),
      )
    const now = Date.now()
    const intervals = Array.from({ length: 30 }, (_, i) => toInterval(new Date(now - i * 60 * 1000)))

    const rows = await Database.use((tx) =>
      tx
        .select()
        .from(ModelTpsRateLimitTable)
        .where(and(inArray(ModelTpsRateLimitTable.id, ids), inArray(ModelTpsRateLimitTable.interval, intervals))),
    )

    const rowsByKey = new Map(rows.map((row) => [`${row.id}:${row.interval}`, row]))
    const result: Result = Object.fromEntries(
      ids.map((id) => [
        id,
        intervals.map((interval) => {
          const row = rowsByKey.get(`${id}:${interval}`)
          return { interval, qualify: row?.qualify ?? 0, unqualify: row?.unqualify ?? 0 }
        }),
      ]),
    )
    return Response.json(result)
  },
}
