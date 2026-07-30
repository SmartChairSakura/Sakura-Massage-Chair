-- RLS (Row Level Security) Policies for Smart Kursi Pijat

-- Enable RLS on chairs and transactions
ALTER TABLE chairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 1. Policies for 'chairs' table
-- Allow anonymous users (kiosk client) to READ active chairs
CREATE POLICY "Allow anon select active chairs"
  ON chairs FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Allow service_role to manage all chair operations
CREATE POLICY "Allow service_role full access on chairs"
  ON chairs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Policies for 'transactions' table
-- Allow anonymous users to INSERT new transactions (kiosk order creation)
CREATE POLICY "Allow anon insert transactions"
  ON transactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anonymous users to SELECT their transaction status
CREATE POLICY "Allow anon select transactions"
  ON transactions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anonymous users to UPDATE PENDING transactions (e.g. mark as paid or cancelled)
CREATE POLICY "Allow anon update pending transactions"
  ON transactions FOR UPDATE
  TO anon, authenticated
  USING (status IN ('PENDING', 'ONGOING'))
  WITH CHECK (true);

-- Allow service_role to perform all operations on transactions
CREATE POLICY "Allow service_role full access on transactions"
  ON transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
