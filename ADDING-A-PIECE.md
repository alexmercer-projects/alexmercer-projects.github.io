# Adding a piece

Every piece on the site comes from one entry in `pieces.json` plus one folder in `pieces/`. The homepage grid, the filter chips and their counts, the project page, the sitemap and the previous/next links are all generated from those two things. You never edit HTML by hand.

## The short version

1. Put the project folder in `pieces/`, for example `pieces/maple-street-menu/`.
2. Add a `cover.webp` to that folder (see "The cover image" below).
3. Copy an existing entry in `pieces.json`, paste it where you want the piece to appear, and change the fields. The array order is the display order, both in All and inside each category filter.
4. Run `node build.mjs`.
5. Open `dist/index.html` through a local server (see README.md) and check the card and the project page.

If something is missing or misspelled, the build stops and tells you which piece and which file.

## A folder looks like this

```
pieces/maple-street-menu/
  cover.webp            required, 1200 x 900
  README.md             optional; its "## Key features" list becomes "What's in it"
  demo/                 optional; a self-contained page or site (index.html inside)
  samples/              optional; files people can download or read
  screenshots/          optional; images for the "A closer look" gallery
```

Folder names do not have to match the id, but keeping them the same makes life easier.

## The fields

All file paths are relative to `pieces/`, so they start with the folder name.

### Required

| Field | What it is | Example |
|---|---|---|
| `id` | The page address: `/work/<id>/`. Lowercase letters, numbers and dashes only. Must be unique. | `"maple-street-menu"` |
| `title` | The full title on the project page. | `"Maple Street Diner: a one-page menu site"` |
| `short` | The short title on the homepage card. | `"Diner menu site"` |
| `category` | Drives the filter chips. Use one of the existing ones (Website, WordPress, Writing, Technical writing, Ads, Spreadsheet, SEO, VA, Automation) or a new one. | `"Website"` |
| `label` | The honesty label. Use `"Concept demo"` for anything made for a made-up business, and `"Spec sample"` for unpublished writing. | `"Concept demo"` |
| `folder` | The folder name inside `pieces/`. | `"maple-street-menu"` |
| `summary` | Two or three plain sentences, in first person where it fits. Shown on the project page and used as the page description. | |
| `cover` | The card image. | `"maple-street-menu/cover.webp"` |

### Usually filled in

| Field | What it is |
|---|---|
| `year` | Shown on the card and project page. |
| `coverAlt` | Describe what the image shows, as you would to someone who cannot see it. |
| `demo` | The page to open, usually `"<folder>/demo/index.html"`. The whole `demo/` folder is copied with it. |
| `demoLabel` | Button text for the demo. Defaults to "Open the demo". |
| `downloads` | A list of files people can download, for example `["maple-street-menu/samples/menu.pdf"]`. File sizes are worked out for you. To set the button text, use `{ "file": "...", "label": "Download the menu PDF" }` instead of a plain path. |
| `gallery` | A list of `{ "src": "...", "alt": "..." }` images for "A closer look". |

### Optional

| Field | What it does |
|---|---|
| `reading` | A Markdown file that gets typeset on the project page, so people can read a writing sample without downloading it. |
| `readingTitle` | Heading above that reading section. |
| `features` | A list of short lines for "What's in it". Overrides the README's "Key features" list. |
| `snippets` | Code or output to show on the page: `{ "file": "...", "lines": [1, 30], "caption": "..." }`. `lines` is optional. |
| `extraLinks` | More buttons next to the demo button: `{ "label": "Before site", "href": "<folder>/demo/before/index.html" }`. |
| `galleryStyle` | `"ads"` for tall ad images, `"pages"` for document pages. Leave it out for screenshots. |
| `labelNote` | Replaces the standard honesty note under the buttons, when the standard one does not fit the piece. |
| `featured` | Optional, and currently unused. Set `true` on at most one piece to show it large above the grid as "Fig. 1". If no piece is featured, the homepage has no featured block and every piece appears in the grid, including in All. Needs `coverWide`, `featuredTitle` and `featuredLine`. |
| `coverWide` | A 1600 x 1000 image for the featured slot, only needed if that piece is featured. |
| `coverPhone` | Optional, featured piece only: a 780 x 940 phone screenshot shown in the featured slot on small screens. |
| `featuredTitle`, `featuredLine` | The two lines of the featured caption, only needed if that piece is featured. |

## The cover image

- 1200 x 900 pixels (4:3), saved as `.webp`, ideally under 150 KB.
- Show the actual work: the page, the sheet, the ad, the first lines of the writing. Not a stock photo, not a logo.
- Start the screenshot below the demo's "Concept demo" notice bar. The card already carries the Concept demo tag, and the bar stays inside the live demo.
- Any free converter works. With the `cwebp` tool: `cwebp -q 82 -resize 1200 900 cover.png -o cover.webp`.

## The demo

- A demo should be a plain folder with an `index.html` and relative links, so it works from any address.
- Put `<meta name="robots" content="noindex">` in the `<head>` of every page for a made-up business. GitHub Pages can't send headers, so this tag is the only thing keeping those pages out of search results.
- Add the black "Concept demo" bar at the top of the page, with a link back. Copy the `am-demo-bar` line from any existing demo and change the sentence. From `demo/index.html`, the link back to the project page is `../index.html`.
- Placeholder contact details only: 555 phone numbers and example.com addresses.

## Writing samples as PDFs (optional)

If a sample is a Markdown file and you want a matching, typeset PDF for download:

```
npm i -D playwright && npx playwright install chromium
node tools/make-pdfs.mjs pieces/<folder>/samples/sample.md pieces/<folder>/samples/sample.pdf "Spec sample"
```

The site build itself does not need Playwright.

## Before you publish a new piece

- Is it labelled "Concept demo" or "Spec sample"?
- No real client names, logos, results, ratings or testimonials, and no "trusted by".
- No prices except "From $20 / article" and "From $175 / ad set". Everything else is "Quoted per job".
- No em dashes in the copy.
- The card looks right on a phone (one column) and the project page has no sideways scrolling.
