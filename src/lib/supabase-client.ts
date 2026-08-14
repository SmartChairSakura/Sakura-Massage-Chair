import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ndhlvkqswysexrdurlrk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_hfgz7141NMMgk85gCYtA6w_aY3no7xX';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
