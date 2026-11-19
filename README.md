# Alex Mercer Projects: portfolio site

A small static site. One command turns `pieces.json` and the `pieces/` folder into a finished site in `dist/`. No frameworks, no npm packages, no trackers, no forms, and no calls to outside services (the fonts are self-hosted).

## What is where

| Path | What it is |
|---|---|
| `site.json` | Name, email, mail subject line, live address, and the "noindex" switch. |
| `pieces.json` | The list of pieces, in the order they appear. The source of truth. |
| `pieces/` | One folder per piece: cover, demo, samples, screenshots. |
| `src/assets/` | CSS, JavaScript, fonts, favicon and share image. |
| `src/lib/markdown.mjs` | Typesets the writing samples on project pages. |
| `build.mjs` | The build script. |
| `tools/make-pdfs.mjs` | Optional: turns a Markdown sample into a typeset PDF. |
| `tools/og.html`, `tools/make-og.mjs` | Optional: the share image and the script that renders it into `src/assets/og.png`. |
| `dist/` | The built site. This is what gets published. |
| `ADDING-A-PIECE.md` | How to add or change a piece. |

## Build and preview

You need Node 18 or newer.

```
node build.mjs
cd dist && python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `dist/index.html` straight from disk mostly works, but the browser will block the fonts, so use the little server to see it properly.

## Live site

The site is at [https://alexmercerprojects.com/](https://alexmercerprojects.com/).

`url` in `site.json` is set to that address so canonical links, the sitemap and the share image use the full URL. A GitHub Actions workflow runs `node build.mjs` on every push to `main` and publishes the `dist` folder to GitHub Pages.

To keep the site out of search engines while you look a change over, set `"noindex": true`, commit, and set it back to `false` when you are ready.

Notes:

- The build writes an empty `.nojekyll` file into `dist`, so GitHub serves every file without running Jekyll.
- `404.html` finds its way back to the homepage on its own.
- GitHub Pages can't send custom headers, so every demo page for a made-up business carries `<meta name="robots" content="noindex">` in its own `<head>`.

## Honesty rules the site follows

Every piece is labelled "Concept demo" (made-up business) or "Spec sample" (unpublished writing). No client names, logos, ratings, results or testimonials. Only two prices appear: "From $20 / article" and "From $175 / ad set". The only contact is the email link. See `ADDING-A-PIECE.md` before adding anything.

## Licenses

Schibsted Grotesk and JetBrains Mono are under the SIL Open Font License; see `src/assets/fonts/LICENSE.txt`.
