# Quartz Site Guide

How to create pages, set up gallery views, and manage images for this Quartz website.

## Creating a New Page

Create a markdown file (`.md`) anywhere inside the `content/` folder. The file's location determines its URL:

| File path | URL |
|---|---|
| `content/About Me/index.md` | `/About-Me/` |
| `content/My Library/Books/The Alchemist.md` | `/My-Library/Books/The-Alchemist` |

Every page needs **frontmatter** at the top (between `---` lines). At minimum:

```yaml
---
title: My Page Title
---

Your content here.
```

## Creating a New Section (Folder)

To create a section that lists its child pages:

1. Create a folder inside `content/`, e.g. `content/Recipes/`
2. Create an `index.md` inside it:

```yaml
---
title: Recipes
---
```

This will automatically show a list of all pages inside `content/Recipes/`.

## Gallery View

To show pages as image cards instead of a text list, add `cssclasses: [gallery]` to the folder's `index.md`:

```yaml
---
title: My Library
cssclasses:
  - gallery
---
```

That's it. Every child page that has an image will appear as a card with its image.

### How gallery cards find images

The gallery checks these sources **in order** and uses the first one it finds:

1. `socialImage` frontmatter field
2. `image` frontmatter field
3. `cover` frontmatter field
4. First `![](...)` image in the page content

So the simplest way to give a page a gallery card image is to add an `image` field to its frontmatter, or just put an image in the page body.

## Adding Images

### Option 1: Frontmatter image (for gallery cards)

Store the image file near the page and reference it with a **relative path** from the page:

```
content/
  My Library/
    Books/
      covers/
        The_Alchemist.jpg
      The Alchemist.md
      index.md
```

In `The Alchemist.md`:

```yaml
---
title: The Alchemist
image: covers/The_Alchemist.jpg
---
```

The `image` field path is **relative to the page's folder**. Since `The Alchemist.md` is in `Books/`, the path `covers/The_Alchemist.jpg` means `Books/covers/The_Alchemist.jpg`.

### Option 2: Inline image (shows on the page itself)

Use standard markdown image syntax. The path should be relative to the **vault root** (`content/`), with spaces URL-encoded as `%20`:

```markdown
![cover](My%20Library/Books/covers/The_Alchemist.jpg)
```

### Option 3: Obsidian embed syntax

For images stored anywhere in the vault, use Obsidian's wiki-link syntax:

```markdown
![[my-photo.jpg]]
```

Quartz resolves these automatically.

### Where to store images

Keep images close to the pages that use them:

| Content type | Image location | Example |
|---|---|---|
| Book covers | `content/My Library/Books/covers/` | `covers/The_Alchemist.jpg` |
| Travel photos | Same folder as the travel page | `![[photo.jpg]]` |
| Section covers | Same folder as `index.md` | `image: cover.jpg` |

## Frontmatter Fields Reference

### Common fields (all pages)

| Field | Purpose | Example |
|---|---|---|
| `title` | Page title | `title: The Alchemist` |
| `cssclasses` | CSS classes (use `gallery` for card view) | `cssclasses: [gallery]` |
| `image` | Image for gallery card | `image: covers/book.jpg` |
| `tags` | Tags for the page | `tags: [fiction, favorite]` |
| `draft` | Hide from published site | `draft: true` |

### Book-specific fields

| Field | Purpose | Example |
|---|---|---|
| `Primary Author` | Author name | `Primary Author: Borges, Jorge Luis` |
| `Status` | Reading status | `Status: [Finished]` |
| `Favorite` | Mark as favorite | `Favorite: true` |

## Example: Adding a New Book

1. Create `content/My Library/Books/My New Book.md`:

```yaml
---
title: My New Book
image: covers/My_New_Book.jpg
Primary Author: Author Name
Status:
  - Reading
Favorite: false
---

![cover](My%20Library/Books/covers/My_New_Book.jpg)
```

2. Put the cover image at `content/My Library/Books/covers/My_New_Book.jpg`

The book will appear in the Books gallery with its cover, and the cover will also display on the book's own page.

## Example: Adding a New Section

Say you want a "Podcasts" section under My Library:

1. Create `content/My Library/Podcasts/index.md`:

```yaml
---
title: Podcasts
cssclasses:
  - gallery
---
```

2. Add pages inside it, e.g. `content/My Library/Podcasts/My Favorite Podcast.md`:

```yaml
---
title: My Favorite Podcast
image: covers/podcast_cover.jpg
---

Notes about this podcast...
```

3. Put the cover at `content/My Library/Podcasts/covers/podcast_cover.jpg`

## Site Structure

```
content/
├── index.md                          # Homepage (gallery of sections)
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
