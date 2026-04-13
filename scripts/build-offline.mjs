import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { build } from 'vite'
import { copyImpressumFile, readImpressumContent } from './copy-impressum.mjs'

const distDir = path.resolve('dist')

await rm(distDir, { recursive: true, force: true })

const buildResult = await build({
	define: {
		'process.env.NODE_ENV': JSON.stringify('production'),
		'process.env': '{}',
		process: JSON.stringify({ env: {} }),
	},
	build: {
		emptyOutDir: false,
		write: false,
		cssCodeSplit: false,
		modulePreload: false,
		lib: {
			entry: path.resolve('src/main.ts'),
			name: 'SvwsConferenceApp',
			formats: ['iife'],
		},
		rollupOptions: {
			output: {
				entryFileNames: 'assets/[name].js',
				assetFileNames: 'assets/[name][extname]',
			},
		},
	},
})

const outputs = Array.isArray(buildResult) ? buildResult : [buildResult]
const bundleEntries = outputs.flatMap(result => ('output' in result ? result.output : []))

let entryScript = ''
let stylesheet = ''

for (const asset of bundleEntries) {
	const targetPath = path.join(distDir, asset.fileName)
	await mkdir(path.dirname(targetPath), { recursive: true })

	if (asset.type === 'chunk') {
		if (asset.isEntry && !entryScript) {
			entryScript = asset.fileName
		}
		await writeFile(targetPath, asset.code, 'utf8')
		continue
	}

	if (!stylesheet && asset.fileName.endsWith('.css')) {
		stylesheet = asset.fileName
	}

	await writeFile(targetPath, asset.source)
}

if (!entryScript) {
	throw new Error('Offline-Build fehlgeschlagen: Kein Einstiegsskript wurde erzeugt.')
}

const impressumMarkdown = await readImpressumContent()
const impressumScript = impressumMarkdown
	? `\n\t\t<script>window.__IMPRESSUM_MARKDOWN__=${JSON.stringify(impressumMarkdown)}<\/script>`
	: ''

const stylesheetTag = stylesheet
	? `\n    <link rel="stylesheet" href="./${stylesheet}" />`
	: ''

const html = `<!doctype html>
<html lang="de">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<meta
			http-equiv="Content-Security-Policy"
			content="default-src 'self' file:; script-src 'self' file: 'unsafe-inline'; style-src 'self' file: 'unsafe-inline'; img-src 'self' file: data: blob:; font-src 'self' file: data:; connect-src 'self' file: http: https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
		/>
		<meta name="referrer" content="no-referrer" />
		<title>SVWS Konferenzübersicht</title>${stylesheetTag}${impressumScript}
	</head>
	<body>
		<div id="app"></div>
		<script src="./${entryScript}"></script>
	</body>
</html>
`

await writeFile(path.join(distDir, 'index.html'), html, 'utf8')
await copyImpressumFile(distDir)
