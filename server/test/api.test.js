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

    // ---------- indicação ----------
    const ana = await call('POST', '/api/register', { username: 'ana', password: 'segredo1', device: { deviceId: 'aparelho-ana' } });
    const st0 = await call('GET', '/api/indicacao', null, ana.json.token);
    assert.strictEqual(st0.status, 200); assert.match(st0.json.codigo, /^[A-Z2-9]{6}$/);
    assert.strictEqual((await call('GET', '/api/indicacao', null, ana.json.token)).json.codigo, st0.json.codigo);
    ok('gera código de convite fixo por jogador');
    const code = st0.json.codigo;

    assert.strictEqual((await call('POST', '/api/indicacao/usar', { codigo: code }, ana.json.token)).status, 400);
    ok('não aceita o próprio código');

    const mesmo = await call('POST', '/api/guest', { device: { deviceId: 'aparelho-ana' } });
    assert.strictEqual((await call('POST', '/api/indicacao/usar', { codigo: code }, mesmo.json.token)).status, 400);
    ok('não aceita convite no mesmo aparelho');

    const velho = await call('POST', '/api/guest', { device: { deviceId: 'aparelho-velho' } });
    await db.query(`UPDATE users SET created_at = now() - interval '30 days' WHERE id = $1`, [velho.json.user.id]);
    assert.strictEqual((await call('POST', '/api/indicacao/usar', { codigo: code }, velho.json.token)).status, 400);
    ok('convite só vale para jogador novo');

    assert.strictEqual((await call('POST', '/api/indicacao/usar', { codigo: 'ZZZZZZ' }, mesmo.json.token)).status, 404);
    ok('código inexistente');

    // amigo: entra como convidado, usa o código (minúsculo), cria conta, vence o nível 3
    const bia = await call('POST', '/api/guest', { device: { deviceId: 'aparelho-bia' } });
    const use = await call('POST', '/api/indicacao/usar', { codigo: code.toLowerCase() }, bia.json.token);
    assert.strictEqual(use.status, 200); assert.strictEqual(use.json.convite, 'pendente'); assert.strictEqual(use.json.podeUsarCodigo, false);
    assert.strictEqual((await call('POST', '/api/indicacao/usar', { codigo: code }, bia.json.token)).status, 409);
    ok('amigo usa o código uma única vez');

    assert.strictEqual((await call('POST', '/api/indicacao/marco', { nivel: 3 }, bia.json.token)).status, 403);
    ok('convidado precisa criar conta para concluir');
    const biaAcc = await call('POST', '/api/register', { username: 'bia', password: 'segredo1' }, bia.json.token);
    assert.strictEqual((await call('POST', '/api/indicacao/marco', { nivel: 2 }, biaAcc.json.token)).status, 400);
    const mk = await call('POST', '/api/indicacao/marco', { nivel: 3 }, biaAcc.json.token);
    assert.strictEqual(mk.status, 200); assert.strictEqual(mk.json.convite, 'concluida'); assert.strictEqual(mk.json.aCobrar, 300);
    ok('convite concluído ao vencer o nível 3 com conta');

    const rb = await call('POST', '/api/indicacao/resgatar', null, biaAcc.json.token);
    assert.strictEqual(rb.json.florins, 300); assert.strictEqual(rb.json.convidado, true);
    assert.strictEqual((await call('POST', '/api/indicacao/resgatar', null, biaAcc.json.token)).json.florins, 0);
    const sa = await call('GET', '/api/indicacao', null, ana.json.token);
    assert.strictEqual(sa.json.convidados, 1); assert.strictEqual(sa.json.concluidas, 1); assert.strictEqual(sa.json.aCobrar, 500);
    const ra = await call('POST', '/api/indicacao/resgatar', null, ana.json.token);
    assert.strictEqual(ra.json.florins, 500); assert.strictEqual(ra.json.amigos, 1);
    assert.strictEqual((await call('POST', '/api/indicacao/resgatar', null, ana.json.token)).json.florins, 0);
    ok('prêmios entregues uma única vez (500 para quem indicou, 300 para o amigo)');

    // limite de amigos premiados
    for (let i = 0; i < 10; i++) {
      const g = await call('POST', '/api/guest', { device: { deviceId: 'amigo-' + i } });
      // cada amigo vem de um IP diferente (o "usar" tem limite de tentativas por IP)
      await call('POST', '/api/indicacao/usar', { codigo: code }, g.json.token, { 'x-forwarded-for': '10.0.0.' + i });
      // vira conta direto no banco (o cadastro pela API tem limite de tentativas por IP)
      await db.query(`UPDATE users SET kind = 'usuario' WHERE id = $1`, [g.json.user.id]);
      await call('POST', '/api/indicacao/marco', { nivel: 5 }, g.json.token);
    }
    const lim = await call('GET', '/api/indicacao', null, ana.json.token);
    assert.strictEqual(lim.json.concluidas, 11); assert.strictEqual(lim.json.premiadas, 10); assert.strictEqual(lim.json.aCobrar, 9 * 500);
    ok('limite de 10 amigos premiados para quem indica');
    const resumo = await call('GET', '/api/admin/resumo', null, null, { 'x-admin-key': 'chave-teste' });
    assert.strictEqual(resumo.json.indicacoes.concluidas, 11);
    ok('resumo do admin mostra as indicações');

    console.log(`\n${passed} testes passaram.`);
  } catch (e) {
    console.error('\nFALHOU:', e);
    process.exitCode = 1;
  } finally {
    server.close();
    await db.close();
  }
})();
