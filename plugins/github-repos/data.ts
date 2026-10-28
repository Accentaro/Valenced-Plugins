export interface Repository {
	id: number
	name: string
	description: string | null
	language: string | null
	stargazers_count: number
	updated_at: string
	owner: { login: string }
	forks_count?: number
	open_issues_count?: number
	created_at?: string
	pushed_at?: string
	default_branch?: string
	license?: { name: string } | null
	topics?: string[]
	archived?: boolean
	fork?: boolean
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
const inFlight = new Map<string, Promise<unknown>>()
const requests = new Set<AbortController>()

function repoUrl(login: string, page: number) {
	return `https://api.github.com/users/${login}/repos?per_page=100&sort=updated&page=${page}`
}

export function getCachedProfile(login: string) {
	const repos: Repository[] = []
	let page = 1
	let more = true
	while (more) {
		const entry = cache.get(repoUrl(login, page))
		if (!entry || entry.expires <= Date.now()) break
		const result = entry.value as { repos: Repository[]; more: boolean }
		repos.push(...result.repos)
		more = result.more
		page++
	}
	const calendar = cache.get(`https://github.com/users/${login}/contributions`)
	return {
		repos,
		page,
		more,
		days:
			calendar && calendar.expires > Date.now()
				? (calendar.value as Day[])
				: undefined,
	}
}

export function clearData() {
	for (const controller of requests) controller.abort()
	requests.clear()
	inFlight.clear()
	cache.clear()
}

function request<T>(
	url: string,
	read: (response: Response) => Promise<T>,
): Promise<T> {
	const existing = inFlight.get(url)
	if (existing) return existing as Promise<T>
	const pending = fetchData(url, read).finally(() => {
		if (inFlight.get(url) === pending) inFlight.delete(url)
	})
	inFlight.set(url, pending)
	return pending
}

async function fetchData<T>(
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
	return request(repoUrl(login, page), async response => {
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
					(repo.description === null || typeof repo.description === 'string') &&
					(repo.language === null || typeof repo.language === 'string') &&
					typeof repo.updated_at === 'string' &&
					Number.isFinite(Date.parse(repo.updated_at)) &&
					Number.isSafeInteger(repo.stargazers_count) &&
					repo.stargazers_count >= 0,
			)
		)
			throw new Error('GitHub returned invalid repository data.')
		return {
			repos: data.map(repo => ({
				id: repo.id,
				name: repo.name,
				description: repo.description,
				language: repo.language,
				stargazers_count: repo.stargazers_count,
				updated_at: repo.updated_at,
				owner: { login: repo.owner.login },
				forks_count: Number.isSafeInteger(repo.forks_count)
					? repo.forks_count
					: undefined,
				open_issues_count: Number.isSafeInteger(repo.open_issues_count)
					? repo.open_issues_count
					: undefined,
				created_at:
					typeof repo.created_at === 'string' &&
					Number.isFinite(Date.parse(repo.created_at))
						? repo.created_at
						: undefined,
				pushed_at:
					typeof repo.pushed_at === 'string' &&
					Number.isFinite(Date.parse(repo.pushed_at))
						? repo.pushed_at
						: undefined,
				default_branch:
					typeof repo.default_branch === 'string'
						? repo.default_branch
						: undefined,
				license:
					typeof repo.license?.name === 'string'
						? { name: repo.license.name }
						: null,
				topics:
					Array.isArray(repo.topics) &&
					repo.topics.every((topic: unknown) => typeof topic === 'string')
						? (repo.topics as string[])
						: [],
				archived: repo.archived === true,
				fork: repo.fork === true,
			})),
			more: /rel="next"/.test(response.headers.get('link') ?? ''),
		}
	})
}

export function getCalendar(login: string) {
	if (!validLogin(login)) throw new Error('Invalid GitHub account.')
	// Public HTML avoids tokens and third-party proxies; markup changes fail independently of repositories.
	return request(
		`https://github.com/users/${login}/contributions`,
		async response => parseCalendar(await response.text()),
	)
}

export type RepoSort = 'updated' | 'stars' | 'name'
export const sortLabels: Record<RepoSort, string> = {
	updated: 'Recently updated',
	stars: 'Most starred',
	name: 'Name',
}
export function sortRepositories(repos: Repository[], sort: RepoSort) {
	return [...repos].sort(
		(a, b) =>
			(sort === 'stars'
				? b.stargazers_count - a.stargazers_count
				: sort === 'updated'
					? Date.parse(b.updated_at) - Date.parse(a.updated_at)
					: 0) || a.name.localeCompare(b.name),
	)
}
