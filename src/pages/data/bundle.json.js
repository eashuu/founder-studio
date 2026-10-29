// Every slot and the cross-track meta in one file, for the skills' data client.
import { bundleText } from '../../lib/data.js';

export const GET = () => new Response(bundleText(), { headers: { 'Content-Type': 'application/json' } });
