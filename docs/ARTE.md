# Arte — gerando imagens no Gemini

> **Nome comercial do jogo: "Guardians of the Lost Tower".** Use esse nome no logo, ícone, imagem de
> destaque da loja e tela de título. A arte deve combinar com o tema de uma **torre perdida/antiga**
> (pedras gastas, musgo, ruínas, mistério) — vale ajustar os prompts abaixo nessa direção.

O jogo já roda com **placeholders em pixel art** feitos no código. Cada imagem que você colocar em
`www/assets/` substitui o placeholder correspondente automaticamente — dá para trocar aos poucos.

## Como o jogo trata as imagens

1. **Fundo magenta vira transparente.** O Gemini não gera PNG transparente de forma confiável, então
   peça sempre **fundo magenta puro (#FF00FF)**. O jogo remove essa cor ao carregar.
2. **Repixelização automática.** O Gemini entrega imagens grandes (1024 px+) com "pixels falsos".
   O jogo reduz cada imagem para o tamanho real que ela terá na tela (ex.: a torre fica com ~120 px
   de altura, um goblin com ~25 px). Por isso: **peça formas simples e legíveis, poucos detalhes**.
3. **Margens são cortadas.** Não precisa centralizar perfeitamente.
4. Teste sempre com `npm run serve` (http://localhost:8080). Aberto direto pelo arquivo (`file://`)
   o navegador bloqueia a remoção do fundo.

## Ângulo da câmera (importante para tudo combinar)

A câmera olha o campo **inclinada, de frente e de cima (~40° a 50°)** — parecido com jogos de
estratégia 16-bit. Objetos em pé (torre, árvores, personagens) devem ser desenhados em **vista 3/4
frontal**: vemos a frente e um pouco do topo. O chão deve ser desenhado **visto de cima, sem
perspectiva** — o jogo aplica a perspectiva sozinho.

## Dica de consistência

Gere primeiro a **torre**. Nos pedidos seguintes, **anexe a imagem da torre** e acrescente ao prompt:
*"in the exact same pixel art style, palette and lighting as the attached image"*.
A luz vem sempre **da esquerda/de cima** (o placeholder já segue isso).

---

## Fase 1 — Cenário

### 1. `www/assets/tower.png` — Torre (prioridade)

> Ao trocar a torre, ajuste `towerSprite.height`/`halfWidth` em `www/js/config.js` para a proporção
> da imagem nova — eles definem a área escondida atrás da torre (ver [VISIBILIDADE.md](VISIBILIDADE.md)).
```
Pixel art sprite of a medieval stone defense tower, 16-bit SNES style, three-quarter front view
seen slightly from above, full tower visible from base to top: round stone body with visible
bricks, crenellated battlements on top, a small blue flag, wooden door at the base, one lit window.
Light coming from the upper left. Chunky readable pixels, limited palette (about 16 colors),
strong dark outline. Tall vertical composition, centered.
Pure flat magenta background (#FF00FF), no shadow on the background, no ground, no other objects.
```

### 2. `www/assets/ground.png` — Chão (textura que se repete)
```
Seamless tileable pixel art texture of grass ground seen directly from above (top-down, no
perspective), 16-bit SNES style, varied green tones with small tufts, a few tiny flowers and
pebbles, subtle detail, no large objects, no shadows, even lighting.
Square image, must tile seamlessly on all four edges.
```
*As trilhas de terra e o pátio de pedra em volta da torre continuam sendo desenhados pelo jogo por
cima da textura.* Ajuste o tamanho da repetição em `js/sprites.js` → `ground.tileWorld`.

### 3. `www/assets/tree.png` — Árvore
```
Pixel art sprite of a single pine tree, 16-bit SNES style, three-quarter front view, dark green
layered foliage with highlights on the left, brown trunk, strong dark outline, limited palette.
Centered, vertical composition. Pure flat magenta background (#FF00FF), no shadow, no ground.
```

### 4. `www/assets/backdrop.png` — Horizonte (opcional)
```
Wide panoramic pixel art strip of distant hazy blue-green mountains and forest silhouettes,
16-bit SNES style, very low contrast, soft misty atmosphere, horizontal 4:1 aspect ratio,
seamless left-right edges.
```

---

## Fase 2 — Personagens (depois)

> Os personagens também aparecem **ampliados no 📖 Bestiário** (ver [BESTIARIO.md](BESTIARIO.md)) —
> silhueta e rosto bem legíveis valem ainda mais. Os chefões usam `chefe_goblin.png`, `chefe_orc.png`,
> `ogro.png` e `troll_anciao.png`.

Nomes dos arquivos em `www/assets/chars/`:
`barbaro.png`, `arqueiro.png`, `anao.png`, `elfo.png`, `mago.png`,
`goblin.png`, `lobo.png`, `orc.png`, `xama.png`, `troll.png`, `ogro.png`

Regras para todos:
* **Virado para a DIREITA** (o jogo espelha quando anda para a esquerda).
* Corpo inteiro, de pé, vista 3/4 frontal, mesma inclinação da torre.
* Fundo magenta puro, sem sombra, sem chão.
* Silhueta forte: eles aparecem com só **20–40 pixels de altura** no jogo.

Modelo de prompt (troque a descrição):
```
Pixel art character sprite, 16-bit SNES style, [DESCRIÇÃO], full body standing, three-quarter
view facing right, seen slightly from above, chunky readable pixels, strong dark outline, limited
palette, simple bold silhouette that reads well at very small size.
In the exact same pixel art style, palette and lighting as the attached image.
Pure flat magenta background (#FF00FF), no shadow, no ground, single character only.
```

| Arquivo | Descrição sugerida |
|---------|--------------------|
| barbaro | muscular barbarian warrior with red hair, fur vest and a big two-handed axe |
| arqueiro | archer in a green hooded cloak holding a longbow |
| anao | stocky dwarf with long orange braided beard, steel armor and a war hammer |
| elfo | slender elf ranger with long blond hair, teal clothes and an elegant bow |
| mago | wizard in a blue robe and tall purple pointed hat holding a glowing staff |
| goblin | small green goblin with pointy ears, ragged brown clothes and a rusty dagger |
| lobo | grey wolf running, side view, yellow eyes |
| orc | green orc warrior in grey iron armor with a spiked club |
| xama | undead shaman with purple robes, skull face and a staff with a purple flame |
| troll | huge grey-blue troll with a wooden club, hunched posture |
| ogro | giant red ogre chieftain with horns, a crown and a massive club (boss) |

### Animação (opcional, mais avançado)
Para caminhada, peça **4 quadros lado a lado** na mesma imagem e mude `frames: 4` no item
correspondente de `ART` em `www/js/sprites.js`. O Gemini nem sempre mantém os quadros
consistentes — comece com uma imagem estática (o jogo já faz o personagem "balançar" ao andar).

---

## Ajustes finos (em `www/js/config.js` → `view`)

| Parâmetro | Efeito |
|-----------|--------|
| `pixelHeight` | Altura da tela interna. Menor = pixels maiores e mais "retrô" (padrão 320) |
| `farScale` | Quanto o fundo encolhe (0.68). Menor = perspectiva mais forte |
| `tilt` | Achatamento do chão (0.6). Menor = câmera mais deitada |
| `spriteScale` | Tamanho visual dos personagens em relação à área de colisão |
| `top` / `bottom` | Onde ficam a borda do fundo e da frente do mapa na tela |

A altura da torre e da árvore no mundo fica em `ART.tower.height` / `ART.tree.height`
(`www/js/sprites.js`).
