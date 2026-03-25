import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables.");
}

// using service key for backend admin tasks
export const supabaseAdmin = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseServiceKey || 'placeholder-key', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
