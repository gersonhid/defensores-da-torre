# 🏰 Defensores da Torre

Jogo mobile (Android, **horizontal**) de defesa de torre em **pixel art** com câmera inclinada. Invasores surgem dos cantos do mapa e marcham até a torre
no centro. O jogador mira com o dedo (dano em área periódico), convoca heróis com pontos antes de
cada fase e evolui tudo com os Florins ganhos nas batalhas.

* **Heróis:** Bárbaro, Arqueiro, Anão, Elfo, Mago
* **Poderes:** Raio, Chuva de Gelo, Meteoro (desbloqueados na evolução, comprados com pontos)
* **Evolução:** teia de 45 nós a partir de uma única raiz; os guerreiros são liberados em sequência
  (Bárbaro → Arqueiro → Anão → Elfo → Mago) e cada evolução abre as seguintes
* **Contas:** convidado (só no aparelho), Google ou nome de usuário (progresso na nuvem)
* **Campanha:** 50 níveis em fases de 3, com um chefão no fim de cada fase; depois modo infinito
* **Anúncios recompensados (opcionais):** reviver a torre e dobrar Florins — ver docs/ANUNCIOS.md

## Estrutura

```
www/                 o jogo (HTML5 Canvas, sem dependências, sem build)
  index.html
  css/style.css
  js/config.js       ★ TODOS os números de balanceamento
  js/progress.js     cadeia de evolução, geração de níveis, recompensas
  js/engine.js       lógica da partida (sem DOM, usada também pelo simulador)
  js/bot.js          jogador automático (simulador + botão "Auto")
  js/camera.js       câmera inclinada (perspectiva) e conversão do toque para o chão
  js/sprites.js      carrega a arte do Gemini (remove fundo magenta, repixeliza) + placeholders
  js/render.js       desenho em pixel art
  js/ads.js          anúncios recompensados (simulado / H5 / AdMob)
  js/ads-config.js   escolha do provedor de anúncios
  js/cloud.js        contas e progresso na nuvem (cliente da API em server/)
  js/server-config.js  endereço da API e do login Google (null = só local)
  js/main.js         telas, toque, salvamento
  assets/            imagens (ver docs/ARTE.md)
tools/simulate.js    simulador de balanceamento
tools/serve.js       servidor local para testes
docs/BALANCEAMENTO.md  metas, fórmulas, resultados e como ajustar
docs/ARTE.md           prompts do Gemini e especificação das imagens
docs/ANUNCIOS.md       anúncios recompensados, fases/chefões e provedores (AdMob / H5)
docs/CONTAS.md         contas, progresso na nuvem e dados dos jogadores — servidor no Railway
server/                API Node.js + PostgreSQL (contas, progresso, registro de aparelhos)
capacitor.config.json  empacotamento Android
```

## Testar no PC

```bash
npm run serve          # http://localhost:8080
```
Abra no Chrome com a janela deitada (ou F12 → modo dispositivo → girar para horizontal).
O mouse funciona como dedo. Use o servidor em vez de abrir o arquivo direto: via `file://` o
navegador bloqueia o processamento das imagens.

No console do navegador há um gancho de testes: `TD_DEBUG.addFlorins(5000)`, `TD_DEBUG.step(10)`.

## Simular balanceamento

```bash
npm run sim            # ver docs/BALANCEAMENTO.md
```

## Jogar online / gerar APK pelo PWABuilder (sem instalar nada)

**Jogo publicado:** https://gersonhid.github.io/defensores-da-torre/

Cada `git push` na branch `main` republica o site automaticamente (`.github/workflows/pages.yml`).
O jogo funciona offline depois da primeira visita (service worker em `www/sw.js`).

Para gerar o pacote Android:
1. Acesse https://www.pwabuilder.com e cole o endereço do jogo.
2. Clique em **Package for stores → Android → Generate Package**.
3. Baixe o `.zip`: ele traz o `.apk` (para instalar direto no celular), o `.aab` (para a Google
   Play) e a **chave de assinatura** — guarde a chave e a senha, elas são necessárias para todas as
   atualizações futuras na Play Store.

Ao publicar mudanças grandes, aumente `VERSAO` em `www/sw.js` para os jogadores receberem a versão nova.

## Gerar o app Android pelo Capacitor (alternativa local)

Requisitos: **Node 20+**, **Android Studio** (recente) e **JDK 21**. O Java 8 instalado nesta
máquina não serve para o Android atual — use o JDK que vem com o Android Studio
(`File → Settings → Build → Gradle → Gradle JDK`).

```bash
npm install
npm run android:add     # cria a pasta android/ (só na primeira vez)
npm run android:sync    # copia www/ para o projeto Android (rode após cada mudança)
npm run android:open    # abre no Android Studio → Run ▶ ou Build → Generate APK
```

Depois do `android:add`, trave a tela na horizontal: em `android/app/src/main/AndroidManifest.xml`,
na tag `<activity ...>`, adicione `android:screenOrientation="sensorLandscape"`.

## Próximos passos sugeridos

* Gerar a arte no Gemini seguindo `docs/ARTE.md` (cenário primeiro, personagens depois).
* Testar a dificuldade dos níveis 1–10 com pessoas reais e ajustar `threatLinear`.
* Conquistas/estrelas por nível (ex.: vencer com torre > 80%) para dar motivo de repetir níveis.
