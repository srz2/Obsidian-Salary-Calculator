import { App, Modal, Notice, Setting } from "obsidian";
import { parseAmount } from "./calculator";

export interface PayField {
	name: string;
	description: string;
	placeholder?: string;
	defaultValue?: number;
}

/** Returns an error message to show the user, or null when the values were accepted. */
export type PaySubmitHandler = (values: number[]) => string | null;

export class PayModal extends Modal {
	private inputs: HTMLInputElement[] = [];

	constructor(
		app: App,
		private heading: string,
		private fields: PayField[],
		private onSubmit: PaySubmitHandler,
	) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText(this.heading);

		for (const field of this.fields) {
			new Setting(this.contentEl)
				.setName(field.name)
				.setDesc(field.description)
				.addText((text) => {
					text.inputEl.inputMode = "decimal";
					text.setPlaceholder(field.placeholder ?? "");
					text.setValue(field.defaultValue?.toString() ?? "");
					this.inputs.push(text.inputEl);
				});
		}

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

		this.inputs[0]?.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private submit(): void {
		const error = this.onSubmit(this.inputs.map((input) => parseAmount(input.value)));
		if (error) {
			new Notice(error);
			return;
		}
		this.close();
	}
}
