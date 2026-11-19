# Salary Calculator

An [Obsidian](https://obsidian.md) plugin that turns an hourly rate or annual salary into a pay breakdown table and inserts it into your note. It can also compare several rates side by side.

## Commands

Run these from the Command Palette. Each one opens a form and inserts its table at your cursor. A note must be open in editing view, or the command stops with an error.

### Calculate pay from hourly rate

Enter an hourly rate. Hours per week and days per week are prefilled from your settings (40 and 5 by default), and you can change them for this calculation.

### Calculate pay from annual salary

Enter an annual salary. Hours per week, days per week, and weeks per year come from your settings.

Both commands produce a table like this one, for an $85,000 salary:

| Period | Pay |
| --- | ---: |
| Hourly | $40.87 |
| Daily | $326.92 |
| Weekly | $1,634.62 |
| Monthly | $7,083.33 |
| Quarterly | $21,250.00 |
| Annual | $85,000.00 |

### Compare pay

Choose whether your values are hourly rates or annual salaries, then enter them as a comma-separated list. You need at least two values. Hourly comparisons let you set hours and days per week on the form, while salary comparisons use your settings.

Each value gets its own column. Two extra rows show how each column differs from the one to its left, as an amount and a percentage. The first column has nothing to compare against, so those cells are blank.

For `80000, 100000, 90000` as annual salaries:

| Period | $80,000.00 | $100,000.00 | $90,000.00 |
| --- | ---: | ---: | ---: |
| Hourly | $38.46 | $48.08 | $43.27 |
| Daily | $307.69 | $384.62 | $346.15 |
| Weekly | $1,538.46 | $1,923.08 | $1,730.77 |
| Monthly | $6,666.67 | $8,333.33 | $7,500.00 |
| Quarterly | $20,000.00 | $25,000.00 | $22,500.00 |
| Annual | $80,000.00 | $100,000.00 | $90,000.00 |
| Difference Hourly | | $9.62 (25.0%) | -$4.81 (-10.0%) |
| Difference Annual | | $20,000.00 (25.0%) | -$10,000.00 (-10.0%) |

Comparing annual rates: 80000, 100000, 90000

The summary line under the table can be turned off in settings.

## How pay is calculated

| Period | Formula |
| --- | --- |
| Weekly | Hourly × hours per week |
| Daily | Weekly ÷ days per week |
| Annual | Weekly × weeks per year |
| Monthly | Annual ÷ 12 |
| Quarterly | Annual ÷ 4 |

An annual salary is converted to an hourly rate by dividing by hours per week × weeks per year (2,080 hours with the defaults). Amounts are rounded only for display, so totals stay exact.

## Installation

The plugin isn't in the Community Plugins directory, so install it manually:

1. Build the plugin (see [Development](#development)), or use an existing `main.js`.
2. In your vault, create the folder `.obsidian/plugins/salary-calculator/`.
3. Copy `main.js` and `manifest.json` into it.
4. In Obsidian, open Settings → Community plugins, reload the list, and enable **Salary Calculator**.

After an update, copy the new `main.js` over the old one, then turn the plugin off and on again.

## Development

Requires Node.js 22.18 or newer, since the tests run TypeScript directly.

```sh
npm install
npm run build   # type-check and build main.js
npm run dev     # rebuild main.js on every change
npm test        # run the calculator tests
```
