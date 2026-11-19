/*
 * API do Defensores da Torre.
 *
 *   POST /api/guest      cria jogador convidado (todo jogador é registrado)
 *   POST /api/session    registra abertura do jogo (aparelho, versão)            [token]
 *   POST /api/register   cria conta com nome de usuário + senha                  [token de convidado opcional]
 *   POST /api/login      entra com nome de usuário + senha
 *   POST /api/google     entra com Google (ID token do botão do Google)          [token de convidado opcional]
 *   GET  /api/save       baixa o progresso                                       [token de conta]
 *   PUT  /api/save       envia o progresso                                       [token de conta]
 *   GET  /api/indicacao            código de convite, amigos indicados, prêmios a receber [token]
 *   POST /api/indicacao/usar       amigo informa o código de quem o convidou              [token]
 *   POST /api/indicacao/marco      amigo venceu o nível do marco → convite concluído      [token de conta]
 *   POST /api/indicacao/resgatar   entrega os Florins dos convites concluídos             [token]
 *   GET  /api/admin/resumo                 números gerais                     [cabeçalho x-admin-key]
 *   GET  /api/admin/usuarios?formato=csv   lista de jogadores                 [cabeçalho x-admin-key]
 *   GET  /api/health
 *
 * Variáveis de ambiente: DATABASE_URL, SESSION_SECRET, GOOGLE_CLIENT_ID, ADMIN_KEY, ALLOWED_ORIGINS, PORT
 */
const http = require('http');
const db = require('./db');
const { hashPassword, checkPassword, signToken, verifyToken, verifyGoogle, httpError } = require('./auth');

const PORT = +process.env.PORT || 3000;
const ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://gersonhid.github.io,http://localhost:8080,http://127.0.0.1:8080,http://127.0.0.1:8765,https://localhost,capacitor://localhost')
  .split(',').map((s) => s.trim()).filter(Boolean);
const USER_RE = /^[a-z0-9_]{3,16}$/;

// indicação de amigos (docs/INDICACAO.md)
const REF = {
  rewardReferrer: 500,   // Florins para quem indicou
  rewardFriend: 300,     // Florins para o amigo
  maxRewarded: 10,       // quantos amigos dão prêmio a quem indicou
  milestone: 3,          // o amigo precisa vencer este nível (1º chefão)
  newPlayerDays: 7,      // o código só vale para quem começou a jogar há até N dias
};
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O, 1/I
const REF_RE = /^[A-Z0-9]{4,12}$/;

// ---------- utilidades ----------
function send(res, status, body, headers) {
  const isText = typeof body === 'string';
  res.writeHead(status, Object.assign({ 'Content-Type': isText ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8' }, headers || {}));
  res.end(isText ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 200 * 1024) { reject(httpError(413, 'Requisição grande demais.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch (e) { reject(httpError(400, 'JSON inválido.')); }
    });
    req.on('error', reject);
  });
}

const clientIp = (req) => (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

// limite simples de tentativas por IP (login/cadastro)
const hits = new Map();
function rateLimit(req, max, windowMs) {
  const key = clientIp(req) + ':' + req.url.split('?')[0];
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  if (arr.length > max) throw httpError(429, 'Muitas tentativas. Aguarde alguns minutos.');
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 3600e3)) hits.delete(k); }, 600e3).unref();

// guarda só campos conhecidos do aparelho (evita lixo/abuso)
const DEVICE_KEYS = ['appVersion', 'userAgent', 'language', 'languages', 'timezone', 'screen', 'viewport', 'cpuCores', 'memoryGB',
  'touchPoints', 'connection', 'installedApp', 'model', 'os', 'osVersion', 'mobile', 'browser', 'deviceId'];
function cleanDevice(d) {
  if (!d || typeof d !== 'object') return null;
  const out = {};
  DEVICE_KEYS.forEach((k) => { if (d[k] !== undefined) out[k] = d[k]; });
  const json = JSON.stringify(out);
  return json.length > 4000 ? null : out;
}

function publicUser(u) {
  return { id: u.id, kind: u.kind, username: u.username, displayName: u.display_name, email: u.email, createdAt: u.created_at };
}

async function userFromToken(req, required) {
  const h = req.headers.authorization || '';
  const uid = verifyToken(h.startsWith('Bearer ') ? h.slice(7) : null);
  if (!uid) { if (required) throw httpError(401, 'Sessão inválida.'); return null; }
  const r = await db.query('SELECT * FROM users WHERE id = $1', [uid]);
  if (!r.rows.length) { if (required) throw httpError(401, 'Sessão inválida.'); return null; }
  return r.rows[0];
}

