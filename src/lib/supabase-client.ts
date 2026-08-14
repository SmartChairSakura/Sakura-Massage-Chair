import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ndhlvkqswysexrdurlrk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaGx2a3Fzd3lzZXhyZHVybHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzOTc2NDgsImV4cCI6MjEwMDk3MzY0OH0.sNNN14Lm6s5G1vIOiC8AQReyl_zM-5EZQawQjneGy_k';

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
