import { post } from "../../util/request";
import { BASE_URL } from "./base";

interface DownloadRequest extends Record<string, unknown> {
	file_id: number;
	sub_format?: string;
	file_name?: string;
	in_fps?: number;
	out_fps?: number;
	timeshift?: number;
	force_download?: boolean;
}

interface DownloadResponse extends Record<string, unknown> {
	link: string;
	file_name: string;
	requests: number;
	remaining: number;
	message: string;
	rest_time: string;
	rest_time_utc: number;
}

export interface DownloadParams {
	id: number;
	fileName: string;
	destPath: string;
	apiKey: string;
}

export async function download({
	id,
	fileName,
	destPath,
	apiKey,
}: DownloadParams) {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const resp = await post<DownloadRequest, any, DownloadResponse>({
		url: `${BASE_URL}/api/v1/download`,
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			"Api-Key": apiKey,
		},
		body: {
			file_id: id,
		},
	});

	if (!resp.file_name) {
		throw new Error(JSON.stringify(resp));
	}

	const fileSuffix = resp.file_name.split(".").pop();
	const fileResp = await fetch(resp.link);
	const fileBuffer = await fileResp.arrayBuffer();

	await Bun.write(
		`${destPath}/${fileName}.${fileSuffix}`,
		new Uint8Array(fileBuffer),
	);
}
