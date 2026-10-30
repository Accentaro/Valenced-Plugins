import { spawnSync } from 'node:child_process'
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import { zipSync } from 'fflate'

function run(args) {
	const result = spawnSync(process.execPath, args, {
		stdio: 'inherit',
		windowsHide: true,
	})
	if (result.error) throw result.error
	if (result.status !== 0) process.exit(result.status ?? 1)
}
run(['node_modules/typescript/bin/tsc', '--noEmit'])
run([
	'node_modules/@valenced/plugin-cli/bin/valenced-plugin.js',
	'build',
	'--plugins-dir',
	'plugins',
	'--plugins-dir',
	'themes',
])
mkdirSync('build/dist', { recursive: true })
// This directory contains generated ZIPs; discard stale IDs/versions on rebuild.
for (const file of readdirSync('build/dist')) {
	if (file.endsWith('.zip')) rmSync(`build/dist/${file}`)
}
for (const folder of ['plugins', 'themes'].flatMap(dir =>
	readdirSync(dir, { withFileTypes: true }),
)) {
	if (!folder.isDirectory()) continue
	const base = `${folder.parentPath}/${folder.name}/`
	const manifest = readFileSync(`${base}manifest.json`)
	const { id, version, dist } = JSON.parse(manifest)
	if (!dist?.script)
		throw new Error(`${folder.name}: missing script distribution`)
	const bundle = `${base}build/js/index.js`
	run([
		'node_modules/@biomejs/biome/bin/biome',
		'lint',
		'--vcs-enabled=false',
		'--only=correctness/noUndeclaredVariables',
		bundle,
	])
	const files = {
		'manifest.json': manifest,
		[dist.script]: readFileSync(bundle),
	}
	if (dist.android)
		files[dist.android.path] = readFileSync(
			`${base}build/outputs/plugin/plugin.jar`,
		)
	files.LICENSE = readFileSync('LICENSE')
	files['LICENSE.rain'] = readFileSync('LICENSE.rain')
	if (existsSync(`${base}assets`)) {
		for (const entry of readdirSync(`${base}assets`, {
			recursive: true,
			withFileTypes: true,
		})) {
			if (!entry.isFile()) continue
			const path = `${entry.parentPath}/${entry.name}`
			files[path.slice(base.length).replaceAll('\\', '/')] = readFileSync(path)
		}
	}
	writeFileSync(`build/dist/${id}@${version}.zip`, zipSync(files))
	console.log(`Packaged ${id}@${version}`)
}
