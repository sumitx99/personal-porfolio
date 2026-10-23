// Netlify adapter: the handler itself lives in server/chat.js.
import process from 'node:process'
import { chat } from '../../server/chat.js'

export default (request) => chat(request, process.env)
export const config = { path: '/api/chat' }
