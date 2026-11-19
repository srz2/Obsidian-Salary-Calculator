import assert from "node:assert/strict";
import { test } from "node:test";
import {
	breakdownFromAnnual,
	breakdownFromHourly,
	DEFAULT_SETTINGS,
	parseAmount,
	splitCsv,
	toComparisonMarkdownTable,
	toComparisonSummary,
	toMarkdownTable,
	validateAmount,
	validateComparison,
	validateSchedule,
	validateSettings,
} from "../src/calculator.ts";

test("hourly rate uses the default 40 hour, 5 day schedule", () => {
	assert.deepEqual(breakdownFromHourly(25, DEFAULT_SETTINGS), {
		hourly: 25,
		daily: 200,
		weekly: 1000,
		monthly: 52000 / 12,
		quarterly: 13000,
		annual: 52000,
	});
});

test("hourly rate respects a custom schedule", () => {
	const pay = breakdownFromHourly(30, { hoursPerWeek: 36, daysPerWeek: 3, weeksPerYear: 52 });
	assert.equal(pay.daily, 360);
	assert.equal(pay.weekly, 1080);
	assert.equal(pay.quarterly, 14040);
	assert.equal(pay.annual, 56160);
});

test("hourly rate respects custom weeks per year", () => {
	const pay = breakdownFromHourly(25, { ...DEFAULT_SETTINGS, weeksPerYear: 50 });
	assert.equal(pay.weekly, 1000);
	assert.equal(pay.annual, 50000);
});

test("annual salary breaks down over 2,080 hours and keeps the exact annual figure", () => {
	const pay = breakdownFromAnnual(104000, DEFAULT_SETTINGS);
	assert.equal(pay.hourly, 50);
	assert.equal(pay.daily, 400);
	assert.equal(pay.weekly, 2000);
	assert.equal(pay.quarterly, 26000);
	assert.equal(pay.annual, 104000);
});

test("annual salary respects custom assumptions", () => {
	const pay = breakdownFromAnnual(100000, { hoursPerWeek: 32, daysPerWeek: 4, weeksPerYear: 50 });
	assert.equal(pay.hourly, 62.5);
	assert.equal(pay.daily, 500);
	assert.equal(pay.weekly, 2000);
	assert.equal(pay.annual, 100000);
});

test("table lists every period in order with formatted currency", () => {
	assert.equal(
		toMarkdownTable(breakdownFromAnnual(85000, DEFAULT_SETTINGS), "USD"),
		[
			"| Period | Pay |",
			"| --- | ---: |",
			"| Hourly | $40.87 |",
			"| Daily | $326.92 |",
			"| Weekly | $1,634.62 |",
			"| Monthly | $7,083.33 |",
			"| Quarterly | $21,250.00 |",
			"| Annual | $85,000.00 |",
		].join("\n"),
	);
});

test("table uses the configured currency", () => {
	const table = toMarkdownTable(breakdownFromHourly(25, DEFAULT_SETTINGS), "EUR");
	assert.match(table, /\| Hourly \| €25\.00 \|/);
});

test("parseAmount accepts currency formatting and rejects junk", () => {
	assert.equal(parseAmount("$85,000.50"), 85000.5);
	assert.ok(Number.isNaN(parseAmount("")));
	assert.ok(Number.isNaN(parseAmount("abc")));
});

test("validation rejects impossible values", () => {
	assert.equal(validateAmount("Rate", 25), null);
	assert.notEqual(validateAmount("Rate", 0), null);
	assert.notEqual(validateAmount("Rate", NaN), null);
	assert.equal(validateSchedule({ hoursPerWeek: 40, daysPerWeek: 5 }), null);
	assert.notEqual(validateSchedule({ hoursPerWeek: 40, daysPerWeek: 8 }), null);
	assert.notEqual(validateSchedule({ hoursPerWeek: 40, daysPerWeek: 1 }), null);
	assert.notEqual(validateSchedule({ hoursPerWeek: 0, daysPerWeek: 5 }), null);
});

test("splitCsv handles spaces, line breaks, quotes, and stray separators", () => {
	assert.deepEqual(splitCsv("25, 30,35.50"), ["25", "30", "35.50"]);
	assert.deepEqual(splitCsv("25\n30\r\n35,"), ["25", "30", "35"]);
	assert.deepEqual(splitCsv('"85,000", "$90,000"'), ["85,000", "$90,000"]);
	assert.deepEqual(splitCsv(" , ,"), []);
});

test("comparison validation requires two positive numbers", () => {
	assert.equal(validateComparison(["25", "30"]), null);
	assert.notEqual(validateComparison(["25"]), null);
	assert.match(validateComparison(["25", "abc"]) ?? "", /"abc"/);
	assert.notEqual(validateComparison(["85", "000"]), null);
});

test("comparison table compares each column with the one to its left", () => {
	const amounts = [80000, 100000, 90000];
	const pays = amounts.map((amount) => breakdownFromAnnual(amount, DEFAULT_SETTINGS));

	assert.equal(
		toComparisonMarkdownTable(amounts, pays, "USD"),
		[
			"| Period | $80,000.00 | $100,000.00 | $90,000.00 |",
			"| --- | ---: | ---: | ---: |",
			"| Hourly | $38.46 | $48.08 | $43.27 |",
			"| Daily | $307.69 | $384.62 | $346.15 |",
			"| Weekly | $1,538.46 | $1,923.08 | $1,730.77 |",
			"| Monthly | $6,666.67 | $8,333.33 | $7,500.00 |",
			"| Quarterly | $20,000.00 | $25,000.00 | $22,500.00 |",
			"| Annual | $80,000.00 | $100,000.00 | $90,000.00 |",
			"| Difference Hourly |  | $9.62 (25.0%) | -$4.81 (-10.0%) |",
			"| Difference Annual |  | $20,000.00 (25.0%) | -$10,000.00 (-10.0%) |",
		].join("\n"),
	);
});

test("comparison differences that round to zero have no minus sign", () => {
	const amounts = [100000, 99999.999];
	const pays = amounts.map((amount) => breakdownFromAnnual(amount, DEFAULT_SETTINGS));
	const table = toComparisonMarkdownTable(amounts, pays, "USD");

	assert.match(table, /\| Difference Hourly \|  \| \$0\.00 \(0\.0%\) \|/);
	assert.match(table, /\| Difference Annual \|  \| \$0\.00 \(0\.0%\) \|/);
});

test("comparison summary names the pay type and lists clean csv values", () => {
	assert.equal(
		toComparisonSummary("hourly", ["25", "30", "35.50"]),
		"Comparing hourly rates: 25, 30, 35.50",
	);
	assert.equal(
		toComparisonSummary("annual", ["85,000", "$90,000"]),
		"Comparing annual rates: 85000, 90000",
	);
});

test("settings validation rejects bad weeks and currency codes", () => {
	assert.equal(validateSettings(DEFAULT_SETTINGS), null);
	assert.notEqual(validateSettings({ ...DEFAULT_SETTINGS, weeksPerYear: 0 }), null);
	assert.notEqual(validateSettings({ ...DEFAULT_SETTINGS, weeksPerYear: 54 }), null);
	assert.notEqual(validateSettings({ ...DEFAULT_SETTINGS, currency: "DOLLARS" }), null);
});
