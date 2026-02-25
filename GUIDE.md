# Quartz Site Guide

How to create pages, add images, and manage this Quartz website using Obsidian.

## Adding Images

Obsidian is configured to store pasted/dragged images in the `assets/` folder automatically (set in `.obsidian/app.json`).

**To add an image to any page**: drag and drop (or paste) the image into your note in Obsidian. That's it. Obsidian will:
1. Copy the image to `content/assets/`
2. Insert `![[filename.jpg]]` into your note

The image will display on the page and also be used as the gallery card thumbnail if the page is inside a gallery section.

**Moving images**: always move files within Obsidian (not Finder/file explorer). Obsidian automatically updates all `![[]]` references when you move a file.

### Gallery card image priority

When a page appears in a gallery grid, the card image is chosen from:

1. `image` frontmatter field (path relative to the page's folder)
2. First image in the page content (`![[...]]` embeds or `![](...)` markdown)

So the simplest way to set a gallery card image is to just have an image in your page.

### Book covers (special case)

Book pages use a dedicated `covers/` folder and an `image` frontmatter field:

```yaml
---
title: The Alchemist
image: covers/The_Alchemist.jpg
---

![cover](My%20Library/Books/covers/The_Alchemist.jpg)
```

The `image` field is relative to the page's folder. The inline `![cover](...)` path is relative to the vault root (with spaces URL-encoded as `%20`). Both are needed: `image` provides the gallery card thumbnail, the inline image displays on the page itself.

## Creating a New Page

Create a markdown file (`.md`) inside `content/`. The file's location determines its URL:

| File path | URL |
|---|---|
| `content/About Me/index.md` | `/About-Me/` |
| `content/My Library/Books/The Alchemist.md` | `/My-Library/Books/The-Alchemist` |

Every page needs frontmatter at the top:

```yaml
---
title: My Page Title
---

Your content here.
```

## Creating a Section (Folder)

To create a section that lists its child pages:

1. Create a folder inside `content/`, e.g. `content/Recipes/`
2. Add an `index.md` inside it:

```yaml
---
title: Recipes
---
```

This automatically shows a list of all pages inside that folder.

## Gallery View

Any folder can display its children as image cards instead of a list. Two things are needed:

1. The folder's `index.md` has `cssclasses: [gallery]` in frontmatter
2. The folder has child pages (`.md` files) or subfolders

```yaml
---
title: Mathematics
cssclasses:
  - gallery
---
```

Every child page that has an image will appear as a card with its image. Pages without images show a placeholder with the first letter of the title.

### What counts as a "child"

- **Pages**: any `.md` file directly in the folder (e.g. `Mathematics/Hyperbolic Groups.md`)
- **Subfolders**: a subfolder with its own `index.md` (e.g. `Mathematics/Algebra/index.md`) also appears as a card

### Example: adding gallery pages to Mathematics

In Obsidian, create new notes inside the Mathematics folder:

```
content/Mathematics/
├── index.md                    # has cssclasses: [gallery]
├── Hyperbolic Groups.md        # appears as gallery card
├── Category Theory.md          # appears as gallery card
└── Topology/
    ├── index.md                # subfolder also appears as card
    └── Knot Theory.md
```

Each page just needs content. Drag an image into the note and it becomes the card thumbnail automatically. No extra configuration needed.

### Inline sub-galleries

A gallery page can also render sub-folder galleries inline using the `inlineGalleries` frontmatter field:

```yaml
---
title: My Library
cssclasses:
  - gallery
inlineGalleries:
  - Books
  - Movies
---
```

This renders the Books and Movies sub-folder contents as separate gallery grids on the same page, each with a heading.

## Travel Pages

Travel pages support two special frontmatter fields for the interactive map:

```yaml
---
title: Shimla
date: 2024-01-15
coordinates: [31.1042, 77.171]
---

![[my-photo.jpg]]
```

- `coordinates: [latitude, longitude]` places a pin on the homepage map
- `date` is shown in the map hover preview
- The first image in the page appears in the map hover preview

## Frontmatter Reference

### Common fields (all pages)

| Field | Purpose | Example |
|---|---|---|
| `title` | Page title | `title: The Alchemist` |
| `cssclasses` | CSS classes (`gallery` for card view) | `cssclasses: [gallery]` |
| `image` | Image for gallery card (relative to page folder) | `image: covers/book.jpg` |
| `tags` | Tags for the page | `tags: [fiction, favorite]` |
| `draft` | Hide from published site | `draft: true` |

### Travel fields

| Field | Purpose | Example |
|---|---|---|
| `coordinates` | Map pin location `[lat, lng]` | `coordinates: [31.1042, 77.171]` |
| `date` | Travel date | `date: 2024-01-15` |

### Book fields

| Field | Purpose | Example |
|---|---|---|
| `Primary Author` | Author name | `Primary Author: Borges, Jorge Luis` |
| `Status` | Reading status | `Status: [Finished]` |
| `Favorite` | Mark as favorite | `Favorite: true` |

## Site Structure

```
content/
├── index.md                          # Homepage (gallery of sections)
├── assets/                           # All images (Obsidian auto-stores here)
├── About Me/
│   └── index.md
├── AI Safety and Ethics/
│   └── index.md
├── Mathematics/
│   └── index.md
├── My Library/
│   ├── index.md                      # Gallery of Books, Movies, Short Stories
│   ├── Books/
│   │   ├── index.md                  # Gallery of all books
│   │   ├── covers/                   # Book cover images
│   │   └── [book pages].md
│   ├── Movies/
│   │   └── index.md
│   └── Short Stories/
│       └── index.md
├── Publications/
│   └── index.md
└── Travel and Photography/
    ├── index.md                      # Gallery of travel pages
    └── [travel pages].md
```

## Building and Deploying

```bash
# Local preview
npx quartz build --serve

# Build for production
npx quartz build
```

The site auto-deploys to GitHub Pages on push to `main`.
