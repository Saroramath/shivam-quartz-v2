import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

import style from "../styles/listPage.scss"
import { PageList, SortFn } from "../PageList"
import { GalleryList } from "../GalleryList"
import { Root } from "hast"
import { htmlToJsx } from "../../util/jsx"
import { i18n } from "../../i18n"
import { QuartzPluginData } from "../../plugins/vfile"
import { ComponentChildren } from "preact"
import { concatenateResources } from "../../util/resources"
import { trieFromAllFiles } from "../../util/ctx"

interface FolderContentOptions {
  /**
   * Whether to display number of folders
   */
  showFolderCount: boolean
  showSubfolders: boolean
  sort?: SortFn
}

const defaultOptions: FolderContentOptions = {
  showFolderCount: true,
  showSubfolders: true,
}

export default ((opts?: Partial<FolderContentOptions>) => {
  const options: FolderContentOptions = { ...defaultOptions, ...opts }

  const FolderContent: QuartzComponent = (props: QuartzComponentProps) => {
    const { tree, fileData, allFiles, cfg } = props

    const trie = (props.ctx.trie ??= trieFromAllFiles(allFiles))
    const folder = trie.findNode(fileData.slug!.split("/"))
    if (!folder) {
      return null
    }

    const allPagesInFolder: QuartzPluginData[] =
      folder.children
        .map((node) => {
          // regular file, proceed
          if (node.data) {
            return node.data
          }

          if (node.isFolder && options.showSubfolders) {
            // folders that dont have data need synthetic files
            const getMostRecentDates = (): QuartzPluginData["dates"] => {
              let maybeDates: QuartzPluginData["dates"] | undefined = undefined
              for (const child of node.children) {
                if (child.data?.dates) {
                  // compare all dates and assign to maybeDates if its more recent or its not set
                  if (!maybeDates) {
                    maybeDates = { ...child.data.dates }
                  } else {
                    if (child.data.dates.created > maybeDates.created) {
                      maybeDates.created = child.data.dates.created
                    }

                    if (child.data.dates.modified > maybeDates.modified) {
                      maybeDates.modified = child.data.dates.modified
                    }

                    if (child.data.dates.published > maybeDates.published) {
                      maybeDates.published = child.data.dates.published
                    }
                  }
                }
              }
              return (
                maybeDates ?? {
                  created: new Date(),
                  modified: new Date(),
                  published: new Date(),
                }
              )
            }

            return {
              slug: node.slug,
              dates: getMostRecentDates(),
              frontmatter: {
                title: node.displayName,
                tags: [],
              },
            }
          }
        })
        .filter((page) => page !== undefined) ?? []
    const cssClasses: string[] = fileData.frontmatter?.cssclasses ?? []
    const classes = cssClasses.join(" ")
    const isGallery = cssClasses.includes("gallery")
    const listProps = {
      ...props,
      sort: options.sort,
      allFiles: allPagesInFolder,
    }

    const hasContent = (tree as Root).children.length > 0
    const content = (
      !hasContent
        ? fileData.description
        : htmlToJsx(fileData.filePath!, tree)
    ) as ComponentChildren

    // Hide the auto-listing when the page has its own content,
    // unless it's a gallery page (which needs the gallery grid).
    const showListing = !hasContent || isGallery

    // Render inline gallery grids for sub-folders listed in frontmatter
    const inlineGalleryNames: string[] =
      (fileData.frontmatter as Record<string, unknown>)?.inlineGalleries as string[] ?? []
    const inlineGalleries = inlineGalleryNames
      .map((name) => {
        const subFolder = folder.children.find(
          (node) => node.isFolder && node.displayName.toLowerCase() === name.toLowerCase(),
        )
        if (!subFolder) return null
        return {
          title: subFolder.data?.frontmatter?.title ?? subFolder.displayName,
          pages: subFolder.children
            .filter((child) => child.data !== null)
            .map((child) => child.data!) as QuartzPluginData[],
        }
      })
      .filter((g) => g !== null)

    return (
      <div class="popover-hint">
        <article class={classes}>{content}</article>
        {showListing && (
          <div class="page-listing">
            {options.showFolderCount && (
              <p>
                {i18n(cfg.locale).pages.folderContent.itemsUnderFolder({
                  count: allPagesInFolder.length,
                })}
              </p>
            )}
            <div>
              {isGallery ? <GalleryList {...listProps} /> : <PageList {...listProps} />}
            </div>
          </div>
        )}
        {inlineGalleries.map((gallery) => (
          <div class="page-listing">
            <h4>{gallery.title}</h4>
            <div>
              <GalleryList {...props} sort={options.sort} allFiles={gallery.pages} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  FolderContent.css = concatenateResources(style, PageList.css, GalleryList.css)
  return FolderContent
}) satisfies QuartzComponentConstructor
