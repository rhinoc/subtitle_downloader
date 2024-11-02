interface RequestParams<
	Body extends Record<string, unknown>,
	Params extends Record<string, unknown>,
> {
	url: string;
	params?: Params;
	headers?: Record<string, string>;
	body?: Body;
}

export async function get<
	Params extends Record<string, unknown>,
	Response extends Record<string, unknown>,
>({
	url,
	params,
	headers = {},
}: Omit<RequestParams<Record<string, unknown>, Params>, "body">) {
	const urlObj = new URL(url);
	for (const [k, v] of Object.entries(params ?? {})) {
		urlObj.searchParams.set(k, String(v));
	}

	const resp = await fetch(urlObj.href, {
		headers,
		method: "get",
	});

	if (resp.status !== 200) {
		// console.error(await resp.text());
		throw new Error(`get request status error: ${resp.status}`);
	}

	try {
		const json = (await resp.json()) as Response;
		return json;
	} catch (ex) {
		// console.error(await resp.text());
		// biome-ignore lint/complexity/noUselessCatch: <explanation>
		throw ex;
	}
}

export async function post<
	Body extends Record<string, unknown>,
	Params extends Record<string, unknown>,
	Response extends Record<string, unknown>,
>({ url, params, headers = {}, body }: RequestParams<Body, Params>) {
	const urlObj = new URL(url);
	for (const [k, v] of Object.entries(params ?? {})) {
		urlObj.searchParams.set(k, String(v));
	}

	const bodyStr = body ? JSON.stringify(body) : undefined;

	const resp = await fetch(urlObj.href, {
		headers,
		body: bodyStr,
		method: "post",
	});

	if (resp.status !== 200) {
		// console.error(await resp.text());
		throw new Error(`post request status error: ${resp.status}`);
	}

	try {
		const json = (await resp.json()) as Response;
		return json;
	} catch (ex) {
		// console.error(await resp.text());
		// biome-ignore lint/complexity/noUselessCatch: <explanation>
		throw ex;
	}
}
