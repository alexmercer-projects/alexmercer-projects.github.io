# Alderbend: a from-scratch WordPress block theme

- **Category:** WordPress
- **Label:** Concept demo
- **Year:** 2026

## What it is

A full-site-editing WordPress theme written from scratch for a made-up landscaping company, with no starter theme, framework or page builder. Design tokens live in theme.json, there are 16 block patterns, 8 templates, two small custom blocks (a service-area checker and a quote request form), and tests. The demo site is a static copy of the real theme running in WordPress, because GitHub Pages can't run PHP.

## Who it's for

Small businesses and agencies that want a custom WordPress theme they can read, edit in the Site Editor and hand to the next developer, and anyone who asks to see WordPress code before hiring.

## Key features

- theme.json v3 design tokens: palette, fluid type, spacing and block defaults, with a second colour scheme as a style variation
- 16 patterns written as PHP, so links use home_url() and every string is translatable
- Quote request form block with a nonce, honeypot, per-field validation, a rate limit and accessible error messages
- Service area checker block with 1.8 KB of JavaScript, loaded only where it is used
- Self-hosted fonts, original SVG illustrations, no CDN
- PHP lint and PHPCS clean, 120 automated checks, patterns opened in the real block editor with no invalid blocks
