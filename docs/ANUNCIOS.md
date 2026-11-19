# Anúncios recompensados e fases com chefão

## Design

* **Fase = 3 níveis.** O 3º nível de cada fase termina com um **chefão** que entra depois da última
  onda. Os chefões evoluem com o jogo:

  | Níveis | Chefão |
  |--------|--------|
  | 3 – 9   | 👑 Rei Goblin |
  | 12 – 21 | 👹 Senhor da Guerra Orc |
  | 24 – 36 | 👿 Ogro Chefe |
  | 39 +    | 🗿 Troll Ancião (2 chefões a partir do nível 48) |

* **Dois anúncios recompensados** (o jogador sempre escolhe assistir; nada é forçado):
  1. **Reviver a torre** — quando a torre cai: volta com 50% da vida e uma onda de choque atordoa
     os inimigos próximos. Uma vez por partida.
  2. **Dobrar Florins** — na tela de resultado (vitória ou derrota), repete os Florins da partida.
* **Sem anúncios o jogo continua vencível**, só mais lento: é preciso repetir níveis para juntar
  Florins. Isso é importante para a avaliação na loja e para as políticas do Google.

Ajustes em `www/js/config.js`: `levels.bossEvery`, `bossHpMult`, `bossDmgMult`, `bossDelay`,
stats de cada chefão em `enemies`, e a seção `ads` (vida ao reviver, raio/tempo do atordoamento).

## Resultado do simulador (perfil médio, 6 campanhas — invasores surgindo de todo o contorno do mapa)

```bash
node tools/simulate.js --levels 50 --seeds 6          # sem anúncios
node tools/simulate.js --levels 50 --seeds 6 --ads    # bot assiste: reviver ao perder,
                                                      # dobrar ao perder ou em nível de chefão
```

| | Sem anúncios | Com anúncios |
|---|---|---|
| Tentativas por nível normal | 1,35 | 1,04 |
| Tentativas por nível de chefão | 1,67 (2–3 nos chefões dos níveis 18–48) | 1,09 |
| Tempo para terminar a campanha | 3,0 h | 2,2 h |
| Anúncios assistidos | – | ~31 por campanha (≈ 1 a cada 1,6 níveis) |
| Campanhas que travaram | 0/6 | 0/6 |

Os chefões até o nível 15 passam de primeira, mas com a torre quase destruída — é onde o jogador
descobre o "Reviver". A partir do nível 18 cada chefão vira o "muro" da fase.

## Provedores (`www/js/ads-config.js`)

| provider | Para | Situação |
|----------|------|----------|
| `simulado` | testar o fluxo | **ativo agora** — mostra um anúncio falso de 5 s, não gera receita |
| `h5` | jogo publicado como site/PWA (GitHub Pages + PWABuilder) | precisa de conta AdSense **e aprovação** no programa H5 Games Ads |
| `admob` | app gerado pelo **Capacitor** | caminho mais comum na Google Play; precisa trocar o empacotamento |
| `off` | sem anúncios | os botões somem |

### Qual escolher

* **AdMob + Capacitor (recomendado para a Google Play):** é o produto de anúncios feito para apps,
  com melhor preenchimento e receita, e aprovação simples. Exige gerar o APK pelo Capacitor
  (`npm run android:*`, Android Studio) em vez do PWABuilder. Passos:
  1. Criar conta em https://admob.google.com, registrar o app Android e criar um bloco
     **"Premiado" (Rewarded)**.
  2. `npm install @capacitor-community/admob` e `npx cap sync android`.
  3. Colocar o **ID do app AdMob** no `AndroidManifest.xml` (meta-data
     `com.google.android.gms.ads.APPLICATION_ID`) e o **ID do bloco** em `admob.rewardedId`.
  4. `provider: 'admob'`, `test: true` até publicar (nunca clique nos seus próprios anúncios reais).
* **H5 Games Ads (mantém PWABuilder):** é o programa do Google para jogos web. Requer conta AdSense
  com o site aprovado e inscrição no H5 Games Ads (pode demorar e nem todos os sites são aceitos).
  Depois: `provider: 'h5'`, `h5.client: 'ca-pub-...'`, `test: true` até a aprovação.

## Obrigações antes de publicar com anúncios

* **Google Play Console:** marcar "Contém anúncios" e atualizar o formulário **Segurança dos dados**
  (SDKs de anúncio coletam identificador de publicidade, dados de interação e diagnóstico).
* **Política de privacidade:** a seção de anúncios já foi adicionada em `www/privacidade.html` —
  revise quando escolher o provedor.
* **LGPD / consentimento:** o AdMob oferece o formulário de consentimento (UMP). Para usuários no Brasil
  e na Europa, ative a mensagem de consentimento no painel do AdMob.
* **Público infantil:** se o jogo for para crianças, os anúncios precisam ser configurados como
  "direcionados a crianças" e seguir a política Famílias — informe antes de ativar.
* Recompensas devem ser entregues **somente** quando o anúncio é assistido até o fim (já é assim)
  e o jogador sempre precisa poder recusar (botões "Desistir"/ignorar).
