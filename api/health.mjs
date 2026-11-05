// Vercel Function: /api/health. Reports whether enquiries are live, in preview or disabled.
import { handle } from '../lib/http/app.mjs';

export const GET = (request) => handle(request);
