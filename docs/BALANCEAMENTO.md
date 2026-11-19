# Balanceamento — Defensores da Torre

Todos os números ficam em **`www/js/config.js`**. O simulador **`tools/simulate.js`** joga a campanha
inteira com um bot que usa **o mesmo motor do jogo** (`www/js/engine.js`). Altere um número,
rode a simulação e compare.

```bash
npm run sim                  # jogador "médio", 40 níveis, 6 sementes
npm run sim:casual           # jogador com mira imprecisa e reação lenta
npm run sim:bom              # jogador habilidoso
node tools/simulate.js --levels 60 --seeds 10 --attempts 8
node tools/simulate.js --noupgrade --levels 20   # sem evolução: mostra onde está a "parede"
```

## 1. Metas de dificuldade

| Faixa      | Meta                                                          | Por quê |
|------------|---------------------------------------------------------------|---------|
| Níveis 1–5 | Vitória na 1ª tentativa, torre > 50%                          | Aprendizado, sem frustração |
| 6–25       | 1 a 2 tentativas em média; derrotas ocasionais em chefes      | O jogador sente a necessidade de evoluir |
| 26–45      | 1,5 a 3 tentativas; precisa escolher bem a evolução           | Estratégia e "farm" de Florins |
| 46–50      | Desafio final; árvore quase completa                          | Clímax da campanha |
| 51+        | Modo infinito: fica cada vez mais difícil até travar          | Placar / desafio pessoal |

A derrota **nunca é perda total**: os Florins dos abates são sempre recebidos. Isso garante que o
jogador sempre progride, mesmo perdendo — é a válvula de escape contra "paredes".

## 2. Resultado atual (5 sementes por perfil)

| Indicador                                   | Casual | Médio | Bom |
|---------------------------------------------|:------:|:-----:|:---:|
| Campanhas que travaram (8 tentativas)       | 0/5    | 0/5   | 0/5 |
| Tentativas médias, nível 25 (chefe)         | 3,0    | 3,2   | 2,0 |
| Tentativas médias, nível 30 (chefe)         | 3,4    | 2,4   | 2,2 |
| Árvore de evolução completada no nível       | ~49    | ~50   | ~50 |

Participação no dano (perfil médio):

| Níveis | Mira | Heróis | Poderes |
|--------|:----:|:------:|:-------:|
| 1–10   | 63%  | 37%    | 0%      |
| 11–20  | 48%  | 48%    | 4%      |
| 21–30  | 46%  | 40%    | 13%     |
| 31–40  | 44%  | 40%    | 16%     |
| 41–50  | 38%  | 41%    | 21%     |

A mira é a mecânica principal no início e vai dividindo o protagonismo com heróis e poderes, que
o jogador foi desbloqueando — isso dá a sensação de crescimento.

**Pontos ainda "fáceis" conhecidos:** níveis 6–9 e 11–12 ficam com torre > 85%. Isso é intencional
(fase de lua de mel do mobile), mas se quiser apertar, aumente `threatLinear`.

## 3. Como as curvas funcionam

### Invasores (por nível N)
```
ameaça(N)  = baseThreat × (1 + threatLinear·(N−1) + threatQuad·(N−1)²) × (1 + waveThreatStep·onda)
vida       = hpBase × hpGrowth^(N−1)
dano       = dmgBase × dmgGrowth^(N−1)
ondas      = min(8, 3 + floor((N−1)/4))
```
Cada onda "compra" invasores com o orçamento de ameaça (goblin = 1, orc = 3, troll = 10...),
sorteados pelo `weight` entre os tipos já liberados (`unlockLevel`).

| Nível | Ondas | Invasores | Mult. ameaça | Mult. vida | Vida total na fase | Pontos base |
|------:|------:|----------:|-------------:|-----------:|-------------------:|------------:|
| 1     | 3     | 43        | ×1,00        | ×1,00      | 1.290              | 6           |
| 10    | 5     | 73        | ×2,25        | ×1,25      | 8.000              | 12          |
| 20    | 7     | 209       | ×4,04        | ×1,60      | 25.100             | 20          |
| 30    | 8     | 405       | ×6,25        | ×2,05      | 57.100             | 27          |
| 50    | 8     | 761       | ×11,9        | ×3,35      | 179.000            | 42          |

**Por que linear + quadrático e não exponencial?** O poder do jogador cresce rápido no início
(upgrades baratos que se multiplicam) e devagar no fim (custos exponenciais, árvore com limite).
Uma curva exponencial de inimigos era fácil demais no meio e uma parede no fim (testado: com
+13%/nível, a árvore acabava no nível 26 e o jogo travava no 29).

