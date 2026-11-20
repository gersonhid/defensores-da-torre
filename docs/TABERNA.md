# Taberna

> Status: **implementado** (19/11/2026).

Desbloqueada na **Evolução**. Durante a partida, de tempos em tempos um **herói extra sai pela
porta da torre** e entra na batalha. O tipo do herói é **sorteado na proporção dos heróis que
você convocou** antes da partida.

| Convocados | Chance na Taberna |
|---|---|
| 1 Bárbaro + 2 Arqueiros | 33% Bárbaro · 67% Arqueiro |
| 2 Bárbaros + 1 Anão + 1 Mago | 50% Bárbaro · 25% Anão · 25% Mago |
| Só poderes, nenhum herói | A Taberna não envia ninguém |

## Regras

* O **primeiro herói** chega aos **15 s** de partida; depois, **1 a cada 35 s**.
* Começa com **1 herói da Taberna em campo por vez**. O relógio **só anda enquanto houver vaga**:
  quando o herói da Taberna morre, a contagem recomeça.
* Herói da Taberna **não renasce** e **não gasta pontos de convocação**.
* Usa os mesmos atributos (com a Evolução) do herói convocado.
* Respeita o limite geral de 16 heróis em campo.
* Fica de guarda no lado visível da torre (nunca atrás dela — ver [VISIBILIDADE.md](VISIBILIDADE.md)).

## Onde o jogador vê

| Lugar | O quê |
|---|---|
| Evolução | Ramo **🍺 Taberna**, saindo de **Vitalidade** (Comando) |
| Preparação | Linha "🍺 Taberna: 1 herói a cada 35s (até 1) · 🪓 33% 🏹 67%" |
| Partida (topo) | **🍺 12s** (tempo até o próximo) ou **🍺 cheia** |
| Partida (campo) | Uma caneca sobe da porta quando o herói chega; heróis da Taberna têm uma **🍺 sobre a cabeça** |
| Resultado | "🍺 Heróis da Taberna: N" |
| Como jogar | Parágrafo explicando a Taberna |

## Evolução

| Nó | Efeito | Custo | Requer |
|---|---|---|---|
| **Taberna** | Desbloqueia | 1.200 | Vitalidade nível 2 |
| **Rodada da Casa** (até 6) | -8% de tempo entre heróis por nível (35 s → ~18 s no máximo) | 220 (+45% por nível) | Taberna |
| **Mais Mesas** (até 3) | +1 herói da Taberna em campo ao mesmo tempo (até 4) | 600 (+80% por nível) | Taberna |

## Dificuldade (simulador, 50 níveis, 6 campanhas)

O robô do simulador compra a Taberna, em média, no **nível 32**.

| | Sem Taberna | Com Taberna |
|---|---|---|
| Tentativas — níveis normais | 1,35 | 1,27 |
| Tentativas — chefões | 1,67 | 1,50 |
| Tempo da campanha | 3,0 h | 2,8 h |
| Campanhas travadas | 0/6 | 0/6 |

Ajuda na segunda metade da campanha, como esperado de uma melhoria cara, sem quebrar a curva.
Uma versão mais forte (2 heróis por vez, a cada 30 s) deu resultado parecido: 1,25 / 1,48 / 2,7 h.

## Ajustes

| O quê | Onde |
|---|---|
| Tempo, limite, primeiro herói | `www/js/config.js` → `tavern` (`interval`, `max`, `firstDelay`) |
| Nós da Evolução | `www/js/config.js` → `tree` (`tav_unlock`, `tav_rodada`, `tav_mesas`) |
| Lógica | `www/js/engine.js` → `updateTavern` |
| Caneca e efeito de chegada | `www/js/render.js` (`o.tavern`, efeito `tavern`) |
