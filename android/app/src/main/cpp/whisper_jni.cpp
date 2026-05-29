#include <android/log.h>
#include <jni.h>
#include <string>
#include <vector>
#include <whisper.h>

#define LOG_TAG "WhisperJNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

extern "C" JNIEXPORT jlong JNICALL
Java_com_migiude_app_whisper_WhisperNative_initContext(
    JNIEnv *env,
    jobject /* thiz */,
    jstring model_path,
    jstring language) {
  const char *path = env->GetStringUTFChars(model_path, nullptr);
  const char *lang = env->GetStringUTFChars(language, nullptr);

  whisper_context_params cparams = whisper_context_default_params();
  whisper_context *ctx = whisper_init_from_file_with_params(path, cparams);

  env->ReleaseStringUTFChars(model_path, path);

  if (ctx == nullptr) {
    env->ReleaseStringUTFChars(language, lang);
    LOGE("whisper_init_from_file failed");
    return 0;
  }

  // Store language on context pointer tag — pass per transcribe call instead.
  env->ReleaseStringUTFChars(language, lang);
  return reinterpret_cast<jlong>(ctx);
}

extern "C" JNIEXPORT void JNICALL
Java_com_migiude_app_whisper_WhisperNative_releaseContext(
    JNIEnv * /* env */,
    jobject /* thiz */,
    jlong ctx_ptr) {
  if (ctx_ptr == 0) return;
  whisper_free(reinterpret_cast<whisper_context *>(ctx_ptr));
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_migiude_app_whisper_WhisperNative_transcribePcm(
    JNIEnv *env,
    jobject /* thiz */,
    jlong ctx_ptr,
    jfloatArray samples,
    jstring language) {
  if (ctx_ptr == 0) {
    return env->NewStringUTF("");
  }

  whisper_context *ctx = reinterpret_cast<whisper_context *>(ctx_ptr);
  jsize len = env->GetArrayLength(samples);
  jfloat *data = env->GetFloatArrayElements(samples, nullptr);
  std::vector<float> pcmf32(data, data + len);
  env->ReleaseFloatArrayElements(samples, data, JNI_ABORT);

  const char *lang = env->GetStringUTFChars(language, nullptr);

  whisper_full_params wparams = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
  wparams.language = lang;
  wparams.translate = false;
  wparams.n_threads = 4;
  wparams.print_progress = false;
  wparams.print_realtime = false;
  wparams.print_timestamps = false;
  wparams.single_segment = true;
  wparams.no_context = true;

  std::string text;
  if (whisper_full(ctx, wparams, pcmf32.data(), (int)pcmf32.size()) == 0) {
    const int n = whisper_full_n_segments(ctx);
    for (int i = 0; i < n; ++i) {
      const char *seg = whisper_full_get_segment_text(ctx, i);
      if (seg != nullptr) text += seg;
    }
  }

  env->ReleaseStringUTFChars(language, lang);
  return env->NewStringUTF(text.c_str());
}
