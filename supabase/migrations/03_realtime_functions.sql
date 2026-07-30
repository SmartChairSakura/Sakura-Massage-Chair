-- Realtime Database Functions and Triggers for Smart Kursi Pijat

-- 1. Function to update transaction status atomically
CREATE OR REPLACE FUNCTION fn_update_transaction_status(
  p_idempotency_key VARCHAR(100),
  p_status VARCHAR(20)
)
RETURNS TABLE (
  id UUID,
  idempotency_key VARCHAR(100),
  chair_id VARCHAR(50),
  status VARCHAR(20),
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE transactions
  SET 
    status = p_status,
    session_start_at = CASE WHEN p_status = 'ONGOING' AND session_start_at IS NULL THEN NOW() ELSE session_start_at END,
    cancelled_at = CASE WHEN p_status = 'CANCELLED' THEN NOW() ELSE cancelled_at END,
    updated_at = NOW()
  WHERE transactions.idempotency_key = p_idempotency_key
  RETURNING 
    transactions.id,
    transactions.idempotency_key,
    transactions.chair_id,
    transactions.status,
    transactions.updated_at;
END;
$$;

-- 2. Trigger function to auto-update 'updated_at' column
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();
