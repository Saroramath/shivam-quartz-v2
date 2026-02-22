import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/travelmap.inline"
import style from "./styles/travelMap.scss"

interface TravelMapOptions {
  /** Title shown above the map */
  title?: string
  /** Height of the map in pixels */
  height?: number
  /** Frontmatter field name for coordinates */
  coordinatesField?: string
  /** Folder slug prefix to filter pages (e.g. "Travel-and-Photography") */
  folderFilter?: string
}

const defaultOptions: TravelMapOptions = {
  title: "Places I've Been",
  height: 400,
  coordinatesField: "coordinates",
  folderFilter: undefined,
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
        return {
          title: file.frontmatter?.title ?? file.slug ?? "",
          slug: file.slug ?? "",
          lat: coords[0],
          lng: coords[1],
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
