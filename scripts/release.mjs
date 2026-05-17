import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { zipSync } from 'fflate'

const { version } = JSON.parse(readFileSync('./package.json', 'utf8'))
const distDir = path.resolve('dist')
const releaseDir = path.resolve('release')
const zipName = `svws-conference-${version}.zip`

console.log('Baue Projekt...')
execSync('npm run build', { stdio: 'inherit' })

function collectFiles(dir, base = '') {
  const entries = {}
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const relative = base ? `${base}/${name}` : name
    if (statSync(full).isDirectory()) {
      Object.assign(entries, collectFiles(full, relative))
    } else {
      entries[relative] = readFileSync(full)
    }
  }
  return entries
}

console.log('Erstelle ZIP...')
await mkdir(releaseDir, { recursive: true })
const zipped = zipSync(collectFiles(distDir))
await writeFile(path.join(releaseDir, zipName), zipped)

console.log(`Release erstellt: release/${zipName}`)
