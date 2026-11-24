# Quillmere Lighting Co.: spreadsheet to datasheet generator

- **Category:** Document automation
- **Label:** Concept demo
- **Year:** 2026

## What it is

A product spreadsheet for a made-up outdoor lighting company turned into print-ready datasheets. Each of the 16 rows fills one designed US Letter template: product drawing, key figures, grouped specs, finish swatches, a dimension drawing built from the row's measurements and an ordering code. One command writes a PDF per product plus a combined 18-page catalog, and checks the data and the actual print layout first.

## Who it's for

Anyone with a product list in Excel and a datasheet, spec sheet or flyer template that has to be filled for every row: catalog and datasheet jobs, Canva Bulk Create style work that has outgrown copy and paste, and teams that need the sheets rebuilt every time the spreadsheet changes.

## Key features

- 16 products in, 16 one-page PDF datasheets and an 18-page catalog out, in about 5 seconds
- One HTML/CSS print template; swap the template and the same data fills a different design
- Cell checks: missing fields, duplicate SKUs, numbers in range, units (mm, kg, Celsius), efficacy matching lumens / watts within 2%, known finishes, image files, length limits
- Layout check: Chrome measures every text box after the fonts load and flags anything that spills over; every sheet is confirmed to be one page
- A validation report, a manifest and a strict mode that stops on errors
- Python with openpyxl, 15 tests, and a deliberately broken spreadsheet to show the checks
