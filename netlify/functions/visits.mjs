// Netlify adapter: the handler itself lives in server/visits.js.
import process from 'node:process'
import { visits } from '../../server/visits.js'

export default (request) => visits(request, process.env)
export const config = { path: '/api/visits' }
