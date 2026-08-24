import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pngToIco from 'png-to-ico'
import sharp from 'sharp'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const source = path.join(projectRoot, 'assets', 'icon.svg')
const destination = path.join(projectRoot, 'assets', 'icon.ico')
const sizes = [16, 24, 32, 48, 64, 128, 256]
const pngs = await Promise.all(sizes.map((size) => sharp(source)
  .resize(size, size)
  .png()
  .toBuffer()))

await fs.writeFile(destination, await pngToIco(pngs))
