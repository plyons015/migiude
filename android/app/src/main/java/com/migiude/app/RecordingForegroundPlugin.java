package com.migiude.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;
import androidx.core.content.ContextCompat;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "RecordingForeground",
    permissions = {
        @Permission(
            alias = "microphone",
            strings = { Manifest.permission.RECORD_AUDIO }
        )
    }
)
public class RecordingForegroundPlugin extends Plugin {
    private static final String TAG = "RecordingForeground";

    @PluginMethod
    public void ensureMicPermission(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            call.resolve();
            return;
        }
        requestPermissionForAlias("microphone", call, "micPermissionCallback");
    }

    @PermissionCallback
    private void micPermissionCallback(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            call.resolve();
        } else {
            call.reject(
                "Microphone permission denied. Open Settings → Apps → Migiude → Permissions."
            );
        }
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (
            ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            call.reject("RECORD_AUDIO permission not granted");
            return;
        }

        Intent intent = new Intent(getContext(), RecordingForegroundService.class);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "startForegroundService failed", e);
            call.reject("Could not start recording notification: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), RecordingForegroundService.class);
        intent.setAction(RecordingForegroundService.ACTION_STOP);
        try {
            getContext().startService(intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "stop service failed", e);
            call.resolve();
        }
    }
}
