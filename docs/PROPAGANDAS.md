# Propagandas no jogo — como funcionam e quais são as opções

> Resumo: o jogo usa **anúncios premiados** ("assista e ganhe"). Hoje eles são **simulados**
> (não geram dinheiro). Para ganhar dinheiro de verdade é preciso escolher uma **rede de anúncios**,
> criar a conta nela e trocar o provedor no arquivo `www/js/ads-config.js`.
> **Recomendação: AdMob (Google) + gerar o app pelo Capacitor.**

---

## 1. Como uma propaganda funciona (o básico)

```
Jogador toca "📺 Reviver"  →  o jogo pede um anúncio à REDE DE ANÚNCIOS
                            →  a rede faz um leilão entre ANUNCIANTES (em milissegundos)
                            →  o vencedor mostra um vídeo (15–30 s)
                            →  jogador assiste até o fim  →  o jogo entrega a recompensa
                            →  o anunciante paga a rede  →  a rede repassa parte para você
```

* **Rede de anúncios** (ex.: Google AdMob): intermedia anunciantes e jogos. Você só se cadastra nela.
* **Anunciante**: empresa que paga para o vídeo dela aparecer (outros jogos, apps, lojas...).
* **Você recebe** a maior parte do valor (no AdMob, por volta de 2/3; a rede fica com o resto).

### Tipos de anúncio

| Tipo | Como é | Usado no jogo? |
|------|--------|----------------|
| **Premiado (rewarded)** | O jogador **escolhe** assistir em troca de algo | ✅ Sim (reviver / dobrar Florins) |
| Intersticial | Tela cheia que aparece **sem o jogador pedir** (ex.: entre fases) | ❌ Não — irrita e derruba a avaliação |
| Banner | Faixa fixa na tela | ❌ Não — rende pouco e atrapalha a jogabilidade |

O premiado é o mais bem aceito pelos jogadores **e** o que mais paga por exibição.

### Onde aparecem hoje no jogo

| Momento | Recompensa | Limite |
|---------|-----------|--------|
| A torre caiu | Revive com 50% da vida + atordoa inimigos próximos | 1 vez por partida |
| Tela de resultado | Dobra os Florins da partida | 1 vez por partida |

O jogador **nunca é obrigado**: sempre pode recusar e o jogo continua vencível sem anúncios
(só mais lento). O simulador indica ~1 anúncio a cada 1,6 nível para quem decide assistir.

---

## 2. Quanto rende (estimativa — os valores variam muito)

O ganho é medido em **eCPM** = quanto você recebe a cada **1.000** anúncios assistidos.

| Fator | Efeito |
|-------|--------|
| País do jogador | EUA/Europa pagam bem mais que Brasil |
| Época do ano | Paga mais perto do Natal / Black Friday, menos em janeiro |
| Tipo de anúncio | Premiado paga mais que banner |
| Rede e concorrência | Mais redes disputando (mediação) = preço maior |

Faixa **aproximada** para anúncio premiado com público no **Brasil**: algo entre **US$ 1 e US$ 5 por
1.000 anúncios**. Nos EUA pode passar de US$ 10. Trate como ordem de grandeza, não como promessa.

**Exemplo ilustrativo** (Brasil, eCPM de US$ 3):

| Jogadores por dia | Anúncios/jogador/dia | Anúncios por mês | Receita estimada/mês |
|------------------:|---------------------:|-----------------:|---------------------:|
| 100   | 2 | 6.000   | ~US$ 18  |
| 1.000 | 2 | 60.000  | ~US$ 180 |
| 10.000| 2 | 600.000 | ~US$ 1.800 |

Ou seja: a receita depende principalmente de **quantas pessoas jogam todo dia**.
Lembre do custo do servidor (Railway, ~US$ 5/mês no plano Hobby).

### Como o dinheiro chega
* A rede acumula o saldo e paga **uma vez por mês**, quando passa do **mínimo de pagamento**
  (no AdMob/AdSense é de US$ 100 ou o equivalente local — confira na sua conta).
* É preciso cadastrar dados fiscais e bancários na conta da rede. Pagamento em reais por transferência.

---

## 3. As opções

### Opção A — Google AdMob (recomendada para a Google Play)

A rede de anúncios do Google feita para **aplicativos**.

