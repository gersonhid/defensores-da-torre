# Pendências para publicar o jogo — Defensores da Torre

> Lista viva: marque `[x]` ao concluir e acrescente o que surgir.
> Última revisão: **19/11/2026**.
> Legenda: 🔴 bloqueia a publicação · 🟡 importante antes do lançamento · 🟢 pode ficar para depois
> Quem faz: **[Você]** = precisa da sua conta/decisão · **[Claude]** = posso fazer no código.

---

## Situação atual (o que já está pronto)

- [x] Jogo completo no navegador: 50 níveis em fases de 3 com chefões, modo infinito, heróis, poderes e evolução
- [x] Site publicado: https://gersonhid.github.io/defensores-da-torre/ (com publicação automática a cada push)
- [x] Servidor de contas no Railway funcionando (`https://api-production-5f9a2aef.up.railway.app`)
- [x] Projeto Android (Capacitor 8), pacote `com.towerdefence.run`, horizontal, tela cheia, ícone
- [x] AdMob configurado: ID do app no `AndroidManifest.xml` e 2 blocos premiados (reviver / dobrar)
- [x] Formulário de consentimento (UMP) já é chamado pelo código (`www/js/ads.js`)
- [x] `app-ads.txt` publicado em https://gersonhid.github.io/app-ads.txt
- [x] Página de privacidade publicada (mas **incompleta**, ver item 3)

---

## 1. Segurança — resolver primeiro

- [ ] 🔴 **[Você]** O arquivo `docs/GOOGLE-LOGIN.md` começa com o que parece ser uma **senha e um e-mail**.
      Ele ainda **não foi enviado** ao GitHub (está fora do git), mas o repositório é público:
      **apague essas duas linhas antes de qualquer commit** e guarde a senha num gerenciador de senhas.
- [ ] 🟡 **[Você]** Confirmar que a `ADMIN_KEY` e o `SESSION_SECRET` do Railway estão só no Railway e no
      arquivo fora do repositório (`D:\ai\defensores-admin-key.txt`).

## 2. Testes no celular (Android Studio)

Guia: [ANDROID.md](ANDROID.md), seção 3.

- [ ] 🔴 **[Você]** Instalar o Android Studio atual e abrir o projeto (`npm run android:open`) — Gradle Sync sem erros
- [ ] 🔴 **[Você]** Rodar no celular e conferir:
  - [ ] Abre na horizontal, tela cheia, com o ícone da torre
  - [ ] Botão **voltar** pausa / volta de tela
  - [ ] "📺 Assistir e reviver" mostra vídeo **Test Ad**; assistir até o fim revive, fechar antes não revive
  - [ ] "📺 Dobrar Florins" — mesmo comportamento
  - [ ] Mira acima do dedo (45 px) confortável em tela pequena e grande
  - [ ] Conta: criar usuário, sair, entrar de novo → progresso volta
  - [ ] Funciona sem internet (salva no aparelho)
- [ ] 🟡 **[Você]** Testar em pelo menos 2 aparelhos (um mais fraco) — desempenho e tamanho da tela
- [ ] 🟡 **[Você]** Pessoas reais jogarem os níveis 1–10 (dificuldade inicial — ver [BALANCEAMENTO.md](BALANCEAMENTO.md))

## 3. Política de privacidade (`www/privacidade.html`)

Obrigatória na Play Store para app com anúncios e contas. Campos entre colchetes ainda abertos:

- [ ] 🔴 **[Você]** `[NOME DO RESPONSÁVEL]`
- [ ] 🔴 **[Você]** `[E-MAIL DE CONTATO PARA PRIVACIDADE]` (aparece 2 vezes) — de preferência um e-mail só do jogo
- [ ] 🔴 **[Claude]** `[AdMob ou AdSense/H5 Games Ads — DEFINIR]` → **AdMob** (já decidido)
- [ ] 🔴 **[Claude]** `[REGIÃO — DEFINIR]` → região do servidor no Railway (conferir no painel)
- [ ] 🔴 **[Você]** `[PRAZO, ex.: 2 anos]` — por quanto tempo guardar contas sem acesso
- [ ] 🔴 **[Você]** `[DEFINIR: público-alvo]` — ver item 5
- [ ] 🔴 **[Claude]** Remover o aviso "[REVISAR: ...]" do topo e atualizar a data, depois publicar

## 4. Login com Google (opcional, mas recomendado)

Guia: [GOOGLE-LOGIN.md](GOOGLE-LOGIN.md). Hoje `googleClientId` está `null` → o botão do Google não aparece.

