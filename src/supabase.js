import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Without this, createClient() throws during module load and the whole
  // React bundle crashes before anything renders — a blank white screen
  // with no clue why. This shows the actual problem instead.
  document.body.innerHTML =
    '<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:80px auto;padding:24px;text-align:center;color:#111;">' +
    '<h2 style="margin-bottom:12px;">Configuration missing</h2>' +
    '<p style="color:#555;line-height:1.6;">REACT_APP_SUPABASE_URL and/or REACT_APP_SUPABASE_ANON_KEY are not set. ' +
    'Add them in Vercel → Project → Settings → Environment Variables, then redeploy ' +
    '(these are baked in at build time, so adding them alone is not enough — trigger a fresh deploy).</p>' +
    '</div>';
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
