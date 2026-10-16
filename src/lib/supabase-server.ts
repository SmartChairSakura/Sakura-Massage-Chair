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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ndhlvkqswysexrdurlrk.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaGx2a3Fzd3lzZXhyZHVybHJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTM5NzY0OCwiZXhwIjoyMTAwOTczNjQ4fQ.x57j7Ev9ETNmuTxxwGTMvjZX0hF4rQbxj2dpEpu4X8I';

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: (url, options = {}) =>
      fetch(url, {
        ...options,
        cache: 'no-store',
      }),
  },
});
