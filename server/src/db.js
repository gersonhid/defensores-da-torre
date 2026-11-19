/*
 * Banco de dados.
 *  - Produção (Railway): PostgreSQL via DATABASE_URL.
 *  - Sem DATABASE_URL (desenvolvimento/testes): PGlite, um PostgreSQL embutido, em ./data/dev-db.
 * As tabelas são criadas/atualizadas automaticamente ao iniciar (migrate()).
 */
const path = require('path');

let impl = null;

async function connect() {
  if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    const ssl = /localhost|127\.0\.0\.1|\.railway\.internal/.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false };
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl, max: 10 });
    impl = { query: (text, params) => pool.query(text, params), close: () => pool.end(), kind: 'postgres' };
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const dir = process.env.PGLITE_DIR || path.join(__dirname, '..', 'data', 'dev-db');
    const db = dir === 'memory' ? new PGlite() : new PGlite(dir);
    await db.waitReady;
    impl = { query: (text, params) => db.query(text, params), close: () => db.close(), kind: 'pglite' };
  }
  await migrate();
  return impl.kind;
}

const query = (text, params) => impl.query(text, params);

async function migrate() {
  const steps = [
    `CREATE TABLE IF NOT EXISTS users (
       id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       kind          TEXT NOT NULL DEFAULT 'convidado',      -- convidado | usuario | google
       username      TEXT,
       username_key  TEXT UNIQUE,                            -- nome em minúsculas (único)
       password_hash TEXT,
       google_sub    TEXT UNIQUE,
       email         TEXT,
       display_name  TEXT,
       photo_url     TEXT,
       created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
       last_seen     TIMESTAMPTZ NOT NULL DEFAULT now(),
       sessions      INTEGER NOT NULL DEFAULT 0,
       device        JSONB,                                  -- aparelho mais recente
       app_version   TEXT,
       merged_into   UUID                                    -- convidado que entrou numa conta existente
     )`,
    `CREATE TABLE IF NOT EXISTS saves (
       user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
       data       JSONB NOT NULL,
       score      BIGINT NOT NULL DEFAULT 0,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
    `CREATE TABLE IF NOT EXISTS sessions (
       id          BIGSERIAL PRIMARY KEY,
       user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
       app_version TEXT,
       device      JSONB
     )`,
    `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id, started_at DESC)`,
    `CREATE INDEX IF NOT EXISTS users_last_seen_idx ON users(last_seen DESC)`,
    // indicação de amigos (docs/INDICACAO.md)
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS ref_code TEXT UNIQUE`,
    `CREATE TABLE IF NOT EXISTS referrals (
       id               BIGSERIAL PRIMARY KEY,
       referrer_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- quem indicou
       referred_id      UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, -- amigo (só 1 convite por jogador)
       status           TEXT NOT NULL DEFAULT 'pendente',                      -- pendente | concluida
       created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
       completed_at     TIMESTAMPTZ,
       referrer_reward  INTEGER NOT NULL DEFAULT 0,
       referred_reward  INTEGER NOT NULL DEFAULT 0,
       referrer_claimed BOOLEAN NOT NULL DEFAULT false,
       referred_claimed BOOLEAN NOT NULL DEFAULT false
     )`,
    `CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_id)`,
  ];
  for (const s of steps) await impl.query(s);
}

module.exports = { connect, query, close: () => impl && impl.close() };
