# Android 16 KB page size

Newer Android devices (and Play requirements) expect native `.so` libraries to support **16 KB memory pages**. A debug build may show:

> This app isn't 16 KB compatible. ELF alignment check failed.

## What we did

| Area | Change |
|------|--------|
| `android/gradle.properties` | `android.experimental.enable16kPages=true` |
| `android/app/build.gradle` | `-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON` for CMake |
| `android/app/src/main/cpp/CMakeLists.txt` | `-Wl,-z,max-page-size=16384` on JNI + whisper/ggml; `GGML_OPENMP=OFF` (drops `libomp.so`) |

## After pulling

```powershell
cd android
.\gradlew.bat clean
cd ..
npm run cap:sync
cd android
.\gradlew.bat assembleDebug
```

Reinstall the APK on the device. The compatibility dialog should clear for `libwhisper_jni.so`.

If other libraries still warn (`libc++_shared.so`, Firebase datastore), update **Android NDK** in SDK Manager to the latest **r28+** and rebuild.
