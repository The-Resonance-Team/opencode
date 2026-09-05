import { FileSystem } from "@opencode-ai/core/filesystem"
import { RelativePath } from "@opencode-ai/core/schema"
import { Effect } from "effect"
import { HttpServerResponse } from "effect/unstable/http"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Api } from "../api"
import { response } from "../location"

// Must match the fs.read wildcard route in packages/protocol/src/groups/fs.ts.
const FS_READ_PREFIX = "/api/fs/read/"

export const FileSystemHandler = HttpApiBuilder.group(Api, "server.fs", (handlers) =>
  Effect.gen(function* () {
    return handlers
      .handleRaw("fs.read", (ctx) =>
        Effect.gen(function* () {
          // Wildcard route /api/fs/read/*: strip the route prefix, decode once
          // (URL pathname keeps percent-encoded segments). Traversal beyond the
          // location root is refused by FileSystem.resolve's contains+realpath guard.
          const pathname = new URL(ctx.request.url, "http://localhost").pathname
          if (!pathname.startsWith(FS_READ_PREFIX)) return HttpServerResponse.text("Not found", { status: 404 })
          const file = yield* (yield* FileSystem.Service).read({
            path: RelativePath.make(decodeURIComponent(pathname.slice(FS_READ_PREFIX.length))),
          })
          return HttpServerResponse.uint8Array(file.content, { contentType: file.mime })
        }),
      )
      .handle("fs.list", (ctx) =>
        response(
          Effect.gen(function* () {
            const fs = yield* FileSystem.Service
            return yield* fs.list(ctx.query)
          }),
        ),
      )
      .handle("fs.find", (ctx) =>
        response(
          Effect.gen(function* () {
            const fs = yield* FileSystem.Service
            return yield* fs.find(ctx.query)
          }),
        ),
      )
  }),
)
