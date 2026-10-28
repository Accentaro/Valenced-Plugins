export interface Repository {
	id: number
	name: string
	description: string | null
	language: string | null
	stargazers_count: number
	owner: { login: string }
}

export interface Day {
	date: string
	level: number
}

export const validLogin = (name: unknown): name is string =>
	typeof name === 'string' && /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(name)

export function parseCalendar(html: string): Day[] {
	const days = new Map<string, Day>()
	for (const [tag] of html.matchAll(/<(?:td|rect)\b[^>]*>/g)) {
		const date = /\bdata-date="(\d{4}-\d{2}-\d{2})"/.exec(tag)?.[1]
		const level = /\bdata-level="([0-4])"/.exec(tag)?.[1]
		if (date && level && Number.isFinite(Date.parse(`${date}T00:00:00Z`)))
			days.set(date, { date, level: Number(level) })
	}
	if (!days.size || days.size > 371)
		throw new Error('GitHub contribution calendar is unavailable.')
	return [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
}

const cache = new Map<string, { expires: number; value: unknown }>()
const requests = new Set<AbortController>()

export function clearData() {
	for (const controller of requests) controller.abort()
	requests.clear()
	cache.clear()
}

async function request<T>(
	url: string,
	read: (response: Response) => Promise<T>,
): Promise<T> {
	const cached = cache.get(url)
	if (cached && cached.expires > Date.now()) return cached.value as T
	const controller = new AbortController()
	requests.add(controller)
	const timeout = setTimeout(() => controller.abort(), 15000)
	try {
		const response = await fetch(url, {
			signal: controller.signal,
			credentials: 'omit',
		})
		if (!response.ok)
			throw new Error(
				response.status === 403 || response.status === 429
					? 'GitHub rate limit reached. Try again later.'
					: response.status === 404
						? 'GitHub account not found.'
						: 'GitHub could not be loaded.',
			)
		const value = await read(response)
		if (!controller.signal.aborted) {
			if (cache.size >= 24) cache.delete(cache.keys().next().value!)
			cache.set(url, { expires: Date.now() + 300000, value })
		}
		return value
	} finally {
		clearTimeout(timeout)
		requests.delete(controller)
	}
}

export function getRepositories(login: string, page: number) {
	if (!validLogin(login) || !Number.isInteger(page) || page < 1)
		throw new Error('Invalid GitHub account or page.')
	return request(
		`https://api.github.com/users/${login}/repos?per_page=30&sort=updated&page=${page}`,
		async response => {
			const data: unknown = await response.json()
			if (
				!Array.isArray(data) ||
				!data.every(
					repo =>
						repo &&
						Number.isSafeInteger(repo.id) &&
						typeof repo.name === 'string' &&
						/^[\w.-]+$/.test(repo.name) &&
						validLogin(repo.owner?.login) &&
						(repo.description === null ||
							typeof repo.description === 'string') &&
						(repo.language === null || typeof repo.language === 'string') &&
						Number.isSafeInteger(repo.stargazers_count) &&
						repo.stargazers_count >= 0,
				)
			)
				throw new Error('GitHub returned invalid repository data.')
			return {
				repos: data as Repository[],
				more: /rel="next"/.test(response.headers.get('link') ?? ''),
			}
		},
	)
}

export function getCalendar(login: string) {
	if (!validLogin(login)) throw new Error('Invalid GitHub account.')
	// Public HTML avoids tokens and third-party proxies; markup changes fail independently of repositories.
	return request(
		`https://github.com/users/${login}/contributions`,
		async response => parseCalendar(await response.text()),
	)
}
