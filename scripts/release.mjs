import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { zipSync } from 'fflate'

const { version } = JSON.parse(readFileSync('./package.json', 'utf8'))
const distDir = path.resolve('dist')
const releaseDir = path.resolve('release')
const zipName = `svws-conference-${version}-webserver.zip`

const SIGN_SCRIPT = process.env.SIGN_SCRIPT ?? path.join(os.homedir(), 'git/svws-sign-linux/sign-windows-exe.sh')
const SAFENET_MODULE = process.env.SAFENET_MODULE ?? '/usr/lib/libeToken.so'

console.log('Bereinige Release-Verzeichnis...')
await rm(releaseDir, { recursive: true, force: true })

console.log('Baue Projekt...')
execSync('npm run build', { stdio: 'inherit' })

console.log('Baue Electron-App (Linux AppImage + Windows NSIS)...')
execSync('npx electron-builder --linux AppImage --win nsis', { stdio: 'inherit' })

function safenetTokenPresent() {
  if (!existsSync(SAFENET_MODULE)) return false
  try {
    const out = execSync(`pkcs11-tool --module "${SAFENET_MODULE}" --list-token-slots`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return /token label/i.test(out)
  } catch {
    return false
  }
}

function signWindowsInstaller() {
  const installerName = readdirSync(releaseDir).find((name) => name.endsWith('.exe'))
  if (!installerName) return

  const installerPath = path.join(releaseDir, installerName)

  if (!existsSync(SIGN_SCRIPT)) {
    console.log('Signier-Skript nicht gefunden — Windows-Installer bleibt unsigniert.')
    return
  }
  if (!safenetTokenPresent()) {
    console.log('Kein SafeNet eToken erkannt — Windows-Installer bleibt unsigniert.')
    return
  }

  console.log('Signiere Windows-Installer (SafeNet eToken)...')
  try {
    execSync(`"${SIGN_SCRIPT}" --token safenet "${installerPath}" "${installerPath}"`, { stdio: 'inherit' })
  } catch (err) {
    console.warn(`Signieren fehlgeschlagen (${err.message}) — Installer bleibt unsigniert.`)
  }
}

signWindowsInstaller()

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

console.log('Erstelle Webserver-ZIP...')
await mkdir(releaseDir, { recursive: true })
const zipped = zipSync(collectFiles(distDir))
await writeFile(path.join(releaseDir, zipName), zipped)

console.log(`Release erstellt: release/${zipName}`)
