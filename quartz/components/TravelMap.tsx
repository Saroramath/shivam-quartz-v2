import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative, FullSlug } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { visit } from "unist-util-visit"
import { Root, Element } from "hast"
// @ts-ignore
import script from "./scripts/travelmap.inline"
import style from "./styles/travelMap.scss"

interface TravelMapOptions {
  /** Title shown above the map */
  title?: string
  /** Height of the map in pixels */
  height?: number
  /** Folder slug prefix to filter pages (e.g. "Travel-and-Photography") */
  folderFilter?: string
}

const defaultOptions: TravelMapOptions = {
  title: "Places I've Been",
  height: 400,
  folderFilter: undefined,
}

function extractFirstImageSrc(page: QuartzPluginData): string | null {
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

function resolveImageToAbsolute(imageSrc: string, pageSlug: FullSlug): string | null {
  if (imageSrc.startsWith("http://") || imageSrc.startsWith("https://") || imageSrc.startsWith("data:")) {
    return imageSrc
  }
  try {
    const url = new URL(imageSrc, `https://base.com/${pageSlug}`)
    return url.pathname.slice(1) // absolute path from root
  } catch {
    return null
  }
}

export default ((userOpts?: Partial<TravelMapOptions>) => {
  const opts = { ...defaultOptions, ...userOpts }

  const TravelMap: QuartzComponent = (props: QuartzComponentProps) => {
    const { allFiles, fileData } = props

    // Collect pages with coordinates
    const locations = allFiles
      .filter((file) => {
        const fm = file.frontmatter as Record<string, unknown> | undefined
        if (!fm?.coordinates) return false
        const coords = fm.coordinates as number[]
        if (!Array.isArray(coords) || coords.length !== 2) return false
        if (opts.folderFilter && !file.slug?.startsWith(opts.folderFilter)) return false
        return true
      })
      .map((file) => {
        const fm = file.frontmatter as Record<string, unknown>
        const coords = fm.coordinates as number[]
        const rawImg = extractFirstImageSrc(file)
        const image = rawImg && file.slug ? resolveImageToAbsolute(rawImg, file.slug as FullSlug) : null
        const date = (fm.Date as string) ?? null
        return {
          title: file.frontmatter?.title ?? file.slug ?? "",
          slug: file.slug ?? "",
          lat: coords[0],
          lng: coords[1],
          image,
          date,
        }
      })

    if (locations.length === 0) return null

    return (
      <div class="travel-map-container">
        {opts.title && <h3 class="travel-map-title">{opts.title}</h3>}
        <div
          id="travel-map"
          data-locations={JSON.stringify(locations)}
          data-base={fileData.slug!}
          style={`height: ${opts.height}px;`}
        />
      </div>
    )
  }

  TravelMap.css = style
  TravelMap.afterDOMLoaded = script

  return TravelMap
}) satisfies QuartzComponentConstructor
