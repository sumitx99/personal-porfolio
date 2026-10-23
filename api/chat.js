// Vercel adapter: the handler itself lives in server/chat.js.
import process from 'node:process'
import { chat } from '../server/chat.js'

export const POST = (request) => chat(request, process.env)
