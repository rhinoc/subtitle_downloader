import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import { Command, Option } from "clipanion";
import { configManager } from "../util/config-manager";
import { OpenSubtitlesApi } from "../api/open-subtitles";
import { VIDEO_EXTS } from "../constant/extension";
import { LANGUAGES } from "../constant/language";

export class DownloadCommand extends Command {
	static paths = [["download"], Command.Default];

	id = Option.String("--id");
	idType = Option.String("--id-type");
	type = Option.String("--type");

	async execute(): Promise<number | undefined> {
		if (!this.id) {
			this.context.stderr.write("❌ [--id] should be provided\n");
			return;
		}

		if (!this.idType || (this.idType !== "imdb" && this.idType !== "tmdb")) {
			this.idType = "imdb";
			this.context.stdout.write(
				"no [--id-type=imdb|tmdb] provided, default is imdb\n",
			);
		}

		if (!this.type || (this.type !== "movie" && this.type !== "tv")) {
			this.type = "tv";
			this.context.stdout.write(
				"no [--type=movie|tv] provided, default is tv\n",
			);
		}

		let id = 0;
		if (this.id.startsWith("tt")) {
			id = Number.parseInt(this.id.substring(2), 10);
		} else {
			id = Number.parseInt(this.id, 10);
		}

		if (!Number.isFinite(id) || id === 0) {
			this.context.stderr.write(
				`❌ provided id ${this.id} is invalid, which should be like tt0118375\n`,
			);
			return;
		}

		const config = await configManager.getConfig();
		if (!config || !config.openSubtitles?.apiKey) {
			this.context.stderr.write(
				"❌ no apiKey found, please run config --key [api_key] to set your api key\n",
			);
			return;
		}
		const { apiKey } = config.openSubtitles;

		// get source files
		const srcPath = process.cwd();
		const fileInfos = getFileList(srcPath);
		const videoFileInfos = fileInfos.filter((file) =>
			VIDEO_EXTS.includes(file.extension.toLowerCase()),
		);

		// for each video
		const regex = /S(\d\d)E(\d\d)/;
		let successCount = 0;
		for (const video of videoFileInfos) {
			this.context.stdout.write(
				util.styleText("bold", `${util.styleText("blue", video.fileName)}\n`),
			);
			try {
				const [success, msg] = await searchAndDownloadSubtitle({
					id,
					idType: this.idType as "imdb" | "tmdb",
					video,
					regex,
					apiKey,
					log: (str: string) => {
						this.context.stdout.write(`  🔹 ${str}\n`);
					},
					type: this.type as "tv" | "movie",
				});
				if (success) {
					successCount++;
					this.context.stdout.write(`  ✅ ${msg}\n`);
				} else {
					this.context.stderr.write(`  🔺 ${msg}\n`);
				}
			} catch (ex) {
				this.context.stderr.write(`  🔺 ${ex}\n`);
			}
		}
		this.context.stdout.write(
			`\ndownload ${util.styleText("green", String(successCount))} subtitles from ${videoFileInfos.length} files\n`,
		);
	}
}

interface FileInfo {
	srcPath: string;
	fileName: string;
	extension: string;
}

function getFileList(srcPath: string): FileInfo[] {
	const fileInfos: FileInfo[] = [];

	const nodes = fs.readdirSync(srcPath);
	for (const file of nodes) {
		const nodePath = path.join(srcPath, file);
		const nodeStat = fs.statSync(nodePath);
		if (nodeStat.isDirectory()) {
			fileInfos.push(...getFileList(nodePath));
		} else if (nodeStat.isFile()) {
			const ext = file.split(".").pop() ?? "";
			const fileName = file.slice(
				0,
				file.length - (ext.length ? ext.length + 1 : 0),
			);
			fileInfos.push({
				srcPath: path.join(srcPath, file),
				fileName,
				extension: ext,
			});
		}
	}

	return fileInfos;
}

interface SearchAndDownloadSubtitleParams {
	id: number;
	idType: "imdb" | "tmdb";
	video: FileInfo;
	regex: RegExp;
	apiKey: string;
	log: (str: string) => void;
	type: "movie" | "tv";
}

async function searchAndDownloadSubtitle({
	id,
	idType,
	video,
	regex,
	apiKey,
	type,
	log,
}: SearchAndDownloadSubtitleParams): Promise<[boolean, string]> {
	let searchResult: Awaited<ReturnType<typeof OpenSubtitlesApi.search>>;

	if (type === "tv") {
		// get episode and season
		const regexResult = regex.exec(video.fileName);
		if (!regexResult) {
			return [false, "fail to parse season and episode info from file name"];
		}
		const season = Number(regexResult[1]);
		const episode = Number(regexResult[2]);
		if (!Number.isFinite(season) || !Number.isFinite(episode)) {
			return [false, "fail to parse season and episode info from file name"];
		}

		log(`extracted info: season=${season} episode=${episode}`);

		// do search
		searchResult = await OpenSubtitlesApi.search({
			id,
			idType,
			episode,
			season,
			languages: LANGUAGES, // @todo as params
			type: "tv",
			apiKey,
		});
	} else {
		searchResult = await OpenSubtitlesApi.search({
			id,
			idType,
			languages: LANGUAGES,
			type: "movie",
			apiKey,
		});
	}

	// parse response
	let subtitles = searchResult.data.map((item) => ({
		id: item.id,
		type: item.type,
		...item.attributes,
	}));

	// sort by language and votes and new_download_count
	const sort = (a: (typeof subtitles)[0], b: (typeof subtitles)[0]) => {
		if (a.language === b.language) {
			if (b.ratings !== a.ratings) {
				return b.ratings - a.ratings;
			}
			return b.new_download_count - a.new_download_count;
		}

		const aIndex = LANGUAGES.indexOf(a.language);
		const bIndex = LANGUAGES.indexOf(b.language);

		return aIndex - bIndex;
	};
	subtitles = subtitles.sort(sort);
	if (!subtitles.length) {
		return [false, "not found"];
	}

	const { files, language, url } = subtitles[0];
	const { file_id, file_name } = files[0];
	log(`found [${util.styleText("italic", file_name)}] from ${url}`);

	const subtitleFileName = `${video.fileName}.${language}`;
	const subtitleFileDir = path.dirname(video.srcPath);
	const newSubtitleFilePath = path.join(
		subtitleFileDir,
		`${subtitleFileName}.srt`,
	);

	if (await Bun.file(newSubtitleFilePath).exists()) {
		return [false, `subtitle already exist for ${newSubtitleFilePath}`];
	}

	await OpenSubtitlesApi.download({
		destPath: subtitleFileDir,
		fileName: subtitleFileName,
		id: file_id,
		apiKey,
	});

	return [true, "downloaded successfully"];
}
