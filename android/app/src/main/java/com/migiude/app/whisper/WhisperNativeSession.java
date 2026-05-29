package com.migiude.app.whisper;

import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Handler;
import android.os.HandlerThread;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

/** Captures 16 kHz PCM and runs whisper.cpp on ~3s windows. */
final class WhisperNativeSession {
    interface TranscriptCallback {
        void onTranscript(String chunkId, String text);
    }

    private static final int SAMPLE_RATE = 16_000;
    private static final int CHUNK_SAMPLES = SAMPLE_RATE * 3;

    private final long contextPtr;
    private final String languageCode;
    private final TranscriptCallback callback;

    private HandlerThread thread;
    private Handler handler;
    private AudioRecord recorder;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final List<Float> pending = new ArrayList<>();

    WhisperNativeSession(long contextPtr, String languageCode, TranscriptCallback callback) {
        this.contextPtr = contextPtr;
        this.languageCode = languageCode;
        this.callback = callback;
    }

    void start() throws Exception {
        if (running.get()) return;
        int minBuf = AudioRecord.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        );
        if (minBuf == AudioRecord.ERROR || minBuf == AudioRecord.ERROR_BAD_VALUE) {
            throw new IllegalStateException("AudioRecord buffer size unavailable.");
        }

        recorder = new AudioRecord(
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            Math.max(minBuf, CHUNK_SAMPLES * 2)
        );

        if (recorder.getState() != AudioRecord.STATE_INITIALIZED) {
            throw new IllegalStateException("Could not initialize AudioRecord.");
        }

        thread = new HandlerThread("WhisperNativeCapture");
        thread.start();
        handler = new Handler(thread.getLooper());
        running.set(true);
        pending.clear();
        recorder.startRecording();
        handler.post(captureLoop);
    }

    void stop() {
        running.set(false);
        if (recorder != null) {
            try {
                recorder.stop();
            } catch (Exception ignored) {
                /* already stopped */
            }
            recorder.release();
            recorder = null;
        }
        if (thread != null) {
            thread.quitSafely();
            thread = null;
            handler = null;
        }
        flushRemainder();
    }

    private final Runnable captureLoop = new Runnable() {
        @Override
        public void run() {
            if (!running.get() || recorder == null) return;

            short[] buf = new short[1024];
            int read = recorder.read(buf, 0, buf.length);
            if (read > 0) {
                synchronized (pending) {
                    for (int i = 0; i < read; i++) {
                        pending.add(buf[i] / 32768.0f);
                    }
                    while (pending.size() >= CHUNK_SAMPLES) {
                        float[] chunk = new float[CHUNK_SAMPLES];
                        for (int i = 0; i < CHUNK_SAMPLES; i++) {
                            chunk[i] = pending.remove(0);
                        }
                        transcribeChunk(chunk);
                    }
                }
            }

            if (running.get() && handler != null) {
                handler.postDelayed(captureLoop, 40);
            }
        }
    };

    private void flushRemainder() {
        synchronized (pending) {
            if (pending.size() < SAMPLE_RATE / 2) {
                pending.clear();
                return;
            }
            float[] chunk = new float[pending.size()];
            for (int i = 0; i < pending.size(); i++) {
                chunk[i] = pending.get(i);
            }
            pending.clear();
            transcribeChunk(chunk);
        }
    }

    private void transcribeChunk(float[] samples) {
        if (contextPtr == 0) return;
        String text = WhisperNative.transcribePcm(contextPtr, samples, languageCode);
        if (text == null) return;
        text = text.trim();
        if (text.isEmpty()) return;
        String chunkId = "native-" + UUID.randomUUID();
        callback.onTranscript(chunkId, text);
    }
}
