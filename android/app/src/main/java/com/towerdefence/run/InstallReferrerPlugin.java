package com.towerdefence.run;

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Lê o "referrer" da instalação pela Google Play (Play Install Referrer API).
 * O link de convite manda para a loja com &referrer=ref%3DCODIGO; aqui o jogo recebe "ref=CODIGO".
 * Usado por www/js/invite.js (captureFromInstall). Ver docs/INDICACAO.md.
 */
@CapacitorPlugin(name = "InstallReferrer")
public class InstallReferrerPlugin extends Plugin {

    @PluginMethod
    public void get(final PluginCall call) {
        final InstallReferrerClient client = InstallReferrerClient.newBuilder(getContext()).build();
        try {
            client.startConnection(new InstallReferrerStateListener() {
                private boolean done = false;

                @Override
                public void onInstallReferrerSetupFinished(int responseCode) {
                    if (done) return;
                    done = true;
                    try {
                        if (responseCode == InstallReferrerClient.InstallReferrerResponse.OK) {
                            ReferrerDetails details = client.getInstallReferrer();
                            JSObject ret = new JSObject();
                            ret.put("referrer", details.getInstallReferrer());
                            call.resolve(ret);
                        } else if (responseCode == InstallReferrerClient.InstallReferrerResponse.FEATURE_NOT_SUPPORTED) {
                            // aparelho sem Play Store: não adianta tentar de novo
                            JSObject ret = new JSObject();
                            ret.put("referrer", "");
                            call.resolve(ret);
                        } else {
                            call.reject("Install referrer indisponível (código " + responseCode + ")");
                        }
                    } catch (Exception e) {
                        call.reject("Falha ao ler o install referrer: " + e.getMessage());
                    } finally {
                        client.endConnection();
                    }
                }

                @Override
                public void onInstallReferrerServiceDisconnected() {
                    if (done) return;
                    done = true;
                    call.reject("Serviço da Play Store desconectado");
                }
            });
        } catch (Exception e) {
            call.reject("Falha ao conectar à Play Store: " + e.getMessage());
        }
    }
}