async function logSession(userId, body) {
  const device = cleanDevice(body.device);
  const ver = (body.appVersion || (device && device.appVersion) || '').toString().slice(0, 20) || null;
  await db.query(`UPDATE users SET last_seen = now(), sessions = sessions + 1, device = COALESCE($2, device), app_version = COALESCE($3, app_version) WHERE id = $1`,
    [userId, device ? JSON.stringify(device) : null, ver]);
  await db.query('INSERT INTO sessions (user_id, app_version, device) VALUES ($1, $2, $3)', [userId, ver, device ? JSON.stringify(device) : null]);
}

const authResponse = (u) => ({ token: signToken(u.id), user: publicUser(u) });

function validUsername(name) {
  const username = (name || '').toString().trim();
  if (!USER_RE.test(username.toLowerCase())) throw httpError(400, 'Use de 3 a 16 caracteres: letras, números ou _ (sem espaços ou acentos).');
  return username;
}
function validPassword(p) {
  if (typeof p !== 'string' || p.length < 6 || p.length > 100) throw httpError(400, 'A senha precisa ter de 6 a 100 caracteres.');
  return p;
}

// pontuação do progresso (igual ao jogo): decide qual save é mais avançado
function score(save) {
  const ranks = Object.values(save.ranks || {}).reduce((a, b) => a + (+b || 0), 0);
  return (save.unlockedLevel || 1) * 100000 + ranks * 100 + Math.min(99, Math.floor((save.florins || 0) / 1000));
}

// ---------- indicação ----------
async function ensureRefCode(u) {
  if (u.ref_code) return u.ref_code;
  for (let i = 0; i < 8; i++) {
    let code = '';
    for (let j = 0; j < 6; j++) code += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
    try {
      const r = await db.query('UPDATE users SET ref_code = $2 WHERE id = $1 AND ref_code IS NULL RETURNING ref_code', [u.id, code]);
      if (r.rows.length) return r.rows[0].ref_code;
      return (await db.query('SELECT ref_code FROM users WHERE id = $1', [u.id])).rows[0].ref_code; // outra requisição criou antes
    } catch (e) {
      if (String(e.code) !== '23505') throw e; // código repetido: tenta outro
    }
  }
  throw httpError(500, 'Não foi possível gerar o código.');
}

async function referralStatus(u) {
  const code = await ensureRefCode(u);
  const mine = (await db.query(`SELECT
      count(*)::int AS convidados,
      count(*) FILTER (WHERE status = 'concluida')::int AS concluidas,
      count(*) FILTER (WHERE referrer_reward > 0)::int AS premiadas,
      COALESCE(sum(referrer_reward) FILTER (WHERE status = 'concluida' AND NOT referrer_claimed), 0)::int AS a_cobrar
    FROM referrals WHERE referrer_id = $1`, [u.id])).rows[0];
  const asFriend = (await db.query('SELECT status, referred_reward, referred_claimed FROM referrals WHERE referred_id = $1', [u.id])).rows[0];
  const friendDue = asFriend && asFriend.status === 'concluida' && !asFriend.referred_claimed ? asFriend.referred_reward : 0;
  const isNew = Date.now() - new Date(u.created_at).getTime() < REF.newPlayerDays * 86400e3;
  return {
    codigo: code,
    convidados: mine.convidados,
    concluidas: mine.concluidas,
    premiadas: mine.premiadas,
    aCobrar: mine.a_cobrar + friendDue,
    convite: asFriend ? asFriend.status : null,         // null | pendente | concluida (quando eu fui convidado)
    podeUsarCodigo: !asFriend && isNew,
    premioIndicador: REF.rewardReferrer,
    premioAmigo: REF.rewardFriend,
    limite: REF.maxRewarded,
    marco: REF.milestone,
  };
}

