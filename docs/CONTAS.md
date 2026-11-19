# Contas, nuvem e dados dos jogadores (Firebase)

## Como funciona

| Situação | Registro do jogador | Progresso |
|----------|---------------------|-----------|
| Abriu o jogo sem login ("Convidado") | Sim: conta anônima + dados do aparelho | Só no aparelho |
| Entrou com **Google** | Sim: + nome, e-mail, foto | Nuvem + aparelho |
| Criou **nome de usuário + senha** | Sim: + nome de usuário | Nuvem + aparelho |
| Sem internet / Firebase não configurado | Não | Só no aparelho (o jogo funciona normalmente) |

* Um convidado que faz login **mantém o mesmo registro**: a conta anônima é convertida, não duplicada.
* Ao entrar em um aparelho novo, o jogo compara o progresso da nuvem com o do aparelho e fica com o
  **mais avançado** (nível liberado → evoluções → Florins).
* Nome de usuário: 3 a 16 caracteres, letras minúsculas, números ou `_`. Cada nome só pode ter um dono.
  Internamente vira um e-mail fictício (`nome@jogadores.defensores-da-torre.app`) só para o
  Firebase guardar a senha com segurança; nenhuma mensagem é enviada a ele.
* **Não existe "esqueci a senha"** para nome de usuário (não há e-mail real). Quem quiser recuperação
  deve usar o login Google.

### Dados registrados em `users/{uid}`

```
createdAt, lastSeen, sessions, isGuest, provider (convidado | google | usuario)
username            (login por nome)
email, displayName, photoURL   (login Google)
device: {
  appVersion, model, os, osVersion, browser, mobile, userAgent,
  language, languages, timezone,
  screen {width, height, pixelRatio}, viewport {width, height},
  cpuCores, memoryGB, touchPoints, connection {type, saveData}, installedApp
}
```
Tudo isso é obtido pelo navegador **sem pedir permissão**. O modelo do aparelho vem da API
`userAgentData` do Chrome (no Android aparece, por exemplo, `SM-A546E`).
Você vê e exporta tudo em **Firebase Console → Firestore Database**.

## Passo a passo (uma vez só)

1. **Criar o projeto:** https://console.firebase.google.com → *Adicionar projeto* → nome
   `defensores-da-torre` (o Google Analytics pode ficar desativado).
2. **Ativar os logins:** *Build → Authentication → Começar → Método de login* e ative:
   * **Anônimo**
   * **E-mail/senha**
   * **Google** (escolha o e-mail de suporte)
3. **Autorizar o site:** *Authentication → Configurações → Domínios autorizados → Adicionar domínio*:
   `gersonhid.github.io`
4. **Criar o banco:** *Build → Firestore Database → Criar banco de dados* → modo de produção →
   região `southamerica-east1 (São Paulo)`.
5. **Regras de segurança:** *Firestore → Regras* → apague o conteúdo, cole o arquivo
   [`firestore.rules`](../firestore.rules) e clique em **Publicar**.
6. **Registrar o app web:** *Configurações do projeto (⚙) → Seus apps → `</>` Web* → apelido
   `jogo` (não precisa de Hosting) → copie o objeto `firebaseConfig`.
7. Cole em [`www/js/firebase-config.js`](../www/js/firebase-config.js):
   ```js
   window.TD_FIREBASE_CONFIG = {
     apiKey: "...",
     authDomain: "defensores-da-torre.firebaseapp.com",
     projectId: "defensores-da-torre",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
   Esses valores **podem** ficar no repositório público: eles só identificam o projeto. Quem protege
   os dados são as regras do passo 5.
8. Publique (commit + push). Em ~30 s o login aparece no jogo.

## Custos

O plano gratuito (Spark) do Firebase cobre com folga um jogo pequeno: 50 mil leituras e 20 mil
gravações por dia no Firestore, e login ilimitado para Google/senha/anônimo. Cada partida grava o
progresso uma vez; abrir o jogo faz ~3 leituras e 1 gravação.

## Antes de publicar na Google Play

* Complete os campos `[...]` em [`www/privacidade.html`](../www/privacidade.html) (responsável,
  e-mail de contato, prazo de guarda, público-alvo) e informe o endereço
  `https://gersonhid.github.io/defensores-da-torre/privacidade.html` na Play Console.
* Preencha o formulário **Segurança dos dados** da Play Console de acordo com a tabela acima
  (dados de aparelho, identificadores, nome/e-mail opcionais; sem venda; sem anúncios).
* Se o público incluir **menores de 13 anos**, a coleta exige cuidados extras (Família da Google Play
  / LGPD art. 14). Avise para ajustarmos a coleta.

## Limitação conhecida

O progresso é calculado no aparelho e enviado como está, então um jogador com conhecimento técnico
consegue editar o próprio save. Para um jogo sem ranking nem compras isso não causa problema; se
houver ranking ou loja no futuro, a validação precisa ir para o servidor (Cloud Functions).