| | |
|---|---|
| ✅ Vantagens | Maior rede do mundo, aprovação simples, muitos anunciantes, painel em português, relatórios completos |
| ⚠️ Exige | O app ser gerado pelo **Capacitor/Android Studio** (o AdMob não funciona em app gerado pelo PWABuilder) |
| ⚠️ Exige | Arquivo **`app-ads.txt`** num site seu (pode ser no GitHub Pages) e o site informado na Play Store |
| 💰 Custo | Gratuito |
| ⏱️ Prazo | Conta em minutos; anúncios reais costumam começar em alguns dias após publicar o app |

**O que muda para nós:** em vez de gerar o APK no pwabuilder.com, você gera no **Android Studio**
(o projeto já está preparado: `npm run android:add` / `android:open`). O código do anúncio AdMob
já está pronto em `www/js/ads.js` — falta instalar o plugin e colocar os IDs.

### Opção B — Google H5 Games Ads (AdSense para jogos web)

Programa do Google para **jogos que rodam no navegador**.

| | |
|---|---|
| ✅ Vantagens | Mantém o caminho atual (site no GitHub Pages + PWABuilder); o jogo também gera dinheiro quando jogado direto no site |
| ⚠️ Exige | Conta **AdSense aprovada** + **inscrição e aprovação** no programa H5 Games Ads (pode demorar ou ser recusada) |
| ⚠️ Atenção | O AdSense exige um **domínio próprio** com conteúdo; um endereço `github.io` costuma não ser aceito |
| 💰 Custo | Gratuito (mas provavelmente um domínio próprio, ~R$ 40/ano para `.com.br`) |
| ⏱️ Prazo | Semanas (aprovação) |

### Opção C — Mediação (AppLovin MAX, Unity LevelPlay) — para depois

Uma "central" que coloca **várias redes** (AdMob, Unity Ads, Meta, AppLovin...) para disputar cada
anúncio. Mais concorrência = **eCPM maior** (normalmente 20–50% a mais).

| | |
|---|---|
| ✅ Vantagens | Maior receita por anúncio; se uma rede não tiver anúncio, outra preenche |
| ⚠️ Desvantagens | Mais contas para criar, mais configuração, mais SDKs no app |
| 👉 Quando | Quando o jogo já tiver **algumas centenas de jogadores por dia**. Antes disso não compensa |

### Opção D — Portais de jogos web (Poki, CrazyGames)

Sites com milhões de jogadores que **publicam** seu jogo e dividem a receita dos anúncios deles.

| | |
|---|---|
| ✅ Vantagens | Trazem **jogadores** (o maior problema de um jogo novo) além dos anúncios |
| ⚠️ Desvantagens | Seleção rigorosa; exigem o SDK deles; alguns pedem exclusividade na web |
| 👉 Quando | Pode ser feito **em paralelo** à Google Play, com a versão web do jogo |

### Comparação rápida

| | AdMob | H5 Games Ads | Mediação | Portais |
|---|:---:|:---:|:---:|:---:|
| Funciona no app da Google Play | ✅ (Capacitor) | ✅ (PWABuilder) | ✅ (Capacitor) | ❌ |
| Funciona no site | ❌ | ✅ | ❌ | ✅ (no portal) |
| Facilidade de aprovação | Alta | Baixa | Média | Baixa |
| Receita por anúncio | Boa | Boa | Melhor | Variável |
| Esforço de configuração | Médio | Médio | Alto | Médio |

---

## 4. Regras que precisam ser seguidas (valem para qualquer rede)

1. **Nunca clique nos seus próprios anúncios reais** e não peça para amigos clicarem.
   Isso é fraude e a conta é banida com o saldo retido. Durante testes, use **anúncios de teste**
   (o jogo já vem configurado com `test: true`).
2. **Só dê a recompensa se o anúncio foi assistido até o fim** (o jogo já faz isso).
3. **O jogador sempre pode recusar** (botões "Desistir"/ignorar — já existe).
4. **Consentimento (LGPD / Europa):** o AdMob oferece uma mensagem de consentimento pronta (UMP),
   que deve ser ativada no painel.
5. **Google Play:** marcar **"Contém anúncios"** e atualizar o formulário **Segurança dos dados**
   (anúncios coletam identificador de publicidade, interação e diagnóstico).
6. **Política de privacidade:** já tem a seção de anúncios em `www/privacidade.html` —
   preencher o campo `[DEFINIR]` com a rede escolhida.
7. **Público infantil:** se o jogo for para crianças, os anúncios precisam ser configurados como
   "direcionados a crianças" (menos anunciantes, renda menor) e seguir a política **Famílias**.

---

## 5. Passo a passo da opção recomendada (AdMob)

