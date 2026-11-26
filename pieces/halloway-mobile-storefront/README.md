# Halloway & Co.: a mobile storefront you can install

- **Category:** Mobile app
- **Label:** Concept demo
- **Year:** 2026

## What it is

A shop for a made-up workshop that sells waxed canvas bags, leather goods, aprons and a few things for the house. I built it phone-first so it feels like an app: a bottom tab bar, swipeable product pictures, a sticky Add to cart, and you can add it to your home screen and keep browsing with no signal. The products, prices, stock and codes are examples, and the checkout is a demo that takes no payment.

## Who it's for

Small shops that want their own mobile store or a simple shopping app without an app store, and anyone hiring for a small app or mobile e-commerce build.

## Key features

- 14 example products in 4 categories, with instant search, category chips, a filter sheet (price, color, in stock) and sorting
- Product pages with a swipeable gallery, color and size pickers that know which combinations are sold out, low-stock messages and a quantity stepper
- A cart with quantity edits, undo on remove, discount codes with clear messages, a free-shipping bar and live totals for discount, shipping and estimated tax
- A wishlist, a three-step demo checkout with inline validation and an error summary, and an order confirmation
- Cart, wishlist and demo orders saved on the device and synced across tabs
- Installable with a web app manifest and icons, and works offline through a service worker
- Keyboard friendly with labeled controls, visible focus, live announcements and reduced-motion support
- Plain JavaScript modules, no framework and no outside requests; product pictures are SVG illustrations drawn for it
- 39 tests with Node's built-in runner covering pricing, discounts, shipping, tax rounding, search and filters, the cart and the offline file list
