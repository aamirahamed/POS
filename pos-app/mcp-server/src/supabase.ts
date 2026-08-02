import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root pos-app .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// For MCP server we ideally want the Service Role Key to bypass RLS, but if RLS policies
// allow the anon key + user auth, we can use that. However, MCP doesn't have a login session.
// So we MUST use the Service Role Key, OR we configure Supabase to use anon key and we pass
// the user_id manually if RLS allows it (unlikely without auth token).
// For now, we will use VITE_SUPABASE_SERVICE_ROLE_KEY if available, else anon key (which might fail RLS).
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

export const MCP_USER_ID = process.env.MCP_USER_ID;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

if (!MCP_USER_ID) {
  console.error("Missing MCP_USER_ID in .env. Please add it so the MCP server knows which user to sync data for.");
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, serviceKey);
