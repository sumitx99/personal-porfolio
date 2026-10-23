// Cloudflare Pages adapter: the handler itself lives in server/chat.js.
import { chat } from '../../server/chat.js'

export const onRequest = ({ request, env }) => chat(request, env)
