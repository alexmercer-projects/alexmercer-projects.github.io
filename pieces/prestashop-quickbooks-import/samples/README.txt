PrestaShop -> QuickBooks Desktop Enterprise: free sample (Alex Mercer)
=====================================================================

WHAT'S HERE
- ps2qb.php: a working PHP script (PHP 8, uses only the curl extension).
  It pulls paid/shipped orders for a date range from the PrestaShop
  Webservice API and writes an .iif file that QuickBooks Desktop
  Enterprise imports as invoices (File > Utilities > Import > IIF Files):
  one invoice per order, one line per product (QB item = PrestaShop
  product reference/SKU), plus shipping and discount lines. It prints a
  check list and flags any order whose total doesn't match PrestaShop.
- sample-orders.json / sample-orders.iif: made-up test orders and the
  file the script produced from them (run with --fixture to test offline).

  php ps2qb.php --fixture=sample-orders.json --out=test.iif
  PS_URL=https://yourshop.com PS_KEY=xxxx php ps2qb.php --from=2026-11-01 --to=2026-11-14

Account and item names sit in the $cfg block at the top, so they can match
your chart of accounts. Before a first real import I'd run it against a
backup company file. IIF is the quickest first step; for a hands-off
nightly sync I'd move it to the QuickBooks Web Connector (qbXML), which
validates customers and items instead of creating them blindly.
