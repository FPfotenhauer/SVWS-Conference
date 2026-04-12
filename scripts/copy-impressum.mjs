import { copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const impressumPath = path.join(projectRoot, 'impressum.md')
const impressumExamplePath = path.join(projectRoot, 'impressum.example.md')

export async function copyImpressumFile(distDir = path.join(projectRoot, 'dist')) {
  const targetPath = path.join(distDir, 'impressum.md')

  try {
    await copyFile(impressumPath, targetPath)
    return 'impressum.md'
  } catch {
    await copyFile(impressumExamplePath, targetPath)
    return 'impressum.example.md'
  }
}

const runAsScript = process.argv[1]
  ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  : false

if (runAsScript) {
  const copiedSource = await copyImpressumFile()
  console.log(`Impressum copied from ${copiedSource}`)
}
