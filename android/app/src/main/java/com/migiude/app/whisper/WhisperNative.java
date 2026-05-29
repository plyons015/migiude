package com.migiude.app.whisper;

/** JNI bridge to whisper.cpp (arm64). */
final class WhisperNative {
    private static boolean libraryLoaded = false;

    static {
        try {
            System.loadLibrary("whisper_jni");
            libraryLoaded = true;
        } catch (UnsatisfiedLinkError ignored) {
            libraryLoaded = false;
        }
    }

    private WhisperNative() {}

    static boolean isLibraryLoaded() {
        return libraryLoaded;
    }

    static native long initContext(String modelPath, String languageCode);

    static native void releaseContext(long contextPtr);

    static native String transcribePcm(long contextPtr, float[] samples, String languageCode);
}
