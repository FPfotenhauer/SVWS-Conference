import { mkdir, rm, writeFile } from 'node:fs/promises'
import { build } from 'esbuild'

const distDir = 'dist'
const assetsDir = `${distDir}/assets`

await rm(distDir, { recursive: true, force: true })
await mkdir(assetsDir, { recursive: true })

await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  outfile: `${assetsDir}/app.js`,
})

const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SVWS Konferenzübersicht</title>
    <link rel="stylesheet" href="./assets/app.css" />
  </head>
  <body>
    <div id="app"></div>
    <script src="./assets/app.js"></script>
  </body>
</html>
`

await writeFile(`${distDir}/index.html`, html, 'utf8')
