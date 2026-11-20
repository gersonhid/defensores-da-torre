# Visibilidade — ninguém escondido atrás da torre

> Status: **implementado** (19/11/2026).

## O problema

A câmera olha o campo de frente e de cima. A torre é alta (200 unidades), então ela cobre
uma área grande do chão **atrás** dela. Além disso:

* o **1º herói nascia exatamente atrás da torre** (posição de -90°). Com só o Bárbaro, ele ficava
  sempre escondido;
* quem **renascia** surgia no **centro** da torre, também escondido;
* invasores que vinham pela borda de trás do mapa andavam em linha reta até a torre, escondidos
  atrás dela durante vários segundos.

## Avaliação da ideia do triângulo

A ideia de um triângulo entre o pé e o topo da torre parte da intuição certa: a área escondida
depende da altura da torre e da inclinação da câmera. Mas, fazendo a conta com a câmera do jogo,
a área escondida **não é um triângulo**. É um **corredor quase retangular**:

```
            fundo do mapa
   ┌───────────────────────────┐
   │          ┌─────┐          │   ← termina onde a cabeça do personagem
   │          │     │          │     passa do topo da torre
   │          │ zona│          │
   │          │cega │          │     ~100 de largura × ~360 de profundidade
   │          │     │          │     (quase até a borda de trás do mapa)
   │          └──┬──┘          │
   │            TORRE          │
   │                           │
   └───────────────────────────┘
            frente (jogador)
```

* **Largura:** a largura da torre na tela. Fica quase igual em todas as profundidades (alarga um
  pouco ao fundo, por causa da perspectiva).
* **Profundidade:** como a câmera é baixa, cada unidade de chão para trás "sobe" só ~0,49 na tela.
  Por isso a torre de 200 de altura esconde até ~360 de chão atrás dela. Personagens altos aparecem
  antes (a cabeça passa do topo da torre).

Um triângulo esconderia demais perto da torre e de menos ao fundo. Por isso a zona é calculada
**com a mesma matemática da câmera** (`P.inBlindZone` em `www/js/engine.js`): um personagem conta
como escondido quando **mais da metade do corpo** fica atrás da torre.

## O que foi feito

| Quem | Antes | Agora |
|---|---|---|
| **Invasores** | Andavam reto até o centro da torre | Quem vem por trás **contorna pela lateral** e ataca pelo lado, na altura do pé da torre |
| **Invasores à distância** (Xamã) | Paravam a 190 da torre, às vezes atrás dela | Só atiram de fora da zona cega |
| **Posição dos heróis** | Distribuídos em círculo, o 1º atrás da torre | Distribuídos só no **arco visível** (com 1 herói: na frente da torre) |
| **Herói renascendo** | No centro da torre | Na **porta** (frente) |
| **Herói lutando** | Podia parar atrás da torre | Se estiver na zona cega, **continua atacando e sai pela lateral** |
| **Quem só está passando** | Sumia atrás da torre | Aparece **em transparência por cima da torre** ("raio-x") |

### Tempo escondido atrás da torre (medido no motor, 6 níveis)

| | Antes | Agora |
|---|---|---|
| Invasores | vários segundos por inimigo vindo de trás | **0–0,3%** do tempo |
| Heróis | até ~25% do tempo (o 1º herói: o tempo todo parado) | **1,5–11%**, só **passando** (e visíveis em transparência) |

### Testamos e descartamos: contorno dos heróis pela frente

Fazer os heróis darem a volta **pela frente** da torre zerava o tempo escondido, mas deixava o jogo
bem mais difícil: no nível 15, a torre terminava com 12% de vida em vez de 65%, porque o herói
demorava para chegar. A transparência resolve a visibilidade sem esse custo.

## Dificuldade (simulador, 30 níveis, 8 campanhas)

| | Antes | Agora |
|---|---|---|
| Tentativas — níveis normais | 1,32 | 1,29 |
| Tentativas — chefões | 1,74 | 1,71 |
| Campanhas travadas | 0/8 | 0/8 |

Praticamente igual.

## Ajustes

`www/js/config.js` → `towerSprite`:

| Campo | O que faz |
|---|---|
| `height` | Altura da torre na tela (200). Mude se a arte nova da torre for mais alta ou mais baixa |
| `halfWidth` | Meia largura do corpo da torre (48). Mude se a arte nova for mais larga ou mais estreita |
| `sideMargin` | Folga lateral ao contornar (10) |

⚠️ Quando a **arte da torre do Gemini** entrar (`assets/tower.png`), confira esses dois números
com a proporção da imagem nova.

Transparência: `www/js/render.js` → `drawGhosts` (opacidade 55%, só se ≥25% do personagem estiver
coberto).
