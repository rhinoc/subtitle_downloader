import path from "node:path";
import os from "node:os";

const CONFIG_FILE_NAME = ".subrc";

function getConfigFilePath() {
	return path.join(os.homedir(), CONFIG_FILE_NAME);
}

export interface Config {
	openSubtitles?: {
		apiKey?: string;
	};
}

async function readFromConfig(): Promise<Config | null> {
	const file = Bun.file(getConfigFilePath());
	if (!(await file.exists())) {
		return null;
	}
	try {
		return file.json();
	} catch (ex) {
		console.error(ex);
		return null;
	}
}

async function writeToConfig(config: Config) {
	await Bun.write(getConfigFilePath(), JSON.stringify(config));
}

class ConfigManager {
	private _config: Config | null = null;

	private _initPromise: Promise<void>;

	constructor() {
		this._initPromise = this.init();
	}

	async init() {
		this._config = await readFromConfig();
	}

	async update(config: Partial<Config>) {
		await this._initPromise;
		await writeToConfig({
			...this._config,
			...config,
		});
	}

	async getConfig() {
		await this._initPromise;
		return this._config;
	}
}

export const configManager = new ConfigManager();
