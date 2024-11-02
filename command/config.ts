import { Command, Option } from "clipanion";
import { configManager } from "../util/config-manager";

export class ConfigCommand extends Command {
	static paths = [["config"]];

	key = Option.String("--key");

	async execute(): Promise<number | undefined> {
		if (!this.key) {
			this.context.stderr.write("❌ [--key] should be provided\n");
			return;
		}

		configManager.update({
			openSubtitles: {
				apiKey: this.key,
			},
		});
		this.context.stdout.write("✅ config apiKey successfully\n");
	}
}
