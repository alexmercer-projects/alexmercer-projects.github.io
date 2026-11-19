# PrestaShop to QuickBooks Desktop import

- **Category:** Automation / scripts
- **Label:** Spec sample (example data)
- **Year:** 2026

## What it is

A working PHP script that pulls paid and shipped orders from the PrestaShop Webservice API and writes an IIF file that QuickBooks Desktop Enterprise can import as invoices. The folder also has made-up test orders and the IIF the script produced from them, so it can be run offline with `--fixture`.

## Who it's for

Shop owners and bookkeepers who need PrestaShop orders in QuickBooks, wholesale or B2B order export, and small automation jobs where a first import path matters more than a full integration.

## Key features

- `ps2qb.php` (PHP 8, curl only): one invoice per order, one line per product (QB item = PrestaShop SKU), plus shipping and discount lines
- A checklist and a flag when an order total does not match
- Account and item names sit in a `$cfg` block so they can match a chart of accounts
- Offline test: `php ps2qb.php --fixture=sample-orders.json --out=test.iif`
- Sample buyers are clearly fake (Example Boutique LLC, Pat Example, Sam Sample)

## Honesty

The orders and customers are made-up test fixtures, not a live store's data. This is a sample script, not a paid implementation and not a connection to anyone's QuickBooks company file. Do not claim it is running in production or that it saved a client time.

The original `README.txt` also sketches a later wholesale-email intake idea. Do not lead the public site with AI or automation-hype language. Describe the working import script and the example IIF.

## File notes

- All deliverables are in `samples/`: `ps2qb.php`, `README.txt`, `sample-orders.json`, `sample-orders.iif`, and the same files zipped.
- There is no designed marketing page. A project page can show a short explanation, a snippet of the IIF, and a download link.
