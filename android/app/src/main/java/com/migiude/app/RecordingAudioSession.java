package com.migiude.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.util.Log;

/**
 * Pauses/ducks other apps' playback and sets voice-communication mode while Ude
 * captures speech. Does not grant true OS-level mic exclusivity against every app,
 * but stops most music/video from playing into the microphone.
 */
public final class RecordingAudioSession {
    private static final String TAG = "RecordingAudioSession";

    private static AudioManager audioManager;
    private static AudioFocusRequest focusRequest;
    private static AudioManager.OnAudioFocusChangeListener focusListener;
    private static boolean active = false;
    private static boolean focusGranted = false;
    private static int previousMode = AudioManager.MODE_NORMAL;
    private static boolean previousSpeakerphone = false;

    private RecordingAudioSession() {}

    public static boolean begin(Context context) {
        if (active) {
            return focusGranted;
        }

        audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        if (audioManager == null) {
            Log.w(TAG, "AudioManager unavailable");
            return false;
        }

        previousMode = audioManager.getMode();
        previousSpeakerphone = audioManager.isSpeakerphoneOn();

        focusListener =
            focusChange -> {
                switch (focusChange) {
                    case AudioManager.AUDIOFOCUS_GAIN:
                        focusGranted = true;
                        break;
                    case AudioManager.AUDIOFOCUS_LOSS:
                    case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                    case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                        focusGranted = false;
                        Log.w(TAG, "Audio focus lost: " + focusChange);
                        break;
                    default:
                        break;
                }
            };

        int result;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes attrs =
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build();

            focusRequest =
                new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(attrs)
                    .setAcceptsDelayedFocusGain(false)
                    .setWillPauseWhenDucked(true)
                    .setOnAudioFocusChangeListener(focusListener)
                    .build();

            result = audioManager.requestAudioFocus(focusRequest);
        } else {
            result =
                audioManager.requestAudioFocus(
                    focusListener,
                    AudioManager.STREAM_VOICE_CALL,
                    AudioManager.AUDIOFOCUS_GAIN
                );
        }

        focusGranted =
            result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        if (!focusGranted) {
            Log.w(TAG, "Audio focus not granted, result=" + result);
        }

        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
        // Prefer earpiece/headset routing to reduce speaker→mic bleed from other apps.
        if (previousSpeakerphone) {
            audioManager.setSpeakerphoneOn(false);
        }

        active = true;
        return focusGranted;
    }

    public static void end() {
        if (!active) return;

        if (audioManager != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && focusRequest != null) {
                audioManager.abandonAudioFocusRequest(focusRequest);
            } else if (focusListener != null) {
                audioManager.abandonAudioFocus(focusListener);
            }

            audioManager.setMode(previousMode);
            audioManager.setSpeakerphoneOn(previousSpeakerphone);
        }

        focusRequest = null;
        focusListener = null;
        audioManager = null;
        active = false;
        focusGranted = false;
    }

    public static boolean isFocusGranted() {
        return focusGranted;
    }
}
