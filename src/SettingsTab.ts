import { App, PluginSettingTab, Setting } from "obsidian";
import { CalculatorSettings, parseAmount, validateSettings } from "./calculator";
import type SalaryCalculatorPlugin from "./main";

export class SalaryCalculatorSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: SalaryCalculatorPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		this.containerEl.empty();

		this.addField(
			"hoursPerWeek",
			"Hours per week",
			"Used for annual salaries, and prefilled for hourly rates.",
			parseAmount,
		);
		this.addField(
			"daysPerWeek",
			"Days per week",
			"Used for annual salaries, and prefilled for hourly rates.",
			parseAmount,
		);
		this.addField(
			"weeksPerYear",
			"Weeks per year",
			"Paid weeks in a year. Lower this to account for unpaid time off.",
			parseAmount,
		);
		this.addField(
			"currency",
			"Currency",
			"3-letter currency code, such as USD, EUR, or GBP.",
			(input) => input.trim().toUpperCase(),
		);

		new Setting(this.containerEl)
			.setName("Show comparison summary")
			.setDesc("Add a line below comparison tables listing the values compared.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showComparisonSummary).onChange(async (value) => {
					await this.plugin.saveSettings({
						...this.plugin.settings,
						showComparisonSummary: value,
					});
				}),
			);
	}

	/** Only valid values are saved. Leaving a field restores the last saved value. */
	private addField<K extends keyof CalculatorSettings>(
		key: K,
		name: string,
		description: string,
		parse: (input: string) => CalculatorSettings[K],
	): void {
		const setting = new Setting(this.containerEl).setName(name).setDesc(description);

		setting.addText((text) => {
			text.setValue(String(this.plugin.settings[key]));

			text.onChange(async (input) => {
				const candidate = { ...this.plugin.settings, [key]: parse(input) };
				const error = validateSettings(candidate);
				setting.setDesc(error ?? description);
				if (!error) await this.plugin.saveSettings(candidate);
			});

			text.inputEl.addEventListener("blur", () => {
				text.setValue(String(this.plugin.settings[key]));
				setting.setDesc(description);
			});
		});
	}
}
