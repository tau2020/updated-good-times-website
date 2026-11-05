// Vercel Function: /api/enquiries/:id/status (status links from the team email).
// GET shows a confirmation page; POST applies the change.
import { handle } from '../../../lib/http/app.mjs';

export const GET = (request) => handle(request);
export const POST = (request) => handle(request);
