export interface Schedule {
	hoursPerWeek: number;
	daysPerWeek: number;
}

export interface PayAssumptions extends Schedule {
	weeksPerYear: number;
}

export interface CalculatorSettings extends PayAssumptions {
	currency: string;
	showComparisonSummary: boolean;
}

export type PayType = "hourly" | "annual";

export interface PayBreakdown {
	hourly: number;
	daily: number;
	weekly: number;
	monthly: number;
	quarterly: number;
	annual: number;
}

export const DEFAULT_SETTINGS: CalculatorSettings = {
	hoursPerWeek: 40,
	daysPerWeek: 5,
	weeksPerYear: 52,
	currency: "USD",
	showComparisonSummary: true,
};

const MONTHS_PER_YEAR = 12;
const QUARTERS_PER_YEAR = 4;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const MAX_WEEKS_PER_YEAR = 53;
const MIN_COMPARISON_VALUES = 2;

const PAY_PERIODS: [string, keyof PayBreakdown][] = [
	["Hourly", "hourly"],
	["Daily", "daily"],
	["Weekly", "weekly"],
	["Monthly", "monthly"],
	["Quarterly", "quarterly"],
	["Annual", "annual"],
];

export function breakdownFromHourly(hourly: number, assumptions: PayAssumptions): PayBreakdown {
	const weekly = hourly * assumptions.hoursPerWeek;
	const annual = weekly * assumptions.weeksPerYear;

	return {
		hourly,
		daily: weekly / assumptions.daysPerWeek,
		weekly,
		monthly: annual / MONTHS_PER_YEAR,
		quarterly: annual / QUARTERS_PER_YEAR,
		annual,
	};
}

export function breakdownFromAnnual(annual: number, assumptions: PayAssumptions): PayBreakdown {
	const hourly = annual / (assumptions.weeksPerYear * assumptions.hoursPerWeek);
	return { ...breakdownFromHourly(hourly, assumptions), annual };
}

function stripAmountFormatting(input: string): string {
	return input.replace(/[$,\s]/g, "");
}

/** Accepts values typed like "$85,000" or "85000.50". Returns NaN if unparseable. */
export function parseAmount(input: string): number {
	const cleaned = stripAmountFormatting(input);
	return cleaned === "" ? NaN : Number(cleaned);
}

export function validateAmount(label: string, value: number): string | null {
	return Number.isFinite(value) && value > 0
		? null
		: `${label} must be a number greater than 0.`;
}

export function validateSchedule({ hoursPerWeek, daysPerWeek }: Schedule): string | null {
	const hoursError = validateAmount("Hours per week", hoursPerWeek);
	if (hoursError) return hoursError;

	const daysError = validateAmount("Days per week", daysPerWeek);
	if (daysError) return daysError;

	if (daysPerWeek > DAYS_PER_WEEK) return `Days per week cannot exceed ${DAYS_PER_WEEK}.`;
	if (hoursPerWeek / daysPerWeek > HOURS_PER_DAY) {
		return `That schedule is more than ${HOURS_PER_DAY} hours per day.`;
	}
	return null;
}

export function validateSettings(settings: CalculatorSettings): string | null {
	const scheduleError = validateSchedule(settings);
	if (scheduleError) return scheduleError;

	const weeksError = validateAmount("Weeks per year", settings.weeksPerYear);
	if (weeksError) return weeksError;
	if (settings.weeksPerYear > MAX_WEEKS_PER_YEAR) {
		return `Weeks per year cannot exceed ${MAX_WEEKS_PER_YEAR}.`;
	}

	return /^[A-Z]{3}$/.test(settings.currency)
		? null
		: "Currency must be a 3-letter code, such as USD or EUR.";
}

/** Commas and line breaks separate values. Quote a value to keep a comma in it: "85,000". */
export function splitCsv(input: string): string[] {
	const tokens = Array.from(input.matchAll(/\s*"([^"]*)"|([^,\r\n]+)/g));
	return tokens.map(([, quoted, plain]) => (quoted ?? plain).trim()).filter(Boolean);
}

export function validateComparison(tokens: string[]): string | null {
	if (tokens.length < MIN_COMPARISON_VALUES) {
		return `Enter at least ${MIN_COMPARISON_VALUES} values to compare.`;
	}

	for (const token of tokens) {
		const error = validateAmount(`"${token}"`, parseAmount(token));
		if (error) return error;
	}
	return null;
}

function createCurrencyFormat(currencyCode: string): Intl.NumberFormat {
	return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode });
}

/** Formats as "$2.50 (10.0%)". Differences that round to zero never show a minus sign. */
function formatDifference(current: number, previous: number, currency: Intl.NumberFormat): string {
	const difference = current - previous;
	const percent = (difference / previous) * 100;

	const centsFactor = 10 ** (currency.resolvedOptions().maximumFractionDigits ?? 2);
	const amountText = currency.format(Math.round(difference * centsFactor) === 0 ? 0 : difference);
	const percentText = (Math.round(percent * 10) === 0 ? 0 : percent).toFixed(1);

	return `${amountText} (${percentText}%)`;
}

function toTableRow(cells: string[]): string {
	return `| ${cells.join(" | ")} |`;
}

export function toMarkdownTable(pay: PayBreakdown, currencyCode: string): string {
	const currency = createCurrencyFormat(currencyCode);

	return [
		"| Period | Pay |",
		"| --- | ---: |",
		...PAY_PERIODS.map(([period, key]) => toTableRow([period, currency.format(pay[key])])),
	].join("\n");
}

export function toComparisonMarkdownTable(
	amounts: number[],
	pays: PayBreakdown[],
	currencyCode: string,
): string {
	const currency = createCurrencyFormat(currencyCode);

	const differenceRow = (label: string, key: keyof PayBreakdown): string =>
		toTableRow([
			label,
			"",
			...pays.slice(1).map((pay, i) => formatDifference(pay[key], pays[i][key], currency)),
		]);

	return [
		toTableRow(["Period", ...amounts.map((amount) => currency.format(amount))]),
		toTableRow(["---", ...amounts.map(() => "---:")]),
		...PAY_PERIODS.map(([period, key]) =>
			toTableRow([period, ...pays.map((pay) => currency.format(pay[key]))]),
		),
		differenceRow("Difference Hourly", "hourly"),
		differenceRow("Difference Annual", "annual"),
	].join("\n");
}

export function toComparisonSummary(payType: PayType, tokens: string[]): string {
	return `Comparing ${payType} rates: ${tokens.map(stripAmountFormatting).join(", ")}`;
}
