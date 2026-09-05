import { App } from "@slack/bolt"
import { createOpencode, type ToolPart } from "@opencode-ai/sdk"

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
})

console.log("🔧 Bot configuration:")
console.log("- Bot token present:", !!process.env.SLACK_BOT_TOKEN)
console.log("- Signing secret present:", !!process.env.SLACK_SIGNING_SECRET)
console.log("- App token present:", !!process.env.SLACK_APP_TOKEN)

console.log("🚀 Starting opencode server...")
const opencode = await createOpencode({
  port: 0,
})
console.log("✅ Opencode server ready")

// ponytail: FIFO-capped session handles; the server-side sessions survive
// eviction, only the live tool-update tracking for the evicted thread is lost.
const MAX_SESSIONS = 100
const sessions = new Map<string, { client: any; server: any; sessionId: string; channel: string; thread: string }>()
function rememberSession(key: string, session: { client: any; server: any; sessionId: string; channel: string; thread: string }) {
  sessions.set(key, session)
  while (sessions.size > MAX_SESSIONS) sessions.delete(sessions.keys().next().value!)
}

// Deny-by-default once configured; unset means the bot answers anyone who can
// DM the app, which is only safe on a private workspace.
const allowedUsers = (process.env.SLACK_ALLOWED_USER_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)
if (allowedUsers.length === 0) console.warn("SLACK_ALLOWED_USER_IDS is unset: anyone who can message the bot runs prompts with tools on this host")
void (async () => {
  const events = await opencode.client.event.subscribe()
  for await (const event of events.stream) {
    if (event.type === "message.part.updated") {
      const part = event.properties.part
      if (part.type === "tool") {
        // Find the session for this tool update
        for (const [_sessionKey, session] of sessions.entries()) {
          if (session.sessionId === part.sessionID) {
            void handleToolUpdate(part, session.channel, session.thread)
            break
          }
        }
      }
    }
  }
})()

async function handleToolUpdate(part: ToolPart, channel: string, thread: string) {
  if (part.state.status !== "completed") return
  const toolMessage = `*${part.tool}* - ${part.state.title}`
  await app.client.chat
    .postMessage({
      channel,
      thread_ts: thread,
      text: toolMessage,
    })
    .catch((error) => console.error("slack tool-update post failed", error))
}

app.use(async ({ next }) => {
  await next()
})

app.message(async ({ message, say }) => {
  // User message content is PII: log only routing ids.
  console.log("📨 message event", { channel: message.channel, ts: message.ts })
  if (allowedUsers.length > 0 && !allowedUsers.includes(String((message as { user?: string }).user ?? ""))) return

  if (message.subtype || !("text" in message) || !message.text) {
    console.log("⏭️ Skipping message - no text or has subtype")
    return
  }

  console.log("✅ Processing message:", message.text)

  const channel = message.channel
  const thread = (message as any).thread_ts || message.ts
  const sessionKey = `${channel}-${thread}`

  let session = sessions.get(sessionKey)

  if (!session) {
    console.log("🆕 Creating new opencode session...")
    const { client, server } = opencode

    const createResult = await client.session.create({
      body: { title: `Slack thread ${thread}` },
    })

    if (createResult.error) {
      console.error("❌ Failed to create session:", createResult.error)
      await say({
        text: "Sorry, I had trouble creating a session. Please try again.",
        thread_ts: thread,
      })
      return
    }

    console.log("✅ Created opencode session:", createResult.data.id)

    session = { client, server, sessionId: createResult.data.id, channel, thread }
    rememberSession(sessionKey, session)

    const shareResult = await client.session.share({ path: { id: createResult.data.id } })
    if (!shareResult.error && shareResult.data) {
      const sessionUrl = shareResult.data.share?.url
      console.log("🔗 Session shared:", sessionUrl)
      await app.client.chat.postMessage({ channel, thread_ts: thread, text: sessionUrl })
    }
  }

  console.log("📝 sending to opencode", { session: session.sessionId })
  const result = await session.client.session.prompt({
    path: { id: session.sessionId },
    body: { parts: [{ type: "text", text: message.text }] },
  })

  if (result.error) console.error("opencode prompt failed", { session: session.sessionId })

  if (result.error) {
    console.error("❌ Failed to send message:", result.error)
    await say({
      text: "Sorry, I had trouble processing your message. Please try again.",
      thread_ts: thread,
    })
    return
  }

  const response = result.data

  // Build response text
  const responseText =
    response.info?.content ||
    response.parts
      ?.filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("\n") ||
    "I received your message but didn't have a response."

  // Send main response (tool updates will come via live events)
  await say({ text: responseText, thread_ts: thread })
})

app.command("/test", async ({ command, ack, say }) => {
  await ack()
  console.log("🧪 test command", { channel: command.channel_id })
  await say("🤖 Bot is working! I can hear you loud and clear.")
})

await app.start()
console.log("⚡️ Slack bot is running!")
