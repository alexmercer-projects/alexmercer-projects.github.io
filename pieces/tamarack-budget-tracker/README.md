# Tamarack Build Co.: project budget and payment tracker

- **Category:** Spreadsheet / dashboard
- **Label:** Concept demo
- **Year:** 2026

## What it is

A budget and payment tracker for a made-up home builder, delivered two ways: a live dashboard and a real Excel workbook. It shows budget vs paid by category, a filterable payments log, change orders, and flags for payments with no receipt. Totals come from formulas. Every name and number is example data.

## Who it's for

Excel or Google Sheets help, budget and payment trackers, home-build or remodel cost trackers, contractor job costing, draw and invoice logs, and small-business dashboards.

## Key features

- Dashboard: remaining balance, revised budget, paid to date, pending change orders, missing receipts
- Category rollups (budget, approved change orders, paid, remaining, percent spent, status)
- Payments log with search and filters; rows without a receipt are flagged
- Change-order log (only approved rows hit the revised budget)
- Matching `.xlsx` with five tabs: Read Me, Budget vs Paid (SUMIFS rollups), Payments (dropdowns and a missing-receipt flag), Change Orders, Lists
- Yellow cells in the workbook are inputs; everything else is a formula

## Honesty

Concept demo. Tamarack Build Co. is not a real company. Every name, invoice and dollar amount is example data. Do not claim this was built for a real project or that it saved anyone money or time.

## File notes

- `demo/` is the dashboard (HTML, CSS, JS, fonts, and a workbook screenshot).
- `samples/Tamarack-budget-tracker-DEMO.xlsx` is the real workbook. Prefer this as the downloadable file.
- `samples/Tamarack-budget-tracker-DEMO.pdf` is a long one-page view of the dashboard (about 1.8 MB).
- Preferred screenshots: `desktop.png`, `mobile.png`, `detail-budget.png`, `detail-payments.png`, `detail-change-orders.png`, `detail-workbook.png`.
