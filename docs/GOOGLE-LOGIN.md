# Como criar o "ID do cliente" do Google (login com Google)

O **ID do cliente** é o que permite ao botão **"Entrar com Google"** funcionar no jogo.
É gratuito e leva uns 10 minutos. Use a conta Google que você quer que apareça como "dona" do app.

---

## Passo 1 — Criar um projeto no Google Cloud

1. Acesse **https://console.cloud.google.com** (aceite os termos se for o primeiro acesso).
2. No topo da página, clique no **seletor de projetos** → **"Novo projeto"**.
3. Nome: `Defensores da Torre` → **Criar**.
4. Confirme que esse projeto ficou **selecionado** no topo da página.

---

## Passo 2 — Configurar a tela de login (o que o jogador vê ao entrar)

1. No menu **☰** → **"APIs e serviços"** → **"Tela de permissão OAuth"**.
   (Em versões novas do console o nome é **"Google Auth Platform"**.)
2. Clique em **"Começar"** e preencha:

   | Campo | O que colocar |
   |-------|---------------|
   | Nome do app | `Defensores da Torre` |
   | E-mail de suporte do usuário | seu e-mail |
   | Público | **Externo** |
   | Dados de contato | seu e-mail |

3. Aceite a política → **Criar**.
4. Vá em **"Público"** (ou "Audience") → clique em **"Publicar app"** → confirme.

   > **Importante:** sem publicar, só e-mails cadastrados como "testadores" conseguem entrar.
   > Como o jogo só pede nome, e-mail e foto, o Google **não** exige verificação.

5. *(Opcional)* Em **"Branding"**, no campo de política de privacidade, coloque:
   `https://gersonhid.github.io/defensores-da-torre/privacidade.html`

---

## Passo 3 — Criar o ID do cliente

1. Vá em **"Clientes"**
   (ou **"Credenciais"** → **"Criar credenciais"** → **"ID do cliente OAuth"**).
2. **Tipo de aplicativo:** **Aplicativo da Web**
3. **Nome:** `jogo`
4. Em **"Origens JavaScript autorizadas"**, clique em **"Adicionar URI"** e adicione estes **3** endereços (um de cada vez):

   ```
   https://gersonhid.github.io
   http://localhost
   http://localhost:8080
   ```

   (os dois `localhost` servem só para testar no computador)

5. **"URIs de redirecionamento autorizados"**: deixe **vazio**.
6. Clique em **Criar**.

---

## Passo 4 — Copiar e me enviar

Vai aparecer uma janela com o **ID do cliente**, parecido com:

```
123456789012-abc123def456ghi789.apps.googleusercontent.com
```

✅ **Copie esse ID e me envie no chat.** Ele **não é segredo**: fica visível no site do jogo.

⛔ A mesma janela mostra também uma **"Chave secreta do cliente"** (client secret).
**Não envie e não coloque em lugar nenhum** — o jogo não precisa dela.

---

## O que acontece depois

1. Eu coloco o ID no servidor (Railway) e no jogo, e publico os dois.
2. No celular: abra o jogo → **👤 Convidado** → **"Entrar com Google"** → escolha a conta.
3. A partir daí o progresso fica salvo na sua conta Google e volta em qualquer aparelho.

---

## Problemas comuns

| Mensagem / situação | Solução |
|---------------------|---------|
| "Acesso bloqueado: app não verificado" / só alguns e-mails conseguem entrar | Faltou **"Publicar app"** (Passo 2, item 4) |
| "origin_mismatch" ou "não autorizado para esta origem" | Confira as **Origens JavaScript** do Passo 3 (sem barra `/` no final) |
| O botão do Google não aparece no jogo | Ainda não configurei o ID — me envie o ID do cliente |
| Mudanças não fazem efeito | O Google pode levar **até 5 minutos** para aplicar alterações de origem |
