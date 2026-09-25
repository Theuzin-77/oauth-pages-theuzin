export async function ensureTables(db){
  await db.exec(`CREATE TABLE IF NOT EXISTS transactions (
    tx_hash TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    state_hash TEXT NOT NULL,
    code_verifier TEXT NOT NULL,
    nonce TEXT,
    redirect_uri TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`);
  await db.exec(`CREATE TABLE IF NOT EXISTS sessions (
    session_hash TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    user_id TEXT NOT NULL,
    email TEXT,
    name TEXT,
    avatar TEXT,
    login TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_tx_exp ON transactions(expires_at)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_sess_exp ON sessions(expires_at)`);
  const now = Math.floor(Date.now()/1000);
  await db.batch([
    db.prepare(`DELETE FROM transactions WHERE expires_at < ?`).bind(now),
    db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).bind(now),
  ]);
}
