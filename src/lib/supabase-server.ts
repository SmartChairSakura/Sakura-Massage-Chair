import { createClient } from '@supabase/supabase-js';

// Polyfill DummyWebSocket for Node.js 20 serverless environment
if (typeof window === 'undefined' && !globalThis.WebSocket) {
  class DummyWebSocket {
    constructor() {}
    addEventListener() {}
    removeEventListener() {}
    close() {}
  }
  (globalThis as any).WebSocket = DummyWebSocket;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ndhlvkqswysexrdurirk.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_WB0_tyaqbuME1ZvlqQDWqq_YNjRl6ch';

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
