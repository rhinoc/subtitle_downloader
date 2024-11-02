import { get } from "../../util/request";
import { BASE_URL } from "./base";

interface SearchRequest extends Record<string, unknown> {
	episode_number?: number;
	id?: number;
	imdb_id?: number;
	languages?: string;
	parent_imdb_id?: number;
	parent_tmdb_id?: number;
	season_number?: number;
	tmdb_id?: number;
	machine_translated?: "exclude" | "include";
	ai_translated?: "exlude" | "include";
	type?: "movie" | "episode" | "all";
}

interface SearchResponse extends Record<string, unknown> {
	total_pages: number;
	total_count: number;
	per_page: number;
	page: number;
	data: {
		id: string;
		type: string;
		attributes: {
			language: string;
			download_count: number;
			new_download_count: number;
			hd: boolean;
			fps: boolean;
			from_trusted: boolean;
			url: string;
			ratings: number;
			votes: number;
			files: {
				file_id: number;
				file_name: string;
			}[];
		};
	}[];
}

interface SearchBaseOptions {
	id: number;
	idType: "tmdb" | "imdb";
	languages: string[];
	apiKey: string;
}

interface SearchMovieOptions extends SearchBaseOptions {
	type: "movie";
}

interface SearchTVOptions extends SearchBaseOptions {
	type: "tv";

	season: number;
	episode: number;
}

export async function search(options: SearchMovieOptions | SearchTVOptions) {
	const params: SearchRequest = {
		languages: options.languages.sort().join(","),
	};
	if (options.type === "movie") {
		params.type = "movie";
		if (options.idType === "imdb") {
			params.imdb_id = options.id;
		}
		if (options.idType === "tmdb") {
			params.tmdb_id = options.id;
		}
	} else {
		params.type = "episode";
		if (options.idType === "imdb") {
			params.parent_imdb_id = options.id;
		}
		if (options.idType === "tmdb") {
			params.parent_tmdb_id = options.id;
		}
		params.episode_number = options.episode;
		params.season_number = options.season;
	}

	const resp = await get<SearchRequest, SearchResponse>({
		url: `${BASE_URL}/api/v1/subtitles`,
		params,
		headers: {
			"Api-Key": options.apiKey,
		},
	});

	return resp;
}