- [ ] 🟡 **[Você]** Criar o projeto no Google Cloud, configurar e **publicar** a tela de permissão OAuth
- [ ] 🟡 **[Você]** Criar o ID do cliente (Aplicativo da Web) e me enviar
- [ ] 🟡 **[Claude]** Colocar o ID em `GOOGLE_CLIENT_ID` (Railway) e `googleClientId` (`www/js/server-config.js`) e publicar
- [ ] 🟡 **[Você + Claude]** Testar o login com Google **dentro do app Android** — o botão do Google
      dentro de WebView pode ser bloqueado pelo Google; se falhar, alternativas: esconder o botão no app
      ou usar um plugin nativo de login (`@capacitor-firebase/authentication` ou similar)
- [ ] 🟢 Sem Google, quem perde a senha do nome de usuário não recupera a conta (não pedimos e-mail) — decidir se aceita

## 5. Decisões que só você pode tomar

- [ ] 🔴 **Público-alvo / faixa etária.** Se incluir **menores de 13 anos**: política Famílias,
      anúncios "direcionados a crianças", regras mais rígidas de coleta de dados. Recomendação: **13+**.
- [x] **Nome comercial definido: "Guardians of the Lost Tower"** (27 caracteres — cabe no limite de 30 da loja)
  - [ ] 🔴 Verificar se já existe um app com esse nome na Play Store
  - [ ] 🟡 **[Claude]** Trocar o nome no app: `capacitor.config.json` (`appName`), `strings.xml` do Android, `manifest.webmanifest`, título das telas, `privacidade.html`, README (o pacote `com.towerdefence.run` **não** muda)
  - [ ] 🟡 Idioma do jogo: o nome é em inglês e o jogo em português — decidir se traduz o jogo (ver item "Idiomas")
- [ ] 🟡 **Idiomas:** só pt-BR ou também inglês? (anúncios pagam bem mais nos EUA/Europa — ver [PROPAGANDAS.md](PROPAGANDAS.md))
- [ ] 🟡 **Países de distribuição:** só Brasil ou todos
- [ ] 🟢 Domínio próprio (ex.: `defensoresdatorre.com.br`) — não é obrigatório, `gersonhid.github.io` atende

## 6. Contas e cadastros

- [ ] 🔴 **[Você]** Conta de desenvolvedor na **Google Play Console** (US$ 25, uma vez) + verificação de identidade
      (pode levar alguns dias). Contas pessoais novas precisam de **teste fechado com 12 testadores por
      14 dias** antes de liberar a produção — já planejar quem serão os testadores.
- [ ] 🔴 **[Você]** **AdMob:** completar dados fiscais e de pagamento; ativar a mensagem de consentimento em
      **Privacidade e mensagens** (GDPR para Europa; regulamentações estaduais dos EUA se distribuir lá)
- [ ] 🟡 **[Você]** **Railway:** confirmar que está no plano **Hobby** (pago) para o servidor não desligar
- [ ] 🟢 **[Você]** Adicionar o celular como **dispositivo de teste** no AdMob (para testar anúncios reais sem risco)

## 7. Versão para a loja (build de release)

Guia: [ANDROID.md](ANDROID.md), seção 4.

- [ ] 🔴 **[Claude]** `www/js/ads-config.js`: `test: true` → **`test: false`** só no build da loja, e `npm run android:sync`
      (⚠️ a partir daí **nunca clique nos seus próprios anúncios**)
- [ ] 🔴 **[Você]** Criar a **chave de assinatura** (`.jks`) fora do projeto, com backup e senhas guardadas;
      aceitar a **Assinatura de apps do Google Play**
- [ ] 🔴 **[Você]** Gerar o **AAB assinado** (Build → Generate Signed App Bundle)
- [ ] 🟡 **[Claude]** Conferir `versionCode 1` / `versionName "1.0"` em `android/app/build.gradle`
      (aumentar a cada envio) e alinhar com `package.json` (`0.1.0`)
- [ ] 🟡 **[Claude]** Aumentar `VERSAO` em `www/sw.js` (hoje `v8`) ao publicar mudanças no site
- [ ] 🟢 **[Claude]** Avaliar ativar `minifyEnabled` (reduz o tamanho; exige testar de novo)

## 8. Página da loja (Play Console → Presença na loja)

- [ ] 🔴 **[Você/Claude]** Nome (até 30 caracteres), descrição curta (até 80) e descrição completa (até 4.000) — posso escrever os textos
- [ ] 🔴 **[Você]** Ícone **512×512** PNG (dá para partir de `www/icons/icon-512.png`)
- [ ] 🔴 **[Você]** **Imagem de destaque 1024×500**
- [ ] 🔴 **[Você]** **Capturas de tela** do celular na horizontal (mínimo 2; recomendado 4–8 mostrando mira, heróis, chefão, evolução)
- [ ] 🟢 Vídeo de apresentação (YouTube) — opcional
- [ ] 🔴 Categoria: **Jogo → Estratégia** (ou Ação); tags
- [ ] 🔴 E-mail de contato do desenvolvedor (público) e site: `https://gersonhid.github.io`

