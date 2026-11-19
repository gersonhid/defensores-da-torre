/* Senhas (scrypt), tokens de sessão (HMAC) e verificação do login Google. Só módulos nativos do Node. */
const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || 'dev-secret-troque-em-producao';
const TOKEN_DAYS = 365;

// ---------- senhas ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function checkPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const [, saltB64, hashB64] = stored.split('$');
  const expected = Buffer.from(hashB64, 'base64');
  const got = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(expected, got);
}

// ---------- tokens ----------
const b64url = (buf) => Buffer.from(buf).toString('base64url');

function signToken(uid) {
  const payload = b64url(JSON.stringify({ uid, iat: Math.floor(Date.now() / 1000) }));
  const sig = b64url(crypto.createHmac('sha256', SECRET).update(payload).digest());
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = b64url(crypto.createHmac('sha256', SECRET).update(payload).digest());
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (Date.now() / 1000 - data.iat > TOKEN_DAYS * 86400) return null;
    return data.uid;
  } catch (e) { return null; }
}

// ---------- Google ----------
// Valida o "ID token" que o botão "Entrar com Google" entrega ao jogo.
async function verifyGoogle(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw httpError(503, 'Login com Google não configurado no servidor.');
  const res = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
  if (!res.ok) throw httpError(401, 'Login Google inválido.');
  const info = await res.json();
  const issOk = info.iss === 'accounts.google.com' || info.iss === 'https://accounts.google.com';
  if (info.aud !== clientId || !issOk || Number(info.exp) * 1000 < Date.now()) throw httpError(401, 'Login Google inválido.');
  return { sub: info.sub, email: info.email || null, name: info.name || null, picture: info.picture || null };
}

function httpError(status, message) { return Object.assign(new Error(message), { status }); }

module.exports = { hashPassword, checkPassword, signToken, verifyToken, verifyGoogle, httpError };
