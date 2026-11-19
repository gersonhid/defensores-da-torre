# App Android (Capacitor + AdMob) — compilar, testar e publicar

O projeto Android **já está pronto** na pasta `android/`:

* Capacitor 8 + plugin **AdMob** (`@capacitor-community/admob` 8.4.2) + plugin App (botão voltar)
* ID do app AdMob no `AndroidManifest.xml`; IDs dos blocos em `www/js/ads-config.js`
* Tela **travada na horizontal** e **tela cheia** (sem barras do sistema)
* Ícone e tela de abertura com a torre do jogo
* Dentro do app o jogo usa **AdMob automaticamente** (no site continua o anúncio simulado)
* Anúncios em **modo de teste** (`test: true`) — aparecem com a etiqueta "Test Ad"
* Pacote: `com.towerdefence.run` — ⚠️ **não pode ser mudado depois de publicar na Play Store**

---

## 1. Instalar o Android Studio (uma vez)

1. Baixe em **https://developer.android.com/studio** e instale com as opções padrão.
2. Na primeira abertura, deixe ele baixar o **Android SDK** (assistente "Standard").
3. O Android Studio já traz o Java certo — **não precisa** mexer no Java 8 instalado.
4. Se existir uma versão antiga do Android Studio (ex.: em `D:Program FilesAndroidAndroid Studio`, versão 4.2
   de 2021), **desinstale** para não abrir a errada por engano.

## 2. Abrir o projeto

No terminal, na pasta `D:\ai\tower`:

```bash
npm run android:open
```

Ou no Android Studio: **File → Open** → escolha a pasta **`D:\ai\tower\android`**.

Na primeira vez ele faz o **"Gradle Sync"** (baixa bibliotecas; pode levar alguns minutos).
Espere a barra de progresso no rodapé terminar.

> O projeto usa **Gradle 9.1**, compatível com o Java 25 que vem no Android Studio atual.
> Se o Android Studio sugerir **"Upgrade Android Gradle Plugin"** (AGP 9), **recuse por enquanto**:
> os plugins do Capacitor/AdMob ainda são feitos para o AGP 8.
> Se aparecer erro de "Gradle JDK": **File → Settings → Build, Execution, Deployment → Build Tools →
> Gradle → Gradle JDK** → escolha **"jbr"** (o Java do próprio Android Studio).

## 3. Rodar no seu celular

1. No celular: **Configurações → Sobre o telefone** → toque **7 vezes** em "Número da versão"
   (ativa as Opções do desenvolvedor).
2. **Configurações → Sistema → Opções do desenvolvedor** → ative **"Depuração USB"**.
3. Ligue o celular no PC pelo cabo USB e aceite o aviso "Permitir depuração USB".
4. No Android Studio, escolha o celular na lista do topo e clique em **▶ Run**.

O jogo abre no celular já instalado.

### O que testar
- [ ] Abre na horizontal, em tela cheia, com o ícone da torre
- [ ] Botão **voltar** do Android pausa a partida / volta de tela
- [ ] Deixe a torre cair → **"📺 Assistir e reviver"** → aparece um vídeo **"Test Ad"** do Google
- [ ] Assistir até o fim → torre revive. Fechar antes do fim → **não** revive (e o jogo não trava)
- [ ] Tela de resultado → **"📺 Dobrar Florins"** → mesmo comportamento
- [ ] Conta: criar nome de usuário, sair, entrar de novo → progresso volta

> Se o anúncio não aparecer na primeira vez, espere alguns segundos e tente de novo — o primeiro
> carregamento do AdMob pode demorar. Para ver erros, use **Logcat** no Android Studio (aba inferior)
> e filtre por `anúncios` ou `Ads`.

### Alternativa: instalar o APK sem o cabo
Depois de compilar, o arquivo fica em `android/app/build/outputs/apk/debug/app-debug.apk`.
Copie para o celular (Drive, WhatsApp para você mesmo, cabo) e abra — o Android pede para permitir
"instalar apps desta fonte". É uma versão de **teste** (não serve para a loja).

### Depois de mudar algo no jogo (pasta `www/`)
```bash
npm run android:sync
```
e clique em ▶ Run de novo.

## 4. Gerar o arquivo para a Google Play (AAB assinado)

1. Antes: em `www/js/ads-config.js` mude **`test: true` → `test: false`** (anúncios reais) e rode
   `npm run android:sync`. ⚠️ A partir daqui **nunca clique nos anúncios** do seu próprio app.
2. Em `android/app/build.gradle`, a cada nova versão enviada à loja aumente `versionCode`
   (1, 2, 3...) e ajuste `versionName` ("1.0", "1.1"...).
3. Android Studio: **Build → Generate Signed App Bundle / APK** → **Android App Bundle** → Next.
4. **Key store path → Create new...**
   * Salve o arquivo **fora** da pasta do projeto (ex.: `D:\chaves\defensores.jks`).
   * Crie senhas fortes e **guarde tudo** (arquivo + senhas) num lugar seguro e com backup.
   * ⚠️ **Se perder essa chave, não dá mais para atualizar o app na loja.**
     (A Play Store oferece "Assinatura de apps do Google Play", que reduz esse risco — aceite quando ela oferecer.)
5. Escolha **release** → **Create**. O arquivo sai em `android/app/release/app-release.aab`.

> O `.gitignore` já impede que arquivos `.jks`/`.keystore` sejam enviados ao GitHub.

## 5. Publicar na Google Play (resumo)

1. Conta de desenvolvedor: **https://play.google.com/console** (taxa única de US$ 25).
2. **Criar app** → nome "Defensores da Torre", idioma pt-BR, **Jogo**, **Gratuito**.
3. Preencher:
   * **Site do desenvolvedor:** `https://gersonhid.github.io` (onde está o `app-ads.txt`)
   * **Política de privacidade:** `https://gersonhid.github.io/defensores-da-torre/privacidade.html`
     (antes, complete os campos `[...]` dessa página)
   * **Contém anúncios:** Sim
   * **Segurança dos dados:** ver `docs/CONTAS.md` e `docs/PROPAGANDAS.md`
   * **Público-alvo:** definir faixa etária (se incluir crianças, avise antes — muda a configuração dos anúncios)
4. Comece por **Teste interno** (você e alguns e-mails) → envie o `.aab` → teste → depois **Produção**.
5. No **AdMob**: Apps → seu app → **vincular à Google Play** depois que ele estiver publicado.
   O `app-ads.txt` é verificado automaticamente (pode levar alguns dias).

## 6. Dicas e problemas comuns

| Situação | O que fazer |
|----------|-------------|
| Anúncio não aparece no teste | Normal nos primeiros minutos; confira internet e Logcat |
| "No fill" / sem anúncio com `test: false` antes de publicar | Normal: anúncios reais só aparecem bem depois do app publicado e vinculado |
| Quer testar anúncios reais com segurança | AdMob → Configurações → **Dispositivos de teste** → adicione seu celular |
| Mudou a pasta `www/` e o app não mudou | Faltou `npm run android:sync` |
| "Unsupported class file major version 69" | Gradle antigo com Java 25 — o projeto já usa Gradle 9.1; faça **File → Sync Project with Gradle Files** |
| "SDK location not found" | **File → Project Structure → SDK Location** → apontar para `C:Users<você>AppDataLocalAndroidSdk` |
| Formulário de consentimento (LGPD/Europa) | Configure em AdMob → **Privacidade e mensagens**; o app já chama o formulário quando exigido |