## 9. Formulários obrigatórios da Play Console (Conteúdo do app)

- [ ] 🔴 **Política de privacidade:** `https://gersonhid.github.io/defensores-da-torre/privacidade.html`
- [ ] 🔴 **Anúncios:** "Sim, contém anúncios"
- [ ] 🔴 **Acesso ao app:** todo o jogo é acessível sem login (convidado) — informar isso
- [ ] 🔴 **Classificação de conteúdo (IARC):** questionário (violência de fantasia leve, sem compras)
- [ ] 🔴 **Público-alvo e conteúdo:** faixa etária escolhida no item 5
- [ ] 🔴 **Segurança dos dados** — declarar (ver [CONTAS.md](CONTAS.md) e [PROPAGANDAS.md](PROPAGANDAS.md)):
  - Contas: nome de usuário, e-mail/nome/foto (Google), progresso do jogo
  - Dados do aparelho: modelo, sistema, idioma, fuso, tela (diagnóstico/analytics)
  - SDK AdMob: **ID de publicidade**, interações, diagnóstico
  - Dados criptografados em trânsito (HTTPS): **sim**
- [ ] 🔴 **Exclusão de conta:** a Play Store exige que o jogador consiga **pedir a exclusão da conta e dos dados**,
      inclusive por um **link na web**. Hoje só existe o comando de administrador (`DELETE /api/admin/usuario`).
      **[Claude]** criar um botão "Excluir minha conta" no jogo e/ou uma página web de pedido de exclusão
- [ ] 🔴 **ID de publicidade:** declarar que o app usa (AdMob) — conferir se a permissão
      `com.google.android.gms.permission.AD_ID` está no manifesto final
- [ ] 🔴 Apps governamentais / financeiros / saúde / notícias: responder "não"

## 10. Lançamento

- [ ] 🔴 **[Você]** Enviar o AAB para **Teste interno** → instalar pela Play Store e testar
- [ ] 🔴 **[Você]** **Teste fechado** (12+ testadores por 14 dias, se a conta for pessoal nova) → corrigir o que aparecer
- [ ] 🔴 **[Você]** Solicitar acesso à **Produção** e enviar para revisão (pode levar de horas a alguns dias)
- [ ] 🟡 **[Você]** No AdMob: **vincular o app à Google Play** depois de publicado e conferir a verificação do `app-ads.txt`
- [ ] 🟡 Acompanhar nos primeiros dias: falhas no Play Console (ANRs/crashes), relatórios do AdMob,
      `GET /api/admin/resumo` no servidor

## 11. Melhorias que podem ficar para depois do lançamento

- [ ] 🟢 Arte final no Gemini (torre, chão, árvore, personagens) — ver [ARTE.md](ARTE.md); hoje usa os placeholders em pixel art
- [ ] 🟢 Sons e música (o jogo ainda não tem áudio?) — conferir
- [ ] 🟢 Tutorial / dicas nos primeiros níveis
- [x] Indicação do jogo para amigos (compartilhar + código com prêmio) — ver [INDICACAO.md](INDICACAO.md)
  - [ ] 🟡 **[Claude]** Publicar o servidor no Railway com as rotas de indicação (`cd server && npx @railway/cli up --service api --ci`)
  - [ ] 🟡 **[Você]** Testar no celular: compartilhar, WhatsApp, copiar link e convite entre dois aparelhos
  - [ ] 🔴 **[Claude]** Ao publicar na Play Store: `PLAY_PUBLICADO = true` em `www/convite.html`
- [ ] 🟢 Conquistas / estrelas por nível
- [ ] 🟢 Tradução para inglês
- [ ] 🟢 Mediação de anúncios (AppLovin MAX / LevelPlay) quando houver algumas centenas de jogadores por dia
- [ ] 🟢 Validação do progresso no servidor (hoje o save é calculado no aparelho)
- [ ] 🟢 Limite de tentativas de login persistente (hoje zera quando o servidor reinicia)

---

## Ordem sugerida

1. Segurança (item 1) → 2. Testes no celular (2) → 3. Decisões (5) → 4. Privacidade + exclusão de conta (3 e 9)
→ 5. Conta Play Console (6) → 6. Build de release (7) → 7. Página da loja e formulários (8 e 9)
→ 8. Teste interno/fechado → 9. Produção (10)
