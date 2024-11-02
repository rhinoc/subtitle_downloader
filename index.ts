import { Cli } from "clipanion";
import { ConfigCommand } from "./command/config";
import { DownloadCommand } from "./command/download";

const [node, app, ...args] = process.argv;

async function main() {
	const cli = new Cli({
		binaryLabel: "Subtitle Downloader",
		binaryName: `${node} ${app}`,
		binaryVersion: "0.0.1",
	});
	// #region command register
	cli.register(ConfigCommand);
	cli.register(DownloadCommand);
	// #endregion
	cli.runExit(args);
}

main();
