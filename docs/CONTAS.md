# Contas, progresso na nuvem e dados dos jogadores (servidor próprio no Railway)

## Como funciona

```
Jogo (GitHub Pages / app)  ──HTTPS──▶  API Node.js (pasta server/, no Railway)  ──▶  PostgreSQL (Railway)
```

| Situação | Registrado? | Progresso |
|----------|-------------|-----------|
| Abriu o jogo sem login ("Convidado") | Sim, com dados do aparelho | Só no aparelho |
| Criou **nome de usuário + senha** | Sim | Nuvem + aparelho |
| Entrou com **Google** | Sim, + nome, e-mail, foto | Nuvem + aparelho |
| Sem internet / servidor não configurado | Não | Só no aparelho (o jogo funciona normalmente) |

* O convidado que cria conta **mantém o mesmo registro** (mesmo id, mesmo histórico).
* Ao entrar num aparelho novo, o jogo fica com o progresso **mais avançado** (nuvem × aparelho).
* Senhas são guardadas com **scrypt** (nunca em texto). Login e cadastro têm limite de tentativas por IP.
* Não há "esqueci a senha" para nome de usuário (não pedimos e-mail). Quem quiser recuperação usa Google.

### Banco de dados (criado automaticamente ao iniciar)

| Tabela | Conteúdo |
|--------|----------|
| `users` | id, tipo (convidado/usuario/google), nome de usuário, e-mail e nome do Google, criado em, último acesso, nº de sessões, **aparelho mais recente** (JSON), versão do jogo |
| `sessions` | cada abertura do jogo: data, versão, aparelho |
| `saves` | progresso de quem tem conta (JSON) |

Dados do aparelho (sem pedir permissão): modelo (ex. `SM-A546E`), sistema e versão, navegador,
tela, idioma, fuso horário, núcleos, memória aproximada, tipo de conexão, se está instalado como app.
O IP **não** é gravado.

## Consultar os dados (painel de administração)

Com a `ADMIN_KEY` que você definir no Railway:

```bash
# resumo: jogadores por tipo, ativos 24h/7d/30d, aparelhos, sistemas, versões, progresso
curl -H "x-admin-key: SUA_CHAVE" https://api-production-5f9a2aef.up.railway.app/api/admin/resumo

# planilha com todos os jogadores (abre no Excel)
curl -H "x-admin-key: SUA_CHAVE" "https://api-production-5f9a2aef.up.railway.app/api/admin/usuarios?formato=csv" -o jogadores.csv
```
```bash
# apagar um jogador e todos os dados dele (pedido de exclusão — LGPD)
curl -X DELETE -H "x-admin-key: SUA_CHAVE" "https://api-production-5f9a2aef.up.railway.app/api/admin/usuario?usuario=NOME"
curl -X DELETE -H "x-admin-key: SUA_CHAVE" "https://api-production-5f9a2aef.up.railway.app/api/admin/usuario?id=UUID"
```
A chave fica em `D:aidefensores-admin-key.txt` (fora do repositório).

Também dá para abrir o banco direto no painel do Railway (serviço Postgres → aba *Data*) e fazer
consultas SQL livres.

## Publicar no Railway

**Situação atual:** projeto `defensores-da-torre` no Railway, serviços `api` + `Postgres`,
API em https://api-production-5f9a2aef.up.railway.app. Para publicar mudanças do servidor:
`cd server && npx @railway/cli up --service api --ci`.

### O que você faz (uma vez)
1. Criar a conta em https://railway.com (pode entrar com o GitHub). O plano **Hobby** (pago, por volta
   de US$ 5/mês — confira o valor atual) é necessário para manter o servidor no ar.
2. No terminal do Claude Code, rodar `! npx @railway/cli login` e confirmar no navegador.

### O que o Claude faz (com sua confirmação)
1. Cria o projeto `defensores-da-torre` com um banco **PostgreSQL**.
2. Publica a pasta `server/` como serviço `api`, com as variáveis:
   * `DATABASE_URL` → ligado ao Postgres do projeto
   * `SESSION_SECRET` → valor aleatório longo (assina as sessões; nunca compartilhe)
   * `ADMIN_KEY` → valor aleatório (acesso ao painel de administração)
   * `GOOGLE_CLIENT_ID` → (opcional) ver abaixo
3. Gera o endereço público (`https://....up.railway.app`) e coloca em `www/js/server-config.js` (`api`).
4. Publica o jogo (GitHub Pages) e testa cadastro, login e recuperação de progresso.

### Login com Google (opcional, ~5 min)
1. https://console.cloud.google.com → criar projeto → *APIs e serviços → Tela de permissão OAuth*:
   tipo **Externo**, nome do app, e-mail de suporte → publicar.
2. *Credenciais → Criar credenciais → ID do cliente OAuth* → tipo **Aplicativo da Web** →
   *Origens JavaScript autorizadas*: `https://gersonhid.github.io`.
3. Copie o **ID do cliente** (`....apps.googleusercontent.com`) e me envie. Ele vai em
   `GOOGLE_CLIENT_ID` (servidor) e `googleClientId` (`www/js/server-config.js`). Não é segredo.

## Desenvolvimento local

```bash
cd server
npm install
npm test          # testa toda a API com um PostgreSQL embutido em memória (PGlite)
npm start         # API em http://localhost:3000 usando PGlite em server/data/ (sem instalar Postgres)
```
Para o jogo usar a API local, coloque `api: 'http://127.0.0.1:3000'` em `www/js/server-config.js`
(não publique assim).

## Limitações conhecidas
* O progresso é calculado no aparelho; um jogador com conhecimento técnico consegue editar o próprio
  save. Sem ranking/loja isso não causa problema; se houver, a validação deve ir para o servidor.
* O limite de tentativas fica na memória do servidor (zera ao reiniciar). Suficiente para um servidor.
