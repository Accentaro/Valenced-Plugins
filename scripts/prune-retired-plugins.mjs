import { readFileSync, writeFileSync } from 'node:fs'

const file = process.argv[2]
if (!file)
	throw new Error('Usage: node scripts/prune-retired-plugins.mjs <index.json>')
const index = JSON.parse(readFileSync(file, 'utf8'))
const migrations = JSON.parse(
	readFileSync(new URL('../plugin-migrations.json', import.meta.url), 'utf8'),
)
for (const [oldId, newId] of Object.entries(migrations)) {
	// Keep legacy downloads, but hide duplicate listings once the replacement exists.
	if (index.plugins[newId]) delete index.plugins[oldId]
}
writeFileSync(file, `${JSON.stringify(index, null, 2)}\n`)
