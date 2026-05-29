package com.migiude.app.whisper;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.os.Build;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

final class WhisperModelDownloader {
    interface ProgressCallback {
        void onProgress(int percent);
    }

    private WhisperModelDownloader() {}

    static File modelsDir(Context context) {
        File dir = new File(context.getFilesDir(), "whisper-models");
        if (!dir.exists()) {
            //noinspection ResultOfMethodCallIgnored
            dir.mkdirs();
        }
        return dir;
    }

    static File modelFile(Context context, String filename) {
        return new File(modelsDir(context), filename);
    }

    static boolean isMetered(Context context) {
        ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            android.net.Network network = cm.getActiveNetwork();
            if (network == null) return true;
            NetworkCapabilities caps = cm.getNetworkCapabilities(network);
            if (caps == null) return true;
            return !caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) &&
                !caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET);
        }
        return false;
    }

    static void download(
        Context context,
        String url,
        File dest,
        boolean wifiOnly,
        ProgressCallback progress
    ) throws Exception {
        if (wifiOnly && isMetered(context)) {
            throw new IllegalStateException(
                "Whisper model download is Wi‑Fi only. Connect to Wi‑Fi or turn off that setting."
            );
        }
        if (dest.exists() && dest.length() > 1_000_000) {
            return;
        }

        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setConnectTimeout(30_000);
        conn.setReadTimeout(120_000);
        conn.connect();

        int total = conn.getContentLength();
        File tmp = new File(dest.getAbsolutePath() + ".part");

        try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(tmp)) {
            byte[] buf = new byte[8192];
            int read;
            int done = 0;
            while ((read = in.read(buf)) != -1) {
                out.write(buf, 0, read);
                done += read;
                if (total > 0 && progress != null) {
                    int pct = Math.min(99, (int) ((done * 100L) / total));
                    progress.onProgress(pct);
                }
            }
        } finally {
            conn.disconnect();
        }

        if (!tmp.renameTo(dest)) {
            throw new IllegalStateException("Could not finalize model download.");
        }
        if (progress != null) {
            progress.onProgress(100);
        }
    }
}