**Você faz:**
1. Criar a conta em **https://admob.google.com** (com sua conta Google) e preencher os dados de pagamento.
2. Adicionar um app: **Android** → "o app ainda não está publicado" → nome `Defensores da Torre`.
3. Criar um **bloco de anúncios** do tipo **"Premiado" (Rewarded)**, nome `reviver_dobrar`.
4. Me enviar dois códigos (não são segredos):
   * **ID do app**: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`
   * **ID do bloco**: `ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`
5. Instalar o **Android Studio** (para gerar o APK/AAB).

**Eu faço:**
1. Instalo o plugin AdMob no projeto Capacitor e configuro os IDs (com anúncios de teste).
2. Crio o `app-ads.txt` e o publico.
3. Ativo `provider: 'admob'` em `www/js/ads-config.js`.
4. Te guio para gerar o APK no Android Studio e testar no celular.
5. Quando estiver tudo certo, troco para anúncios reais (`test: false`) para a versão da loja.

---

## 6. Como trocar o provedor (referência técnica)

Arquivo `www/js/ads-config.js`:

```js
window.TD_ADS_CONFIG = {
  provider: 'simulado',   // 'simulado' | 'admob' | 'h5' | 'off'
  admob: { rewardedId: 'ca-app-pub-.../...', test: true },
  h5:    { client: 'ca-pub-...', test: true },
};
```

* `simulado` — vídeo falso de 5 s para testar o fluxo (estado atual, **não gera receita**)
* `off` — esconde todos os botões de anúncio
* Força dos prêmios (vida ao reviver etc.): `www/js/config.js` → seção `ads`
* Números de dificuldade com/sem anúncio: `docs/ANUNCIOS.md`

---

## 7. Blocos de anúncio — por que separar e como estão configurados

**Separar em blocos não aumenta o valor pago por anúncio.** A vantagem é *saber e controlar*:

1. **Relatórios separados** — quantas vezes cada momento é assistido e quanto rende.
2. **Ajustes independentes** — preço mínimo (piso de eCPM) e frequência por bloco.
3. **Testes** — mudar a recompensa de um momento e medir só ele.
4. **Mediação** (futuro) — configuração de redes por bloco.
5. **Formatos diferentes** (premiado, intersticial, banner) exigem blocos diferentes.

Cuidado: blocos demais com poucos jogadores deixam os dados picados. O recomendado pelo Google é
**um bloco por momento de exibição** — no nosso caso, dois.

### Os dois tipos de ID que o AdMob fornece

| ID | Formato | O que identifica | Onde vai |
|----|---------|------------------|----------|
| **ID do app** | `ca-app-pub-…`**`~`**`…` (com **~**) | O jogo inteiro — igual em todos os blocos | `AndroidManifest.xml` (uma vez) |
| **ID do bloco** | `ca-app-pub-…`**`/`**`…` (com **/**) | Um momento específico do jogo | Código do jogo, por momento |

O número do meio (`8988709771724980`) é o **ID de editor** (a sua conta AdMob).
Nenhum desses IDs é segredo — ficam dentro do app publicado.

### Configuração atual (`www/js/ads-config.js`)

| Momento | ID do bloco |
|---------|-------------|
| Reviver a torre | `ca-app-pub-8988709771724980/7305222364` |
| Dobrar Florins | `ca-app-pub-8988709771724980/4331574667` |
| **ID do app** | `ca-app-pub-8988709771724980~4728653773` |

* No **site/PWA** o jogo continua com o anúncio **simulado** (o AdMob não funciona em site).
* No **app Android gerado pelo Capacitor** o jogo troca sozinho para **AdMob** (`autoAdmobInApp`).
* `test: true` → anúncios de **teste** do Google. Só mude para `false` na versão enviada à loja.

### app-ads.txt (obrigatório para o AdMob pagar normalmente)

É um arquivo de texto que prova que você é o dono do app. Conteúdo:

```
google.com, pub-8988709771724980, DIRECT, f08c47fec0942fa0
```

Ele precisa ficar na **raiz** do site de desenvolvedor informado na Google Play
(ex.: `https://SEU-SITE/app-ads.txt`). O endereço atual do jogo
(`gersonhid.github.io/defensores-da-torre/`) **não é raiz**. Opções:

* criar no GitHub o repositório especial **`gersonhid.github.io`** (vira o site
  `https://gersonhid.github.io/`) com o `app-ads.txt` e informar esse endereço na Play Console; ou
* usar um domínio próprio (ex.: `defensoresdatorre.com.br`).
