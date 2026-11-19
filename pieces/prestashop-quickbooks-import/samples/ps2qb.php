<?php
/**
 * ps2qb.php - PrestaShop orders -> QuickBooks Desktop (IIF invoice import)
 * Sample by Alex Mercer, written for a B2B wholesale PrestaShop shop.
 *
 * Pulls orders for a date range from the PrestaShop Webservice API and
 * writes an .iif file that QuickBooks Desktop Enterprise can import
 * (File > Utilities > Import > IIF Files) as invoices, one per order,
 * with one line per product (SKU = PrestaShop product reference),
 * plus shipping and discount lines.
 *
 * Usage:
 *   php ps2qb.php --from=2026-11-01 --to=2026-11-14 --out=orders.iif
 *   php ps2qb.php --fixture=sample-orders.json --out=orders.iif   (offline test)
 * Env: PS_URL=https://yourshop.com  PS_KEY=<webservice key>
 */

$cfg = [
    'ar_account'       => 'Accounts Receivable',
    'income_account'   => 'Sales - Wholesale',
    'shipping_item'    => 'Shipping',
    'shipping_account' => 'Shipping Income',
    'discount_item'    => 'Discount',
    'discount_account' => 'Sales Discounts',
    'order_states'     => [2, 3, 4, 5],   // payment accepted, processing, shipped, delivered
];

$opt = getopt('', ['from:', 'to:', 'out:', 'fixture:']);
$out = $opt['out'] ?? 'orders.iif';

function ps_get(string $path, array $q = []): array {
    $base = rtrim(getenv('PS_URL') ?: '', '/');
    $key  = getenv('PS_KEY') ?: '';
    if (!$base || !$key) { fwrite(STDERR, "Set PS_URL and PS_KEY\n"); exit(1); }
    $q['output_format'] = 'JSON';
    $ch = curl_init("$base/api/$path?" . http_build_query($q));
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_USERPWD => "$key:", CURLOPT_TIMEOUT => 60]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($body === false || $code >= 400) { fwrite(STDERR, "API error $code on $path\n"); exit(1); }
    return json_decode($body, true) ?: [];
}

// ---- load orders (+ customer names) ----
if (isset($opt['fixture'])) {
    $data = json_decode(file_get_contents($opt['fixture']), true);
    $orders = $data['orders']; $customers = $data['customers'];
} else {
    $from = $opt['from'] ?? date('Y-m-d', strtotime('-1 day'));
    $to   = $opt['to']   ?? date('Y-m-d');
    $orders = ps_get('orders', [
        'display' => 'full', 'date' => 1,
        'filter[date_add]' => "[$from 00:00:00,$to 23:59:59]",
        'filter[current_state]' => '[' . implode('|', $cfg['order_states']) . ']',
    ])['orders'] ?? [];
    $customers = [];
    foreach (array_unique(array_column($orders, 'id_customer')) as $cid) {
        $customers[$cid] = ps_get("customers/$cid")['customer'] ?? [];
    }
}

// ---- helpers ----
function qb_name(array $c): string {           // QB customer name: company first, else person
    $n = trim($c['company'] ?? '') ?: trim(($c['firstname'] ?? '') . ' ' . ($c['lastname'] ?? ''));
    return substr(preg_replace('/[\t\r\n:]+/', ' ', $n), 0, 41); // QB name limit 41, no colons
}
function clean(string $s): string { return preg_replace('/[\t\r\n]+/', ' ', $s); }
function money(float $v): string { return number_format($v, 2, '.', ''); }

// ---- write IIF ----
$L = [];
$L[] = "!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO";
$L[] = "!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO\tQNTY\tPRICE\tINVITEM";
$L[] = "!ENDTRNS";
$report = [];
foreach ($orders as $o) {
    $name  = qb_name($customers[$o['id_customer']] ?? []);
    $date  = date('m/d/Y', strtotime($o['date_add']));
    $doc   = 'PS-' . $o['reference'];
    $lines = [];
    foreach ($o['associations']['order_rows'] ?? [] as $r) {
        $qty = (float)$r['product_quantity'];
        $price = (float)$r['unit_price_tax_excl'];
        $lines[] = [$cfg['income_account'], -round($qty * $price, 2), clean($r['product_name']), -$qty, $price, clean($r['product_reference'] ?: 'MISC')];
    }
    $ship = (float)($o['total_shipping_tax_excl'] ?? 0);
    if ($ship > 0) $lines[] = [$cfg['shipping_account'], -$ship, 'Shipping', '', '', $cfg['shipping_item']];
    $disc = (float)($o['total_discounts_tax_excl'] ?? 0);
    if ($disc > 0) $lines[] = [$cfg['discount_account'], $disc, 'Discount', '', '', $cfg['discount_item']];
    $total = -array_sum(array_column($lines, 1));
    $ps_total = (float)$o['total_paid_tax_excl'];
    $L[] = implode("\t", ['TRNS', '', 'INVOICE', $date, $cfg['ar_account'], $name, money($total), $doc, "PrestaShop order {$o['id']}"]);
    foreach ($lines as [$acct, $amt, $memo, $qty, $price, $item]) {
        $L[] = implode("\t", ['SPL', '', 'INVOICE', $date, $acct, $name, money($amt), $doc, $memo, $qty, $price === '' ? '' : money($price), $item]);
    }
    $L[] = 'ENDTRNS';
    $flag = abs($total - $ps_total) > 0.01 ? 'CHECK: differs from PrestaShop total ' . money($ps_total) : 'ok';
    $report[] = sprintf("%-14s %-28s %10s  %s", $doc, $name, money($total), $flag);
}
file_put_contents($out, implode("\r\n", $L) . "\r\n");
echo "Wrote " . count($orders) . " invoices to $out\n" . implode("\n", $report) . "\n";
