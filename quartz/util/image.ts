import { FullSlug } from "./path"
import { QuartzPluginData } from "../plugins/vfile"
import { visit } from "unist-util-visit"
import { Root, Element } from "hast"

/**
 * Extract the first image src from a page.
 * Checks frontmatter fields first (socialImage, image, cover), then walks
 * the HTML AST for the first <img> element.
 */
export function extractFirstImageSrc(page: QuartzPluginData): string | null {
  const fm = page.frontmatter as Record<string, unknown> | undefined
  if (fm?.socialImage && typeof fm.socialImage === "string") return fm.socialImage
  if (fm?.image && typeof fm.image === "string") return fm.image
  if (fm?.cover && typeof fm.cover === "string") return fm.cover

  const htmlAst = (page as Record<string, unknown>).htmlAst as Root | undefined
  if (!htmlAst) return null

  let firstSrc: string | null = null
  visit(htmlAst, "element", (node: Element) => {
    if (firstSrc) return
    if (node.tagName === "img" && typeof node.properties?.src === "string") {
      firstSrc = node.properties.src as string
    }
  })

  return firstSrc
}

/**
 * Resolve an image src (relative to a page's slug) to an absolute path
 * from the vault root. External URLs (http, https, data) are returned as-is.
 * Returns null if resolution fails.
 */
export function resolveImageToAbsolute(imageSrc: string, pageSlug: FullSlug): string | null {
  if (
    imageSrc.startsWith("http://") ||
    imageSrc.startsWith("https://") ||
    imageSrc.startsWith("data:")
  ) {
    return imageSrc
  }
  try {
    const url = new URL(imageSrc, `https://base.com/${pageSlug}`)
    return url.pathname.slice(1) // absolute path from root, no leading /
  } catch {
    return null
  }
}
