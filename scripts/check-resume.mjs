import { readFile } from 'node:fs/promises'
import { profile } from '../src/data.js'

const resume = new URL(`../public${profile.resume}`, import.meta.url)
const bytes = await readFile(resume)
if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
  throw new Error(`Resume download must be a PDF: ${resume.pathname}`)
}
console.log(`Resume PDF verified (${bytes.length.toLocaleString()} bytes).`)
