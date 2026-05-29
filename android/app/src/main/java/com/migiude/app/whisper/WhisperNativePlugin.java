package com.migiude.app.whisper;

import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "WhisperNative")
public class WhisperNativePlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private long contextPtr = 0;
    private WhisperNativeSession session;
    private String loadedKey = "";

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        if (!WhisperNative.isLibraryLoaded()) {
            ret.put("available", false);
            ret.put("reason", "Native Whisper library not built for this ABI.");
            call.resolve(ret);
            return;
        }
        if (!hasArm64()) {
            ret.put("available", false);
            ret.put("reason", "Native Whisper requires arm64-v8a (use WASM on emulators).");
            call.resolve(ret);
            return;
        }
        ret.put("available", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void loadModel(PluginCall call) {
        String modelSize = call.getString("modelSize", "tiny");
        String speechLang = call.getString("speechLang", "en-US");
        boolean wifiOnly = Boolean.TRUE.equals(call.getBoolean("wifiOnly", false));
        String filename = ggmlFilename(modelSize, speechLang);
        String url = call.getString("modelUrl");
        String languageCode = languageCode(speechLang);
        String key = modelSize + ":" + speechLang;

        if (contextPtr != 0 && key.equals(loadedKey)) {
            call.resolve();
            return;
        }

        releaseContext();

        executor.execute(() -> {
            try {
                File dest = WhisperModelDownloader.modelFile(getContext(), filename);
                WhisperModelDownloader.download(
                    getContext(),
                    url,
                    dest,
                    wifiOnly,
                    percent -> {
                        JSObject payload = new JSObject();
                        payload.put("progress", percent);
                        payload.put("file", filename);
                        notifyListeners("loadProgress", payload);
                    }
                );

                long ptr = WhisperNative.initContext(dest.getAbsolutePath(), languageCode);
                if (ptr == 0) {
                    call.reject("Could not load Whisper model.");
                    return;
                }
                contextPtr = ptr;
                loadedKey = key;
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage(), e);
            }
        });
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (contextPtr == 0) {
            call.reject("Whisper model not loaded.");
            return;
        }
        String speechLang = call.getString("speechLang", "en-US");
        String languageCode = languageCode(speechLang);

        try {
            if (session != null) {
                session.stop();
            }
            session = new WhisperNativeSession(
                contextPtr,
                languageCode,
                (chunkId, text) -> {
                    JSObject payload = new JSObject();
                    payload.put("chunkId", chunkId);
                    payload.put("text", text);
                    notifyListeners("transcript", payload);
                }
            );
            session.start();
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (session != null) {
            session.stop();
            session = null;
        }
        call.resolve();
    }

    @PluginMethod
    public void release(PluginCall call) {
        if (session != null) {
            session.stop();
            session = null;
        }
        releaseContext();
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (session != null) {
            session.stop();
            session = null;
        }
        releaseContext();
        executor.shutdown();
        super.handleOnDestroy();
    }

    private void releaseContext() {
        if (contextPtr != 0) {
            WhisperNative.releaseContext(contextPtr);
            contextPtr = 0;
            loadedKey = "";
        }
    }

    private static boolean hasArm64() {
        if (Build.SUPPORTED_ABIS == null) return false;
        for (String abi : Build.SUPPORTED_ABIS) {
            if ("arm64-v8a".equals(abi)) return true;
        }
        return false;
    }

    private static String languageCode(String speechLang) {
        if (speechLang == null || speechLang.isEmpty()) return "en";
        int dash = speechLang.indexOf('-');
        if (dash > 0) return speechLang.substring(0, dash).toLowerCase(Locale.ROOT);
        return speechLang.toLowerCase(Locale.ROOT);
    }

    private static String ggmlFilename(String modelSize, String speechLang) {
        boolean en = languageCode(speechLang).equals("en");
        if ("base".equals(modelSize)) {
            return en ? "ggml-base.en.bin" : "ggml-base.bin";
        }
        return en ? "ggml-tiny.en.bin" : "ggml-tiny.bin";
    }
}
