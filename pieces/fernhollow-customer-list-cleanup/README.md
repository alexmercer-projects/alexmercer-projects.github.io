# Fernhollow Supply Co.: customer list cleanup

- **Category:** Data cleanup
- **Label:** Concept demo
- **Year:** 2026

## What it is

A Python script run on a messy 250-row customer CSV for a made-up restaurant supply company. The file was pasted together from three sources, so it has every usual problem: stray spaces, ALL CAPS, seven date styles, ZIP codes missing their leading zero, email typos, phone numbers in every format and the same customer entered two or three times. The script fixes what can be fixed safely, merges the repeats, logs every change, and lists the things a person should decide.

## Who it's for

Data cleanup and data entry asks, CRM or mailing list imports, merging exports from several systems, deduplicating customer or contact lists, and anyone with a spreadsheet that has grown messy over the years.

## Key features

- 250 rows in, 211 customers out: 5 junk rows dropped and 34 repeats merged
- Thirteen cleaning rules, 1,187 cells fixed, each one logged with its before, after and rule
- Repeat matching on email, phone or name plus ZIP, with a name check so two businesses sharing one email are not merged
- Same name in another town kept as a second location
- 15 questions left for a person instead of guesses: missing digits, emails without an @, look-alike names
- An Excel workbook with Clean, Changes, Duplicates, Needs Review, Removed and Original tabs, plus the same outputs as CSV
- Standard library Python with 37 tests