// ---------- rotas ----------
const routes = {
  'GET /api/health': async () => ({ ok: true }),

  'POST /api/guest': async (req, body) => {
    rateLimit(req, 30, 600e3);
    const r = await db.query(`INSERT INTO users (kind) VALUES ('convidado') RETURNING *`);
    await logSession(r.rows[0].id, body);
    return authResponse(r.rows[0]);
  },

  'POST /api/session': async (req, body) => {
    const u = await userFromToken(req, true);
    await logSession(u.id, body);
    return { user: publicUser(u) };
  },

  'POST /api/register': async (req, body) => {
    rateLimit(req, 10, 600e3);
    const username = validUsername(body.username);
    const hash = hashPassword(validPassword(body.password));
    const key = username.toLowerCase();
    const taken = await db.query('SELECT 1 FROM users WHERE username_key = $1', [key]);
    if (taken.rows.length) throw httpError(409, 'Esse nome de usuário já existe.');
    const guest = await userFromToken(req, false);
    let u;
    try {
      if (guest && guest.kind === 'convidado') {
        // o convidado vira conta: mantém o mesmo registro e histórico
        u = (await db.query(`UPDATE users SET kind = 'usuario', username = $2, username_key = $3, password_hash = $4 WHERE id = $1 RETURNING *`,
          [guest.id, username, key, hash])).rows[0];
      } else {
        u = (await db.query(`INSERT INTO users (kind, username, username_key, password_hash) VALUES ('usuario', $1, $2, $3) RETURNING *`,
          [username, key, hash])).rows[0];
        await logSession(u.id, body);
      }
    } catch (e) {
      if (String(e.code) === '23505') throw httpError(409, 'Esse nome de usuário já existe.');
      throw e;
    }
    return authResponse(u);
  },

  'POST /api/login': async (req, body) => {
    rateLimit(req, 10, 600e3);
    const username = validUsername(body.username);
    const r = await db.query('SELECT * FROM users WHERE username_key = $1', [username.toLowerCase()]);
    const u = r.rows[0];
    if (!u || !checkPassword(String(body.password || ''), u.password_hash)) throw httpError(401, 'Usuário ou senha incorretos.');
    const guest = await userFromToken(req, false);
    if (guest && guest.kind === 'convidado' && guest.id !== u.id) await db.query('UPDATE users SET merged_into = $2 WHERE id = $1', [guest.id, u.id]);
    await logSession(u.id, body);
    return authResponse(u);
  },

  'POST /api/google': async (req, body) => {
    rateLimit(req, 20, 600e3);
    if (!body.credential) throw httpError(400, 'Credencial do Google ausente.');
    const g = await verifyGoogle(body.credential);
    const guest = await userFromToken(req, false);
    const existing = (await db.query('SELECT * FROM users WHERE google_sub = $1', [g.sub])).rows[0];
    let u;
    if (existing) {
      u = (await db.query('UPDATE users SET email = $2, display_name = $3, photo_url = $4 WHERE id = $1 RETURNING *',
        [existing.id, g.email, g.name, g.picture])).rows[0];
      if (guest && guest.kind === 'convidado' && guest.id !== u.id) await db.query('UPDATE users SET merged_into = $2 WHERE id = $1', [guest.id, u.id]);
    } else if (guest && guest.kind === 'convidado') {
      u = (await db.query(`UPDATE users SET kind = 'google', google_sub = $2, email = $3, display_name = $4, photo_url = $5 WHERE id = $1 RETURNING *`,
        [guest.id, g.sub, g.email, g.name, g.picture])).rows[0];
    } else {
      u = (await db.query(`INSERT INTO users (kind, google_sub, email, display_name, photo_url) VALUES ('google', $1, $2, $3, $4) RETURNING *`,
        [g.sub, g.email, g.name, g.picture])).rows[0];
    }
    await logSession(u.id, body);
    return authResponse(u);
  },

  'GET /api/save': async (req) => {
    const u = await userFromToken(req, true);
    const r = await db.query('SELECT data, score, updated_at FROM saves WHERE user_id = $1', [u.id]);
    if (!r.rows.length) return { data: null };
    return { data: r.rows[0].data, score: Number(r.rows[0].score), updatedAt: r.rows[0].updated_at };
  },

  'PUT /api/save': async (req, body) => {
    const u = await userFromToken(req, true);
    if (u.kind === 'convidado') throw httpError(403, 'Convidados salvam só no aparelho. Entre com uma conta.');
    const save = body.data;
    if (!save || typeof save !== 'object' || Array.isArray(save)) throw httpError(400, 'Progresso inválido.');
    const json = JSON.stringify(save);
    if (json.length > 60000) throw httpError(413, 'Progresso grande demais.');
    await db.query(`INSERT INTO saves (user_id, data, score, updated_at) VALUES ($1, $2, $3, now())
                    ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, score = EXCLUDED.score, updated_at = now()`,
      [u.id, json, score(save)]);
    return { ok: true };
  },

  // ---------- indicação ----------
  'GET /api/indicacao': async (req) => referralStatus(await userFromToken(req, true)),

  'POST /api/indicacao/usar': async (req, body) => {
    rateLimit(req, 10, 600e3);
    const u = await userFromToken(req, true);
    const code = String(body.codigo || '').trim().toUpperCase();
    if (!REF_RE.test(code)) throw httpError(400, 'Código de convite inválido.');
    const ref = (await db.query('SELECT * FROM users WHERE ref_code = $1', [code])).rows[0];
    if (!ref || ref.merged_into) throw httpError(404, 'Código de convite não encontrado.');
    if (ref.id === u.id) throw httpError(400, 'Esse é o seu próprio código.');
    if (Date.now() - new Date(u.created_at).getTime() > REF.newPlayerDays * 86400e3) {
      throw httpError(400, 'O convite vale só para quem começou a jogar há pouco tempo.');
    }
    // mesmo aparelho de quem convidou = não vale
    const devId = u.device && u.device.deviceId;
    if (devId) {
      const same = await db.query(`SELECT 1 FROM sessions WHERE user_id = $1 AND device->>'deviceId' = $2 LIMIT 1`, [ref.id, devId]);
      if (same.rows.length) throw httpError(400, 'O convite precisa ser usado em outro aparelho.');
    }
    try {
      await db.query('INSERT INTO referrals (referrer_id, referred_id) VALUES ($1, $2)', [ref.id, u.id]);
    } catch (e) {
      if (String(e.code) === '23505') throw httpError(409, 'Você já usou um código de convite.');
      throw e;
    }
    return referralStatus(u);
  },

  'POST /api/indicacao/marco': async (req, body) => {
    const u = await userFromToken(req, true);
    const row = (await db.query(`SELECT * FROM referrals WHERE referred_id = $1`, [u.id])).rows[0];
    if (!row || row.status !== 'pendente') return referralStatus(u);
    if (u.kind === 'convidado') throw httpError(403, 'Crie uma conta para concluir o convite.');
    if (!(+body.nivel >= REF.milestone)) throw httpError(400, `Vença o nível ${REF.milestone} para concluir o convite.`);
    const done = (await db.query(`SELECT count(*)::int AS n FROM referrals WHERE referrer_id = $1 AND referrer_reward > 0`, [row.referrer_id])).rows[0].n;
    const referrerReward = done < REF.maxRewarded ? REF.rewardReferrer : 0;
    await db.query(`UPDATE referrals SET status = 'concluida', completed_at = now(), referrer_reward = $2, referred_reward = $3
                    WHERE id = $1 AND status = 'pendente'`, [row.id, referrerReward, REF.rewardFriend]);
    return referralStatus(u);
  },

  'POST /api/indicacao/resgatar': async (req) => {
    const u = await userFromToken(req, true);
    const a = await db.query(`UPDATE referrals SET referrer_claimed = true
                              WHERE referrer_id = $1 AND status = 'concluida' AND NOT referrer_claimed RETURNING referrer_reward`, [u.id]);
    const b = await db.query(`UPDATE referrals SET referred_claimed = true
                              WHERE referred_id = $1 AND status = 'concluida' AND NOT referred_claimed RETURNING referred_reward`, [u.id]);
    const florins = a.rows.reduce((s, r) => s + r.referrer_reward, 0) + b.rows.reduce((s, r) => s + r.referred_reward, 0);
    return { florins, amigos: a.rows.filter((r) => r.referrer_reward > 0).length, convidado: b.rows.length > 0 };
  },

  // ---------- administração ----------
  'GET /api/admin/resumo': async (req) => {
    requireAdmin(req);
    const one = async (sql) => (await db.query(sql)).rows;
    return {
      jogadores: await one(`SELECT kind, count(*)::int AS total FROM users WHERE merged_into IS NULL GROUP BY kind ORDER BY total DESC`),
      ativos: (await one(`SELECT
          count(*) FILTER (WHERE last_seen > now() - interval '1 day')::int  AS "24h",
          count(*) FILTER (WHERE last_seen > now() - interval '7 days')::int AS "7dias",
          count(*) FILTER (WHERE last_seen > now() - interval '30 days')::int AS "30dias"
        FROM users WHERE merged_into IS NULL`))[0],
      sessoes: (await one(`SELECT count(*)::int AS total FROM sessions`))[0].total,
      aparelhos: await one(`SELECT COALESCE(device->>'model', '?') AS modelo, count(*)::int AS total FROM users
                             WHERE merged_into IS NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 20`),
      sistemas: await one(`SELECT COALESCE(device->>'os', '?') || ' ' || COALESCE(device->>'osVersion', '') AS sistema, count(*)::int AS total
                            FROM users WHERE merged_into IS NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 20`),
      versoes: await one(`SELECT COALESCE(app_version, '?') AS versao, count(*)::int AS total FROM users GROUP BY 1 ORDER BY 2 DESC LIMIT 10`),
      progresso: await one(`SELECT (data->>'unlockedLevel')::int AS nivel_liberado, count(*)::int AS jogadores FROM saves GROUP BY 1 ORDER BY 1`),
      indicacoes: (await one(`SELECT count(*)::int AS total,
          count(*) FILTER (WHERE status = 'concluida')::int AS concluidas,
          count(DISTINCT referrer_id)::int AS indicadores
        FROM referrals`))[0],
    };
  },

  'GET /api/admin/usuarios': async (req, body, url) => {
    requireAdmin(req);
    const limit = Math.min(10000, +url.searchParams.get('limite') || 1000);
    const rows = (await db.query(`SELECT u.id, u.kind, u.username, u.display_name, u.email, u.created_at, u.last_seen, u.sessions,
        u.app_version, u.device->>'model' AS modelo, u.device->>'os' AS sistema, u.device->>'osVersion' AS versao_sistema,
        u.device->>'language' AS idioma, u.device->>'timezone' AS fuso, (s.data->>'unlockedLevel')::int AS nivel, s.updated_at AS progresso_em
      FROM users u LEFT JOIN saves s ON s.user_id = u.id
      WHERE u.merged_into IS NULL ORDER BY u.last_seen DESC LIMIT $1`, [limit])).rows;
    if (url.searchParams.get('formato') === 'csv') {
      const cols = rows.length ? Object.keys(rows[0]) : ['id'];
      const esc = (v) => (v === null || v === undefined ? '' : `"${(v instanceof Date ? v.toISOString() : String(v)).replace(/"/g, '""')}"`);
      return { __csv: [cols.join(',')].concat(rows.map((r) => cols.map((c) => esc(r[c])).join(','))).join('\n') };
    }
    return { total: rows.length, usuarios: rows };
  },
};

