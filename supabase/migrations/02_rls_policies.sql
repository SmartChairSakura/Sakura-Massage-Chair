-- RLS (Row Level Security) Policies for Smart Kursi Pijat

-- Enable RLS on chairs and transactions
ALTER TABLE chairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 1. Policies for 'chairs' table
DROP POLICY IF EXISTS "Allow anon select active chairs" ON chairs;
CREATE POLICY "Allow anon select active chairs"
  ON chairs FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Allow service_role full access on chairs" ON chairs;
CREATE POLICY "Allow service_role full access on chairs"
  ON chairs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Policies for 'transactions' table
DROP POLICY IF EXISTS "Allow anon insert transactions" ON transactions;
CREATE POLICY "Allow anon insert transactions"
  ON transactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon select transactions" ON transactions;
CREATE POLICY "Allow anon select transactions"
  ON transactions FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow anon update pending transactions" ON transactions;
CREATE POLICY "Allow anon update pending transactions"
  ON transactions FOR UPDATE
  TO anon, authenticated
  USING (status IN ('PENDING', 'ONGOING'))
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access on transactions" ON transactions;
CREATE POLICY "Allow service_role full access on transactions"
  ON transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
