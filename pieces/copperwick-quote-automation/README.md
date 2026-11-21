# Copperwick Moving Co. quote request automation

- **Category:** Automation
- **Label:** Concept demo
- **Year:** 2026

## What it is

A Google Forms to Google Sheets to email automation in Apps Script for a made-up moving company. Each quote request is logged with a reference number, checked for spam, typos and repeats, routed to an estimator by town, given a reply-by time from office hours and confirmed by email. Reminders and a morning digest make sure nothing sits unanswered.

## Who it's for

Small businesses that take requests through a form and copy them around by hand: quotes, bookings, intake, support. Anyone asking for a Zapier or Make style workflow who would rather not pay for one every month.

## Key features

- Every request logged to one sheet with a reference number, from a Google Form or a website form
- Spam, contact-typo and repeat checks before anyone is emailed
- Routing by town to the right estimator, set on a tab anyone can edit
- Rush priority and a reply-by time that counts business hours only
- Emails to the estimator and the customer, an hourly reminder and a morning digest
- A live demo that runs the real rules in the browser, plus 33 automated tests

## Honesty

Concept demo. Copperwick Moving Co., its towns, staff and customers, and every phone number (555-01xx) and email (example.com) are made up. Tested offline against stand-ins for Google's services; not installed for a real business. Not client work, and no results are claimed.

## File notes

- `demo/` is the live page. `samples/` has the Apps Script project zip and the sample workbook.
- Source and tests: https://github.com/alexmercer-projects/copperwick-quote-automation