### Chefes
Ogro Chefe na última onda a cada 5 níveis (2 chefes a partir do nível 40). Muita armadura (8):
pune quem só investiu em ataques fracos e rápidos e recompensa **Disparo Perfurante**, Anão,
Mago e Meteoro. São picos de dificuldade planejados (~2–3 tentativas).

### Armadura
`dano = max(25% do golpe, golpe − armadura)`. Golpes fortes (mira, Anão, Meteoro) ignoram
armadura na prática; golpes fracos e rápidos (Elfo) sofrem contra Orcs/Trolls/Chefes.
Isso cria contra-estratégias sem precisar de tabelas de "fraquezas".

### Pontos de convocação
`pontos = 6 + floor(0,75·(N−1)) + Estrategista (até +10)`. Máximo de 16 heróis em campo.

| Unidade   | Custo | Papel |
|-----------|:-----:|-------|
| Bárbaro   | 3 | Tanque corpo-a-corpo barato, bloqueia o caminho |
| Arqueiro  | 3 | Dano à distância, alvo único |
| Anão      | 4 | Tanque com armadura alta e martelo em área |
| Elfo      | 5 | Dano rápido de longo alcance; fraco contra armadura |
| Mago      | 6 | Bola de fogo em área; frágil |
| Raio      | 5 | Cadeia entre inimigos, recarga 12s |
| Gelo      | 6 | Área com dano contínuo + 50% lentidão, recarga 18s |
| Meteoro   | 8 | Grande dano em área, recarga 22s |

**Poderes têm recarga, não cargas.** Na 1ª versão eles eram de uso único e davam só 1–3% do dano
custando 30% dos pontos — um herói que luta a partida inteira sempre valia mais. Com recarga, um
poder é usado ~8–12 vezes por partida e compete de igual para igual com heróis.

### Florins (economia)
```
por abate      = recompensa do invasor × (1 + 6% × Saque)
vitória        = (25 + 10·N) × (1 + 20% × Tesouro Real)   (30% disso ao repetir um nível)
```
A renda cresce junto com a quantidade de inimigos (abates). A árvore inteira custa
**~146.000 Florins** — calibrada para ser completada perto do nível 50.

| Ramo     | Custo total | Ramo     | Custo total |
|----------|------------:|----------|------------:|
| Comando  | 32.500 | Bárbaro  | 13.800 |
| Arcano   | 31.000 | Arqueiro | 8.500  |
| Mira     | 18.300 | Mago     | 8.400  |
| Torre    | 14.200 | Elfo     | 7.100  |
| Tesouro  | 5.400  | Anão     | 6.600  |

Custo de cada nível do nó: `round(custo × crescimento^nívelAtual)`. Os nós "infinitos" no início
(+12% com crescimento 1,32) são baratos e dão retorno imediato; desbloqueios custam caro e mudam a
forma de jogar (Anão 250, Elfo 500, Mago 800, Raio 350, Gelo 650, Meteoro 1.100).

## 4. Receita para ajustar

| Sintoma no simulador                              | Ajuste |
|---------------------------------------------------|--------|
| Muitos "fácil demais" no meio                     | ↑ `threatLinear` |
| "PAREDE" no fim / árvore acaba cedo               | ↓ `threatQuad`, ↑ `growth` dos nós, ou mais níveis (`max`) |
| Chefe vira parede                                 | ↓ `ogro.hp`/`armor`, ou ↑ Disparo Perfurante |
| Perfis casual e bom com resultados iguais         | ↓ `aim.radius` e ↑ `aim.damage` (precisão passa a importar) |
| Um herói nunca é escolhido / domina               | Veja a tabela "Participação no dano" e ajuste custo/dano |
| Jogador acumula Florins sem ter o que comprar     | Aumente `max` de nós ou `growth` |

Mantenha a regra: **cada mudança → rode os 3 perfis**. Uma mudança que só ajuda o jogador "bom"
aumenta a distância entre jogadores; uma que só ajuda o "casual" achata a habilidade.

## 5. Limitações do simulador

* O bot compra evolução pelo "menor custo ÷ peso do ramo" — um humano pode escolher pior (ou
  melhor). Teste também estratégias extremas (ex.: só Mira) editando `BRANCH_WEIGHT` em `www/js/bot.js`.
* O bot não erra por distração nem usa a mira para "segurar" inimigos perto da torre. Os números
  são uma referência; **confirme jogando no celular**, principalmente os níveis 1–10.
* A composição das ondas é aleatória, então níveis vizinhos variam. Use `--seeds 10` ou mais
  antes de tirar conclusões.
