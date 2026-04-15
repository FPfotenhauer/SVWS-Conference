import { copyFile, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const impressumPath = path.join(projectRoot, 'impressum.md')
const impressumExamplePath = path.join(projectRoot, 'impressum.example.md')

export async function readImpressumContent(useExampleOnly = false) {
  const filesToTry = useExampleOnly
    ? [impressumExamplePath, impressumPath]
    : [impressumPath, impressumExamplePath]

  for (const filePath of filesToTry) {
    try {
      return await readFile(filePath, 'utf8')
    } catch {
      // Continue to next file
    }
  }
  return ''
}

export async function copyImpressumFile(distDir = path.join(projectRoot, 'dist'), useExampleOnly = false) {
  const targetPath = path.join(distDir, 'impressum.md')
  const sourcesToTry = useExampleOnly
    ? [impressumExamplePath, impressumPath]
    : [impressumPath, impressumExamplePath]

  for (const sourceFile of sourcesToTry) {
    try {
      await copyFile(sourceFile, targetPath)
      return path.basename(sourceFile)
    } catch {
      // Continue to next file
    }
  }
  throw new Error('Konnte weder impressum.md noch impressum.example.md kopieren')
}

export async function writeImpressumJs(distDir = path.join(projectRoot, 'dist')) {
  const content = await readImpressumContent(true)
  // Backticks und Template-Literal-Ausdrücke im Inhalt escapen
  const escaped = content
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
  const js = [
    '// IMPRESSUM-DATEI',
    '// Bitte passen Sie diesen Text an Ihre Schuladaten an.',
    '// Sie können Markdown-Formatierung verwenden (**fett**, _kursiv_, ## Überschrift usw.)',
    `window.__IMPRESSUM_MARKDOWN__ = \`${escaped}\`;`,
  ].join('\n')
  await writeFile(path.join(distDir, 'impressum.example.js'), js, 'utf8')
}

const runAsScript = process.argv[1]
  ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  : false

if (runAsScript) {
  const copiedSource = await copyImpressumFile()
  console.log(`Impressum copied from ${copiedSource}`)
}
