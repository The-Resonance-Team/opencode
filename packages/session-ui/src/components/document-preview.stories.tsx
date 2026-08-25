// @ts-nocheck
import { onMount } from "solid-js"
import * as mod from "./document-preview"
import { Button } from "@opencode-ai/ui/button"
import { useDialog } from "@opencode-ai/ui/context/dialog"

const PDF_URL =
  "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCA0OSA+PgpzdHJlYW0KQlQgL0YxIDI0IFRmIDcyIDcxMiBUZCAoSGVsbG8sIFBERiBwcmV2aWV3KSBUaiBFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyNDEgMDAwMDAgbiAKMDAwMDAwMDM0MCAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjQxMAolJUVPRgo="
const DOCX_URL =
  "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBBQAAAAIAOGVGV3JTxqw6wAAAK4BAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH1QvU7DMBDeeQrLK4odGBBCSTrwMwJDeYCTfUks7LPlc0v79jht6YAK4933q69b7YIXW8zsIvXyRrVSIJloHU29/Fi/NPdScAGy4CNhL/fIcjVcdet9QhZVTNzLuZT0oDWbGQOwigmpImPMAUo986QTmE+YUN+27Z02kQpSacriIYfuCUfY+CKed/V9LJLRsxSPR+KS1UtIyTsDpeJ6S/ZXSnNKUFV54PDsEl9XgtQXExbk74CT7q0uk51F8Q65vEKoLP0Vs9U2mk2oSvW/zYWecRydwbN+cUs5GmSukwevzkgARz/99WHu4RtQSwMEFAAAAAgA4ZUZXbmBRHGwAAAAKgEAAAsAAABfcmVscy8ucmVsc43POw7CMAwG4J1TRN5pWgaEUJMuCKkrKgeIEjeNaB5KwqO3JwMDIAZG278/y233sDO5YUzGOwZNVQNBJ70yTjM4D8f1DkjKwikxe4cMFkzQ8VV7wlnkspMmExIpiEsMppzDntIkJ7QiVT6gK5PRRytyKaOmQciL0Eg3db2l8d0A/mGSXjGIvWqADEvAf2w/jkbiwcurRZd/nPhKFFlEjZnB3UdF1atdFRYob+nHi/wJUEsDBBQAAAAIAOGVGV3NS1IieAAAAI0AAAAcAAAAd29yZC9fcmVscy9kb2N1bWVudC54bWwucmVsc02MMQ4CIRAAe19BtvdAC2PMcdf5AKMP2HArEGEhLDH6eyktJ5OZef3kpN7UJBa2cJgMKGJXtsjewuN+3Z9BSUfeMBUmC18SWJfdfKOEfTQSYhU1JiwWQu/1orW4QBllKpV4mGdpGfvA5nVF90JP+mjMSbf/B+jlB1BLAwQUAAAACADhlRldcb3nHd4AAABMAQAAEQAAAHdvcmQvZG9jdW1lbnQueG1tbZDNTsQwDITvPEXkM9sUDghVbfeGOCIBDxASb9tVEkdOaLZvT7Ll58JlLMuj+UbujxdnxYocF/ID3DUtCPSazOKnAd7fng6PIGJS3ihLHgfYMMJxvOlzZ0h/OvRJlAQfuzzAnFLopIx6RqdiQwF9uZ2InUpl5UlmYhOYNMZYAM7K+7Z9kE4tHsYS+UFmqzNU4SppfEZrSZyYnEgzikK9HALjumAuxYi3XlZbVb5q+E0IL9eMsxa5W5UdQJe6yCB33379xryiJm9EUKwmVmG+FbsZTfMPQP50lX9/GL8AUEsBAhQDFAAAAAgA4ZUZXclPGrDrAAAArgEAABMAAAAAAAAAAAAAAIABAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAMUAAAACADhlRlduYFEcbAAAAAqAQAACwAAAAAAAAAAAAAAgAEcAQAAX3JlbHMvLnJlbHNQSwECFAMUAAAACADhlRldzUtSIngAAACNAAAAHAAAAAAAAAAAAAAAgAH1AQAAd29yZC9fcmVscy9kb2N1bWVudC54bWwucmVsc1BLAQIUAxQAAAAIAOGVGV1xvecd3gAAAEwBAAARAAAAAAAAAAAAAACAAacCAAB3b3JkL2RvY3VtZW50LnhtbFBLBQYAAAAABAAEAAMBAAC0AwAAAAA="
const MARKDOWN_URL =
  "data:text/markdown;base64,IyBEcmFmdAoKVGhpcyBpcyBhICoqZHJhZnQqKiBtYXJrZG93biBkb2N1bWVudCB3aXRoIGEgbGlzdDoKCi0gYnVsbGV0IG9uZQotIGJ1bGxldCB0d28KCkFuZCBzb21lIGBpbmxpbmUgY29kZWAgcGx1cyBhIFtsaW5rXShodHRwczovL2V4YW1wbGUuY29tKS4K"

function Open(props: {
  kind: "pdf" | "docx" | "markdown" | "fallback"
  filename: string
  url: string
  sourceLabel?: string
}) {
  const dialog = useDialog()
  const open = () =>
    dialog.show(() => (
      <mod.DocumentPreview
        filename={props.filename}
        kind={props.kind}
        url={props.url}
        sourceLabel={props.sourceLabel}
        actions={<Button variant="ghost">Download</Button>}
      />
    ))
  onMount(open)
  return (
    <Button variant="secondary" onClick={open}>
      Open {props.kind} preview
    </Button>
  )
}

export default {
  title: "UI/DocumentPreview",
  id: "components-document-preview",
  component: mod.DocumentPreview,
  tags: ["autodocs"],
}

export const Pdf = () => <Open kind="pdf" filename="report.pdf" url={PDF_URL} sourceLabel="file" />
export const Docx = () => <Open kind="docx" filename="notes.docx" url={DOCX_URL} sourceLabel="file" />
export const Markdown = () => <Open kind="markdown" filename="draft.md" url={MARKDOWN_URL} sourceLabel="draft" />
export const Fallback = () => <Open kind="fallback" filename="data.xlsx" url="" />
