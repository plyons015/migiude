package com.migiude.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;

/**
 * Keeps the app alive with a visible notification while Listen / meeting capture runs.
 * startForeground() MUST run in onCreate() — Android kills the app if startForegroundService()
 * is not followed by startForeground() within a few seconds.
 */
public class RecordingForegroundService extends Service {
    private static final String TAG = "RecordingFGService";
    public static final String CHANNEL_ID = "migiude_recording";
    public static final int NOTIFICATION_ID = 41001;
    public static final String ACTION_STOP = "com.migiude.app.STOP_RECORDING_FG";

    private boolean inForeground = false;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "onCreate");
        createChannel();
        if (!promoteToForegroundOrStop()) {
            Log.e(TAG, "startForeground failed in onCreate — stopping");
            stopSelf();
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "onStartCommand action: " + (intent != null ? intent.getAction() : "null"));

        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            Log.d(TAG, "Stopping service via ACTION_STOP");
            exitForeground();
            stopSelf();
            return START_NOT_STICKY;
        }

        if (!hasRecordAudioPermission()) {
            Log.e(TAG, "RECORD_AUDIO missing after service start");
            exitForeground();
            stopSelf();
            return START_NOT_STICKY;
        }

        if (!inForeground) {
            promoteToForegroundOrStop();
        }

        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private boolean hasRecordAudioPermission() {
        return (
            ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
        );
    }

    private boolean promoteToForegroundOrStop() {
        if (inForeground) {
            return true;
        }

        if (!hasRecordAudioPermission()) {
            Log.e(TAG, "Cannot promote to foreground without RECORD_AUDIO");
            return false;
        }

        Notification notification = buildNotification();
        int serviceType =
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE
                ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                : 0;

        try {
            Log.d(TAG, "ServiceCompat.startForeground type=" + serviceType);
            ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, serviceType);
            inForeground = true;
            RecordingAudioSession.begin(this);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "startForeground failed", e);
            return false;
        }
    }

    private void exitForeground() {
        if (!inForeground) return;
        RecordingAudioSession.end();
        try {
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        } catch (Exception e) {
            Log.e(TAG, "stopForeground failed", e);
        }
        inForeground = false;
    }

    private Notification buildNotification() {
        Intent launch = new Intent(this, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(
            this,
            0,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Ude is listening")
            .setContentText("Mic active — other apps' audio is paused. Return here to stop.")
            .setSmallIcon(R.drawable.ic_stat_recording)
            .setContentIntent(pending)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel =
            new NotificationChannel(
                CHANNEL_ID,
                "Recording",
                NotificationManager.IMPORTANCE_LOW
            );
        channel.setDescription("Shown while voice capture is active");
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.createNotificationChannel(channel);
    }
}
