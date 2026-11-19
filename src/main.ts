import { Editor, MarkdownView, Notice, Plugin } from "obsidian";
import {
	breakdownFromAnnual,
	breakdownFromHourly,
	CalculatorSettings,
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
} from "./calculator";
import { CompareModal, ComparisonRequest } from "./CompareModal";
import { PayModal } from "./PayModal";
import { SalaryCalculatorSettingTab } from "./SettingsTab";

const NO_EDITOR_MESSAGE = "Salary Calculator: open a note in editing view first.";

export default class SalaryCalculatorPlugin extends Plugin {
	settings: CalculatorSettings = { ...DEFAULT_SETTINGS };

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addCommand({
			id: "calculate-from-hourly-rate",
			name: "Calculate pay from hourly rate",
			callback: () => this.openHourlyModal(),
		});

		this.addCommand({
			id: "calculate-from-annual-salary",
			name: "Calculate pay from annual salary",
			callback: () => this.openAnnualModal(),
		});

		this.addCommand({
			id: "compare-pay",
			name: "Compare pay",
			callback: () => this.openCompareModal(),
		});

		this.addSettingTab(new SalaryCalculatorSettingTab(this.app, this));
	}

	async saveSettings(settings: CalculatorSettings): Promise<void> {
		this.settings = settings;
		await this.saveData(settings);
	}

	private async loadSettings(): Promise<void> {
		const saved = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
		this.settings = validateSettings(saved) ? { ...DEFAULT_SETTINGS } : saved;
	}

	private openHourlyModal(): void {
		const editor = this.requireActiveEditor();
		const fields = [
			{ name: "Hourly rate", description: "Pay per hour.", placeholder: "25.00" },
			{
				name: "Hours per week",
				description: "Hours worked each week.",
				defaultValue: this.settings.hoursPerWeek,
			},
			{
				name: "Days per week",
				description: "Days worked each week.",
				defaultValue: this.settings.daysPerWeek,
			},
		];

		new PayModal(this.app, "Calculate pay from hourly rate", fields, (values) => {
			const [hourly, hoursPerWeek, daysPerWeek] = values;
			const schedule = { hoursPerWeek, daysPerWeek };

			const error = validateAmount("Hourly rate", hourly) ?? validateSchedule(schedule);
			if (error) return error;

			const pay = breakdownFromHourly(hourly, { ...this.settings, ...schedule });
			this.insertTable(toMarkdownTable(pay, this.settings.currency), editor);
			return null;
		}).open();
	}

	private openAnnualModal(): void {
		const editor = this.requireActiveEditor();
		const fields = [
			{ name: "Annual salary", description: "Pay per year.", placeholder: "85,000" },
		];

		new PayModal(this.app, "Calculate pay from annual salary", fields, (values) => {
			const [annual] = values;

			const error = validateAmount("Annual salary", annual);
			if (error) return error;

			const pay = breakdownFromAnnual(annual, this.settings);
			this.insertTable(toMarkdownTable(pay, this.settings.currency), editor);
			return null;
		}).open();
	}

	private openCompareModal(): void {
		const editor = this.requireActiveEditor();

		new CompareModal(this.app, this.settings, (request) => {
			const tokens = splitCsv(request.values);

			const error = validateComparison(tokens) ?? this.validateCompareSchedule(request);
			if (error) return error;

			const amounts = tokens.map(parseAmount);
			const { hoursPerWeek, daysPerWeek } = request;
			const pays = amounts.map((amount) =>
				request.payType === "hourly"
					? breakdownFromHourly(amount, { ...this.settings, hoursPerWeek, daysPerWeek })
					: breakdownFromAnnual(amount, this.settings),
			);

			const table = toComparisonMarkdownTable(amounts, pays, this.settings.currency);
			const summary = toComparisonSummary(request.payType, tokens);
			// The blank line keeps the summary from rendering as another table row.
			this.insertTable(
				this.settings.showComparisonSummary ? `${table}\n\n${summary}` : table,
				editor,
			);
			return null;
		}).open();
	}

	private validateCompareSchedule(request: ComparisonRequest): string | null {
		return request.payType === "hourly" ? validateSchedule(request) : null;
	}

	private requireActiveEditor(): Editor {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view?.getMode() === "source") return view.editor;

		new Notice(NO_EDITOR_MESSAGE);
		throw new Error(NO_EDITOR_MESSAGE);
	}

	private insertTable(table: string, editor: Editor): void {
		insertAsBlock(editor, table);
		editor.focus();
	}
}

/** Markdown tables only render when separated from neighboring text by blank lines. */
function insertAsBlock(editor: Editor, block: string): void {
	const from = editor.getCursor("from");
	const to = editor.getCursor("to");

	const textBefore = editor.getLine(from.line).slice(0, from.ch);
	const textAfter = editor.getLine(to.line).slice(to.ch);
	const previousLine = from.line > 0 ? editor.getLine(from.line - 1) : "";
	const nextLine = to.line < editor.lastLine() ? editor.getLine(to.line + 1) : "";

	let prefix = "";
	if (textBefore.trim()) prefix = "\n\n";
	else if (previousLine.trim()) prefix = "\n";

	let suffix = "";
	if (textAfter.trim()) suffix = "\n\n";
	else if (nextLine.trim()) suffix = "\n";

	editor.replaceSelection(`${prefix}${block}${suffix}`);
}
