import { resolveRelative, FullSlug } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { QuartzComponent, QuartzComponentProps } from "./types"
import { SortFn, byDateAndAlphabetical } from "./PageList"
import { visit } from "unist-util-visit"
import { Root, Element } from "hast"

type Props = {
  limit?: number
  sort?: SortFn
} & QuartzComponentProps

function extractFirstImageSrc(page: QuartzPluginData): string | null {
  // Check frontmatter fields first
  const fm = page.frontmatter as Record<string, unknown> | undefined
  if (fm?.socialImage && typeof fm.socialImage === "string") return fm.socialImage
  if (fm?.image && typeof fm.image === "string") return fm.image
  if (fm?.cover && typeof fm.cover === "string") return fm.cover

  // Walk the HTML AST to find the first <img> element
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

function resolveImageForFolder(
  imageSrc: string,
  pageSlug: FullSlug,
  folderSlug: FullSlug,
): string {
  // External URL — use as-is
  if (imageSrc.startsWith("http://") || imageSrc.startsWith("https://") || imageSrc.startsWith("data:")) {
    return imageSrc
  }

  // The src is relative to the page's location (set by CrawlLinks transformer).
  // Resolve it to an absolute path using URL resolution, then make it relative to the folder page.
  try {
    const url = new URL(imageSrc, `https://base.com/${pageSlug}`)
    const absolutePath = url.pathname.slice(1) // remove leading /
    return resolveRelative(folderSlug, absolutePath as FullSlug)
  } catch {
    return imageSrc
  }
}

export const GalleryList: QuartzComponent = ({ cfg, fileData, allFiles, limit, sort }: Props) => {
  const sorter = sort ?? byDateAndAlphabetical(cfg)
  let list = allFiles.sort(sorter)
  if (limit) {
    list = list.slice(0, limit)
  }

  return (
    <div class="gallery-grid">
      {list.map((page) => {
        const title = page.frontmatter?.title
        const href = resolveRelative(fileData.slug!, page.slug!)
        const rawSrc = extractFirstImageSrc(page)
        const imageSrc =
          rawSrc && page.slug
            ? resolveImageForFolder(rawSrc, page.slug, fileData.slug!)
            : null

        return (
          <a href={href} class="gallery-card internal">
            <div class="gallery-card-image">
              {imageSrc ? (
                <img src={imageSrc} alt={title ?? ""} loading="lazy" />
              ) : (
                <div class="gallery-card-placeholder">
                  <span>{title?.[0] ?? "?"}</span>
                </div>
              )}
            </div>
            <div class="gallery-card-title">
              <span>{title}</span>
            </div>
          </a>
        )
      })}
    </div>
  )
}

GalleryList.css = `
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.gallery-card {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--lightgray);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  text-decoration: none;
  display: flex;
  flex-direction: column;
}

.gallery-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.gallery-card-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--lightgray);
}

.gallery-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-card-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: var(--gray);
  background: var(--lightgray);
}

.gallery-card-title {
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--darkgray);
}

@media (max-width: 600px) {
  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.5rem;
  }
}
`
