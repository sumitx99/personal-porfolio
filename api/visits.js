// Vercel adapter: the handler itself lives in server/visits.js.
import process from 'node:process'
import { visits } from '../server/visits.js'

export const GET = (request) => visits(request, process.env)
export const POST = (request) => visits(request, process.env)