// apagar um jogador e todos os seus dados (pedido de exclusão — LGPD). ?id=UUID ou ?usuario=nome
routes['DELETE /api/admin/usuario'] = async (req, body, url) => {
  requireAdmin(req);
  const id = url.searchParams.get('id');
  const username = url.searchParams.get('usuario');
  if (!id && !username) throw httpError(400, 'Informe ?id= ou ?usuario=');
  const r = id
    ? await db.query('DELETE FROM users WHERE id = $1 OR merged_into = $1 RETURNING id', [id])
    : await db.query('DELETE FROM users WHERE id IN (SELECT id FROM users WHERE username_key = $1) OR merged_into IN (SELECT id FROM users WHERE username_key = $1) RETURNING id', [username.toLowerCase()]);
  return { apagados: r.rows.length };
};

function requireAdmin(req) {
  const key = process.env.ADMIN_KEY;
  if (!key || req.headers['x-admin-key'] !== key) throw httpError(403, 'Acesso negado.');
}

// ---------- servidor ----------
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const cors = {};
  if (origin && ORIGINS.includes(origin)) {
    cors['Access-Control-Allow-Origin'] = origin;
    cors['Vary'] = 'Origin';
    cors['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, x-admin-key';
    cors['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    cors['Access-Control-Max-Age'] = '86400';
  }
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const url = new URL(req.url, 'http://x');
  const handler = routes[`${req.method} ${url.pathname}`];
  if (!handler) return send(res, 404, { erro: 'Não encontrado.' }, cors);
  try {
    const body = req.method === 'GET' ? {} : await readBody(req);
    const out = await handler(req, body, url);
    if (out && out.__csv !== undefined) {
      return send(res, 200, '﻿' + out.__csv, Object.assign({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="jogadores.csv"' }, cors));
    }
    send(res, 200, out, cors);
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    send(res, status, { erro: status >= 500 ? 'Erro no servidor.' : e.message }, cors);
  }
});

async function start() {
  const kind = await db.connect();
  await new Promise((r) => server.listen(PORT, r));
  console.log(`API ouvindo na porta ${PORT} (banco: ${kind})`);
  if (!process.env.SESSION_SECRET) console.warn('AVISO: defina SESSION_SECRET em produção.');
  return server;
}

if (require.main === module) start().catch((e) => { console.error(e); process.exit(1); });
module.exports = { start, server };
