import { App, Modal, Notice, Setting } from "obsidian";
import { parseAmount, PayType, Schedule } from "./calculator";

export interface ComparisonRequest extends Schedule {
	payType: PayType;
	values: string;
}

/** Returns an error message to show the user, or null when the request was accepted. */
export type ComparisonSubmitHandler = (request: ComparisonRequest) => string | null;

export class CompareModal extends Modal {
	private payType: PayType = "hourly";
	private valuesInput?: HTMLTextAreaElement;
	private hoursInput?: HTMLInputElement;
	private daysInput?: HTMLInputElement;

	constructor(
		app: App,
		private schedule: Schedule,
		private onSubmit: ComparisonSubmitHandler,
	) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText("Compare pay");

		const hoursSetting = new Setting(this.contentEl)
			.setName("Hours per week")
			.setDesc("Hours worked each week.")
			.addText((text) => {
				text.inputEl.inputMode = "decimal";
				text.setValue(this.schedule.hoursPerWeek.toString());
				this.hoursInput = text.inputEl;
			});

		const daysSetting = new Setting(this.contentEl)
			.setName("Days per week")
			.setDesc("Days worked each week.")
			.addText((text) => {
				text.inputEl.inputMode = "decimal";
				text.setValue(this.schedule.daysPerWeek.toString());
				this.daysInput = text.inputEl;
			});

		const payTypeSetting = new Setting(this.contentEl)
			.setName("Values are")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("hourly", "Hourly rates")
					.addOption("annual", "Annual salaries")
					.setValue(this.payType)
					.onChange((value) => {
						this.payType = value as PayType;
						hoursSetting.settingEl.toggle(this.payType === "hourly");
						daysSetting.settingEl.toggle(this.payType === "hourly");
					}),
			);

		const valuesSetting = new Setting(this.contentEl)
			.setName("Values")
			.setDesc('Separate values with commas. Quote any value containing a comma, like "85,000".')
			.addTextArea((text) => {
				text.setPlaceholder("25, 30, 35.50");
				this.valuesInput = text.inputEl;
			});

		this.contentEl.prepend(payTypeSetting.settingEl, valuesSetting.settingEl);

		new Setting(this.contentEl).addButton((button) =>
			button
				.setButtonText("Insert table")
				.setCta()
				.onClick(() => this.submit()),
		);

		this.scope.register([], "Enter", (event) => {
			event.preventDefault();
			this.submit();
			return false;
		});

		this.valuesInput?.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private submit(): void {
		const error = this.onSubmit({
			payType: this.payType,
			values: this.valuesInput?.value ?? "",
			hoursPerWeek: parseAmount(this.hoursInput?.value ?? ""),
			daysPerWeek: parseAmount(this.daysInput?.value ?? ""),
		});
		if (error) {
			new Notice(error);
			return;
		}
		this.close();
	}
}
