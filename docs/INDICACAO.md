# Indicação de amigos

> Status: **implementado** (19/11/2026). Falta publicar o servidor no Railway e testar no celular —
> ver checklist no fim.

## Como funciona para o jogador

1. Menu → **🎁 Indicar amigos** (ou **🎁 Desafiar um amigo** na tela de vitória contra chefão).
2. A tela mostra o **código pessoal** (6 letras/números, ex.: `K7PQ3M`) e três botões:
   - **📤 Compartilhar** — abre o menu do celular (WhatsApp, Telegram, SMS, e-mail...). No PC sem esse
     menu, copia o link.
   - **💬 WhatsApp** — abre o WhatsApp com a mensagem pronta.
   - **📋 Copiar link**.
3. O amigo abre o link → página `convite.html` → entra no jogo já com o código guardado.
4. Quando o amigo **cria uma conta** e **vence o nível 3** (primeiro chefão), o convite é concluído:

| Quem | Prêmio |
|---|---|
| Quem indicou | 💰 **500 Florins** (até **10 amigos**) |
| O amigo | 💰 **300 Florins** |

Os Florins chegam sozinhos com um aviso no topo da tela ("🎁 +💰 500 — um amigo completou o convite!")
na próxima vez que o jogo conversar com o servidor (ao abrir o jogo, ao entrar na conta ou ao abrir a
tela de indicação).

A tela também mostra: quantos amigos entraram pelo link, quantos completaram e quantos foram premiados.
Quem entrou por convite vê o que falta fazer ("crie uma conta e vença o nível 3...").

### Mensagem enviada

> Bora defender a torre comigo! 🏰⚔️ Baixe o Defensores da Torre e vamos ver quem vai mais longe:
> https://gersonhid.github.io/defensores-da-torre/convite.html?ref=K7PQ3M

Para mudar o texto: `www/js/invite.js` → `message`. O nome do jogo fica em `GAME_NAME` (trocar para
"Guardians of the Lost Tower" junto com o resto do app).

## Como o código do convite chega ao jogo

| Caminho | Como |
|---|---|
| **Site** | `convite.html?ref=CODIGO` → `index.html?ref=CODIGO` → o jogo guarda o código e limpa o endereço |
| **App (Play Store)** | `convite.html` manda o Android para a loja com `&referrer=ref%3DCODIGO`; na 1ª abertura o app lê esse dado pelo plugin nativo `InstallReferrer` (**só depois de publicado** — ver abaixo) |
| **Digitado** | Na tela 🎁, campo **"Recebeu um convite?"** (aparece só para quem ainda não usou convite e começou a jogar há até 7 dias) |

O código fica guardado no aparelho até o servidor confirmar. Sem internet, o jogo tenta de novo depois.

### Antes e depois de publicar na Play Store

Em `www/convite.html`:

```js
var PLAY_PUBLICADO = false;   // mude para true quando o app estiver na Play Store
```

* `false` (agora): todo mundo vai para o jogo no navegador.
* `true`: no Android vai para a **Play Store** (com o código); nos outros aparelhos, para o navegador.
  Os links que os jogadores já enviaram continuam funcionando.

A página também tem as tags de **prévia do link** (título, descrição e ícone que aparecem no WhatsApp).

## Regras contra fraude (no servidor)

| Regra | Por quê |
|---|---|
| Prêmio só quando o amigo **tem conta** e **vence o nível 3** | Instalar e abandonar não conta |
| Código vale só para quem **começou a jogar há até 7 dias** | Jogador antigo não "se convida" |
| Cada jogador usa **um** convite; não vale o próprio código | — |
| Não vale no **mesmo aparelho** de quem convidou | Cada aparelho tem um identificador aleatório (`deviceId`) que sobrevive ao "sair da conta" |
| Quem indica ganha por no máximo **10 amigos** | O amigo continua ganhando os 300 mesmo depois do limite |
| Limite de 10 tentativas de código a cada 10 min por IP | Evita "chutar" códigos |
| Prêmio entregue **uma vez só** | O servidor marca como resgatado |

Limitação conhecida: o nível alcançado é informado pelo próprio jogo (o progresso é calculado no
aparelho). Alguém com conhecimento técnico conseguiria burlar — com prêmio de 500 Florins e limite de
10 amigos, o risco é pequeno.

## Ajustes

| O quê | Onde |
|---|---|
| Prêmios, limite, nível do marco, prazo de "jogador novo" | `server/src/index.js` → `REF` (o jogo lê os valores do servidor) |
| Texto da mensagem, nome do jogo | `www/js/invite.js` → `message`, `GAME_NAME` |
| Endereço do site usado no link | `www/js/server-config.js` → `siteUrl` |
| Play Store ligada/desligada | `www/convite.html` → `PLAY_PUBLICADO` |

## Partes técnicas

| Parte | Arquivo |
|---|---|
| Tela, avisos, entrega dos Florins | `www/js/main.js` (seção "INDICAR AMIGOS"), `www/index.html` (`screen-invite`) |
| Compartilhar, WhatsApp, copiar, captura do código | `www/js/invite.js` |
| Chamadas à API | `www/js/cloud.js` → `TD_CLOUD.referral` |
| Página do link | `www/convite.html` |
| API | `server/src/index.js`: `GET /api/indicacao`, `POST /api/indicacao/usar`, `/marco`, `/resgatar` |
| Banco | tabela `referrals` + coluna `users.ref_code` (criadas sozinhas ao iniciar o servidor) |
| Testes | `server/test/api.test.js` (`cd server && npm test` — 26 testes) |
| Compartilhar no app | plugin `@capacitor/share` |
| Install referrer no app | `android/.../InstallReferrerPlugin.java` + `com.android.installreferrer:installreferrer:2.2` |
| Painel admin | `GET /api/admin/resumo` agora mostra `indicacoes` (total, concluídas, quantos indicam) |

## Checklist para colocar no ar

- [x] Servidor: rotas, banco e testes
- [x] Jogo: tela, botões, avisos, código digitado
- [x] Página `convite.html` com prévia do link
- [x] Android: plugin de compartilhar + leitura do referrer da Play Store (compilado com sucesso)
- [x] Política de privacidade: linha sobre convites
- [ ] **Publicar o servidor** no Railway (sem isso o jogo mostra só o link, sem código e sem prêmios)
- [ ] Publicar o site (`git push`) para o `convite.html` ficar no ar
- [ ] Testar no celular: Compartilhar, WhatsApp, Copiar link
- [ ] Testar entre dois aparelhos: A envia o link → B abre, cria conta, vence o nível 3 → os dois recebem
- [ ] Ao publicar na Play Store: `PLAY_PUBLICADO = true` e testar a instalação pelo link

## Para depois

- [ ] Compartilhar **imagem de conquista** ("Venci o Troll Ancião no nível 39!")
- [ ] **QR Code** na tela de indicação
