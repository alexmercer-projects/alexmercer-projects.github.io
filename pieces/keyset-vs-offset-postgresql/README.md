# Keyset vs OFFSET pagination (PostgreSQL)

- **Category:** Technical writing
- **Label:** Spec sample
- **Year:** 2026

## What it is

A four-page unpublished technical write-up, with a benchmark script you can rerun. It measures how OFFSET pagination slows down on a 2-million-row table and shows the keyset (seek) query that replaces it, including two correctness traps. Headline result from the attached run: skipping 1.9 million rows took 344.951 ms with OFFSET and 0.022 ms with keyset, on PostgreSQL 16.4.

## Who it's for

Technical blog, documentation, and "explain this with numbers" writing asks, especially database, backend and developer-tools audiences.

## Key features

- Reproducible benchmark (`keyset_bench.py`, needs psycopg2 and a scratch PostgreSQL 12+ database)
- Query plans and a results table at seven depths
- Bug OFFSET introduces (duplicates after inserts) and a naive keyset bug (missing a unique tie-breaker)
- Clear takeaway and limits (no jump-to-page-N)

## Honesty

This is an unpublished spec sample, not a client report and not an article that ran in a magazine. The numbers come from the attached script on one machine; absolute times will differ if someone reruns it, but the shape should hold. Do not present it as paid client work or as a published clip.

## File notes

- No interactive demo site. The PDF is the piece.
- `samples/Keyset-vs-OFFSET-PostgreSQL-SAMPLE.pdf` is the four-page write-up.
- `samples/keyset_bench.py` should be downloadable next to it.
- Screenshots: `keyset-chart.webp`, `keyset-pdf-p1.webp`, `keyset-pdf-p2.webp`.
