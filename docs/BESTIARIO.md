# Bestiário

> Status: **implementado** (19/11/2026).

Tela com os **5 heróis**, os **3 poderes** e os **9 invasores** (5 comuns + 4 chefões), com retrato, descrição e atributos.
Cada personagem descoberto dá uma **recompensa em Florins, uma única vez**.

## Como o jogador usa

* Menu → **📖 Bestiário**. Quando há recompensa para coletar, o botão fica dourado e mostra
  **🎁 N**.
* Cada carta mostra o retrato. O que ainda não foi descoberto aparece como **silhueta escura**
  (invasores também ficam com o nome **???**).
* Tocar numa carta abre o painel da direita: retrato grande, tipo (Herói / Invasor / 👑 Chefão),
  descrição, atributos, quantos já foram derrotados e o botão **🎁 Coletar 💰 N**.
* Com 2 ou mais recompensas pendentes aparece **🎁 Coletar tudo** no topo.

### Quando cada um é descoberto

| Tipo | Descoberto quando | Aviso |
|---|---|---|
| Herói | É desbloqueado na **Evolução** (o Bárbaro já vem desbloqueado) | "📖 Novo no bestiário!" ao comprar |
| Poder | É desbloqueado na **Evolução → Arcano** | "📖 Novo no bestiário!" ao comprar |
| Invasor / chefão | É **derrotado pela 1ª vez** (em vitória ou derrota) | Linha "📖 Novo no bestiário: Orc" na tela de resultado |

Personagem não descoberto mostra a dica: herói → "desbloqueie na Evolução"; invasor → "aparece a
partir do nível N".

## Recompensas

| Herói | 💰 | Invasor | 💰 | Chefão | 💰 |
|---|---:|---|---:|---|---:|
| Bárbaro | 50 | Goblin | 30 | Rei Goblin (nível 3) | 150 |
| Arqueiro | 100 | Lobo | 40 | Senhor da Guerra Orc (nível 12) | 300 |
| Anão | 150 | Orc | 60 | Ogro Chefe (nível 24) | 500 |
| Elfo | 200 | Xamã | 80 | Troll Ancião (nível 39) | 800 |
| Mago | 300 | Troll | 120 | | |

Poderes: **Raio 150 · Chuva de Gelo 200 · Meteoro 300**.

**Total: 3.530 Florins.** A árvore de evolução inteira custa ~146.000, então o bestiário é um bônus
de descoberta e não muda o balanceamento (o simulador não coleta essas recompensas).

## Retratos ("fotos")

O retrato é o **mesmo sprite usado na partida**, ampliado em pixels inteiros (sem borrar).
Os **poderes** não têm sprite: o ícone (⚡ ❄️ ☄️) é desenhado pequeno e ampliado, ficando com cara de pixel art.
Hoje são os placeholders em pixel art; quando as imagens do Gemini forem colocadas em
`www/assets/chars/` (ver [ARTE.md](ARTE.md)), o bestiário passa a mostrá-las automaticamente.
Os chefões usam `chefe_goblin.png`, `chefe_orc.png`, `ogro.png` e `troll_anciao.png`.

> Ideia para a fase de arte: um retrato maior e mais detalhado só para o bestiário
> (ex.: `assets/portraits/goblin.png`), já que lá ele aparece grande.

## Ajustes

| O quê | Onde |
|---|---|
| Recompensas e descrições | `www/js/config.js` → `bestiary` |
| Lógica (descoberta, coleta, retrato) | `www/js/bestiary.js` |
| Tela | `www/js/main.js` (seção "BESTIÁRIO"), `www/index.html` (`screen-bestiary`), `www/css/style.css` |
| Contagem de abates por tipo | `www/js/engine.js` → `killsBy` |

Dados no save do jogador: `save.bestiary = { kills: { goblin: 43, ... }, claimed: { h_barbaro: true, e_goblin: true } }`.
Vão para a nuvem junto com o resto do progresso (quem tem conta).

## Ideias para depois

- [ ] Recompensas por marcos de abate (ex.: 100 / 1.000 goblins derrotados)
- [ ] Retratos grandes próprios para o bestiário
- [x] Poderes (Raio, Gelo, Meteoro) também no bestiário
- [ ] Retratos próprios para os poderes (hoje são os ícones ampliados)
