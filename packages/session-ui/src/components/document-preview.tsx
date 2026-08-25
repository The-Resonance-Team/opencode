import { Dialog as Kobalte } from "@kobalte/core/dialog"
import { renderAsync } from "docx-preview"
import { createSignal, onCleanup, onMount, Show, type JSX } from "solid-js"
import { useI18n } from "@opencode-ai/ui/context/i18n"
import { FileIcon } from "@opencode-ai/ui/file-icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Markdown } from "./markdown"

export type DocumentKind = "pdf" | "docx" | "markdown" | "fallback"

export interface DocumentPreviewProps {
  filename: string
  kind: DocumentKind
  url: string
  sourceLabel?: string
  actions?: JSX.Element
  children?: JSX.Element
}

export function DocumentPreview(props: DocumentPreviewProps) {
  const i18n = useI18n()
  return (
    <div data-component="document-preview" class="fixed inset-0 z-50 flex items-center justify-center">
      <div
        data-slot="document-preview-container"
        class="relative z-50 flex h-[min(90vh,calc(100vh-32px))] w-[min(90vw,calc(100vw-32px))] max-w-[1200px] flex-col"
      >
        <Kobalte.Content
          data-slot="document-preview-content"
          class="flex h-full w-full flex-col overflow-hidden rounded-lg bg-background-stronger shadow-2xl"
        >
          <div
            data-slot="document-preview-header"
            class="flex flex-shrink-0 items-center justify-between gap-2 border-b border-border-weak-base p-2"
          >
            <div data-slot="document-preview-title" class="flex min-w-0 items-center gap-2">
              <span data-slot="document-preview-filename" class="truncate text-14-semibold text-text-strong">
                {props.filename}
              </span>
              <Show when={props.sourceLabel}>
                <span
                  data-slot="document-preview-source"
                  class="shrink-0 rounded-full bg-background-weak px-2 py-0.5 text-12-regular text-text-weak"
                >
                  {props.sourceLabel}
                </span>
              </Show>
            </div>
            <div data-slot="document-preview-actions" class="flex shrink-0 items-center gap-1">
              <Show when={props.actions}>{props.actions}</Show>
              <Kobalte.CloseButton
                data-slot="document-preview-close"
                as={IconButton}
                icon="close"
                variant="ghost"
                aria-label={i18n.t("ui.common.close")}
              />
            </div>
          </div>
          <div data-slot="document-preview-body" class="flex min-h-0 flex-1">
            <Show
              when={props.children}
              fallback={<DocumentBody kind={props.kind} url={props.url} filename={props.filename} />}
            >
              {props.children}
            </Show>
          </div>
        </Kobalte.Content>
      </div>
    </div>
  )
}

export function DocumentBody(props: { kind: DocumentKind; url: string; filename: string }) {
  if (props.kind === "pdf") return <PdfBody url={props.url} />
  if (props.kind === "docx") return <DocxBody url={props.url} />
  if (props.kind === "markdown") return <MarkdownBody url={props.url} />
  return <FallbackBody filename={props.filename} />
}

function PdfBody(props: { url: string }) {
  const [src, setSrc] = createSignal(props.url)
  let blobUrl: string | undefined
  let disposed = false
  onCleanup(() => {
    disposed = true
    if (blobUrl) URL.revokeObjectURL(blobUrl)
  })
  onMount(() => {
    if (!props.url.startsWith("data:")) return
    fetch(props.url)
      .then((res) => res.blob())
      .then((blob) => {
        if (disposed) return
        blobUrl = URL.createObjectURL(blob)
        setSrc(blobUrl)
      })
      .catch(() => {
        // ponytail: on fetch failure keep the data: URL; Chromium's iframe can render data: PDFs directly
      })
  })
  return <iframe data-slot="document-preview-pdf" class="h-full w-full border-0" src={src()} title="PDF preview" />
}

function DocxBody(props: { url: string }) {
  const [target, setTarget] = createSignal<HTMLDivElement>()
  onMount(() => {
    fetch(props.url)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        const el = target()
        return el ? renderAsync({ arrayBuffer: buffer }, el) : undefined
      })
      .catch((error) => console.error("Document preview failed", error))
  })
  return <div data-slot="document-preview-docx" class="h-full w-full overflow-auto bg-white p-4" ref={setTarget} />
}

function MarkdownBody(props: { url: string }) {
  const [text, setText] = createSignal("")
  onMount(() => {
    fetch(props.url)
      .then((res) => res.text())
      .then(setText)
      .catch((error) => console.error("Document preview failed", error))
  })
  return (
    <Show when={text()}>
      <Markdown text={text()} data-slot="document-preview-markdown" class="h-full w-full overflow-auto p-4" />
    </Show>
  )
}

function FallbackBody(props: { filename: string }) {
  const i18n = useI18n()
  return (
    <div
      data-slot="document-preview-fallback"
      class="flex h-full flex-1 flex-col items-center justify-center gap-3 text-center"
    >
      <FileIcon node={{ path: props.filename, type: "file" }} class="h-12 w-12 text-text-weak" />
      <p class="text-14-regular text-text-weak">{i18n.t("ui.documentPreview.fallback")}</p>
    </div>
  )
}
