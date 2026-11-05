// Vercel Function: /api/enquiries (tour enquiries and transfer requests). Thin adapter around the host-agnostic router.
import { handle } from '../lib/http/app.mjs';

export const POST = (request) => handle(request);
export const OPTIONS = (request) => handle(request);
