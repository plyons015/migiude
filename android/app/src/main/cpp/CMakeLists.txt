cmake_minimum_required(VERSION 3.22.1)
project(migiude_whisper_jni)

set(CMAKE_CXX_STANDARD 17)

# Android 15+ devices may use 16 KB memory pages — align all native LOAD segments.
if(ANDROID)
  set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -Wl,-z,max-page-size=16384")
  set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -Wl,-z,max-page-size=16384")
  set(CMAKE_MODULE_LINKER_FLAGS "${CMAKE_MODULE_LINKER_FLAGS} -Wl,-z,max-page-size=16384")
endif()

include(FetchContent)
FetchContent_Declare(
    whisper
    GIT_REPOSITORY https://github.com/ggml-org/whisper.cpp.git
    GIT_TAG        v1.7.4
    GIT_SHALLOW    TRUE
)
set(WHISPER_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(whisper)

add_library(whisper_jni SHARED whisper_jni.cpp)
target_include_directories(whisper_jni PRIVATE ${whisper_SOURCE_DIR})
target_link_libraries(whisper_jni whisper android log)

if(ANDROID)
  target_link_options(whisper_jni PRIVATE "-Wl,-z,max-page-size=16384")
  # Propagate 16 KB alignment to static deps (whisper / ggml).
  if(TARGET whisper)
    target_link_options(whisper PRIVATE "-Wl,-z,max-page-size=16384")
  endif()
  if(TARGET ggml)
    target_link_options(ggml PRIVATE "-Wl,-z,max-page-size=16384")
  endif()
endif()
