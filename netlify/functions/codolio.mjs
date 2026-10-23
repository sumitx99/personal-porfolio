// Netlify adapter: the handler itself lives in server/codolio.js.
import { codolio } from '../../server/codolio.js'

export default (request) => codolio(request)
export const config = { path: '/api/codolio' }
