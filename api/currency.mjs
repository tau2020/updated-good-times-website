// Vercel Function: /api/currency. The visitor's likely display currency and today's exchange rates.
import { handle } from '../lib/http/app.mjs';

export const GET = (request) => handle(request, { country: request.headers.get('x-vercel-ip-country') || '' });
