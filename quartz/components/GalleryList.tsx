import { resolveRelative, FullSlug } from "../util/path"
import { extractFirstImageSrc, resolveImageToAbsolute } from "../util/image"
import { QuartzComponent, QuartzComponentProps } from "./types"
import { SortFn, byDateAndAlphabetical } from "./PageList"

type Props = {
  limit?: number
  sort?: SortFn
} & QuartzComponentProps

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
        let imageSrc: string | null = null
        if (rawSrc && page.slug) {
          const abs = resolveImageToAbsolute(rawSrc, page.slug)
          imageSrc = abs ? resolveRelative(fileData.slug!, abs as FullSlug) : null
        }

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
