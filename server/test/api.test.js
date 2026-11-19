/* Teste de ponta a ponta da API com PostgreSQL embutido em memória:  npm test */
process.env.PGLITE_DIR = 'memory';
process.env.PORT = '3999';
process.env.ADMIN_KEY = 'chave-teste';
delete process.env.DATABASE_URL;
delete process.env.GOOGLE_CLIENT_ID;

const assert = require('assert');
const { start, server } = require('../src/index');
const db = require('../src/db');
const BASE = 'http://127.0.0.1:3999';

async function call(method, path, body, token, headers) {
  const res = await fetch(BASE + path, {
    method,
    headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}, headers || {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch (e) { /* csv */ }
  return { status: res.status, json, text, headers: res.headers };
}

const device = { model: 'SM-A546E', os: 'Android', osVersion: '14.0.0', language: 'pt-BR', appVersion: '0.4.0', lixo: 'x' };
let passed = 0;
const ok = (name) => { passed++; console.log('  ✔ ' + name); };

(async () => {
  await start();
  try {
    // convidado
    const g1 = await call('POST', '/api/guest', { device });
    assert.strictEqual(g1.status, 200); assert.strictEqual(g1.json.user.kind, 'convidado');
    ok('cria convidado');
    const s1 = await call('POST', '/api/session', { device }, g1.json.token);
    assert.strictEqual(s1.status, 200);
    ok('registra sessão');
    const gs = await call('PUT', '/api/save', { data: { unlockedLevel: 2 } }, g1.json.token);
    assert.strictEqual(gs.status, 403);
    ok('convidado não salva na nuvem');

    // convidado vira conta (mesmo id)
    const reg = await call('POST', '/api/register', { username: 'Gerson_01', password: 'segredo1', device }, g1.json.token);
    assert.strictEqual(reg.status, 200); assert.strictEqual(reg.json.user.id, g1.json.user.id); assert.strictEqual(reg.json.user.kind, 'usuario');
    ok('convidado vira conta mantendo o registro');
    const dup = await call('POST', '/api/register', { username: 'gerson_01', password: 'outra123' });
    assert.strictEqual(dup.status, 409);
    ok('nome de usuário único (sem diferenciar maiúsculas)');
    const bad = await call('POST', '/api/register', { username: 'ab', password: 'segredo1' });
    assert.strictEqual(bad.status, 400);
    ok('valida nome de usuário');

    // progresso
    const save = { version: 2, florins: 1234, unlockedLevel: 7, ranks: { bar_forca: 3, arq_unlock: 1 }, cleared: { 1: true } };
    assert.strictEqual((await call('PUT', '/api/save', { data: save }, reg.json.token)).status, 200);
    ok('salva progresso');

    // outro aparelho: novo convidado faz login e recupera
    const g2 = await call('POST', '/api/guest', { device: { model: 'Pixel 8' } });
    const wrong = await call('POST', '/api/login', { username: 'gerson_01', password: 'errada' }, g2.json.token);
    assert.strictEqual(wrong.status, 401);
    ok('senha errada é recusada');
    const lg = await call('POST', '/api/login', { username: 'GERSON_01', password: 'segredo1', device: { model: 'Pixel 8' } }, g2.json.token);
    assert.strictEqual(lg.status, 200); assert.strictEqual(lg.json.user.id, reg.json.user.id);
    const got = await call('GET', '/api/save', null, lg.json.token);
    assert.deepStrictEqual(got.json.data, save);
    ok('login em outro aparelho recupera o progresso');

    // token adulterado
    const fake = lg.json.token.slice(0, -2) + 'xx';
    assert.strictEqual((await call('GET', '/api/save', null, fake)).status, 401);
    ok('token adulterado é recusado');

    // google sem configuração
    assert.strictEqual((await call('POST', '/api/google', { credential: 'x' })).status, 503);
    ok('login Google exige configuração');

    // dados do aparelho só com campos conhecidos
    const u = (await db.query('SELECT device, sessions FROM users WHERE id = $1', [reg.json.user.id])).rows[0];
    assert.strictEqual(u.device.lixo, undefined); assert.strictEqual(u.device.model, 'Pixel 8'); assert.ok(u.sessions >= 3);
    ok('aparelho registrado (só campos conhecidos)');

    // admin
    assert.strictEqual((await call('GET', '/api/admin/resumo')).status, 403);
    const res = await call('GET', '/api/admin/resumo', null, null, { 'x-admin-key': 'chave-teste' });
    assert.strictEqual(res.status, 200); assert.ok(res.json.sessoes >= 4);
    const csv = await call('GET', '/api/admin/usuarios?formato=csv', null, null, { 'x-admin-key': 'chave-teste' });
    assert.ok(csv.text.includes('gerson_01') || csv.text.includes('Gerson_01'));
    ok('painel admin protegido por chave, com resumo e CSV');

    // exclusão de dados (LGPD)
    assert.strictEqual((await call('DELETE', '/api/admin/usuario?usuario=gerson_01')).status, 403);
    const del = await call('DELETE', '/api/admin/usuario?usuario=GERSON_01', null, null, { 'x-admin-key': 'chave-teste' });
    assert.strictEqual(del.status, 200); assert.ok(del.json.apagados >= 2); // conta + convidado mesclado
    assert.strictEqual((await call('GET', '/api/save', null, lg.json.token)).status, 401);
    ok('admin apaga jogador e todos os dados (LGPD)');

    // CORS
    const cors = await fetch(BASE + '/api/health', { headers: { Origin: 'https://gersonhid.github.io' } });
    assert.strictEqual(cors.headers.get('access-control-allow-origin'), 'https://gersonhid.github.io');
    const evil = await fetch(BASE + '/api/health', { headers: { Origin: 'https://site-malicioso.com' } });
    assert.strictEqual(evil.headers.get('access-control-allow-origin'), null);
    ok('CORS só para os endereços do jogo');

    console.log(`\n${passed} testes passaram.`);
  } catch (e) {
    console.error('\nFALHOU:', e);
    process.exitCode = 1;
  } finally {
    server.close();
    await db.close();
  }
})();
