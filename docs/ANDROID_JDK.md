# Android build — Java 21 + Gradle 8.11.1

Capacitor 8 / Android Gradle Plugin 8.10.x need **Gradle 8.11.1+** and **JDK 21**.

## Gradle “Minimum supported Gradle version is 8.11.1. Current version is 8.9”

The repo wrapper is already set in `android/gradle/wrapper/gradle-wrapper.properties`:

```properties
distributionUrl=.../gradle-8.11.1-all.zip
```

If Android Studio or the Java extension still reports **8.9**:

1. **Use the wrapper** — Android Studio → **Settings** → **Build, Execution, Deployment** → **Build Tools** → **Gradle** → **Gradle JDK**: JDK 21 → **Use Gradle from**: **Gradle wrapper** (not a fixed “Gradle 8.9” install).
2. **Cursor / VS Code** — User Settings → search `java.import.gradle.home` → **clear** it if set (a global Gradle 8.9 overrides the wrapper). Workspace settings in `.vscode/settings.json` and `android/.vscode/settings.json` already prefer **8.11.1** + wrapper. Then **Command Palette** → `Java: Clean Java Language Server Workspace` → Reload Window.
3. **Sync** — **File** → **Sync Project with Gradle Files** (elephant icon).
4. **Terminal check** (from `android/`):

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
cd android
.\gradlew.bat --version
```

You should see `Gradle 8.11.1`.

5. **“Not on classpath” Java warnings** in VS Code/Cursor usually clear after a successful Gradle sync (they are IDE noise until the project configures).

---

## Java 21 required

Capacitor 8 compiles Android code with **Java 21**. If your terminal uses **JDK 17**, Gradle fails with:

```text
error: invalid source release: 21
```

## Check versions

```powershell
node -v    # need v22.x (npm / Capacitor CLI)
java -version   # need 21.x for Gradle
```

## Fix on Windows

### Option A — Temurin 21 (recommended on Windows)

If you already have Adoptium 21 installed:

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
java -version
```

Should show `openjdk version "21.x"`. Then:

```powershell
npm run cap:run:android
```

To make it permanent (PowerShell profile or System Environment Variables), set **JAVA_HOME** to that folder (not JDK 17).

Install if missing:

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
```

Then use the folder under `C:\Program Files\Eclipse Adoptium\jdk-21.*-hotspot`.

### Option B — Android Studio’s Gradle JDK

Do **not** use `C:\Program Files\Android\Android Studio\jbr` if you see `could not open jvm.cfg` — that folder may be incomplete on some installs.

Instead: Android Studio → **File → Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK** — pick **jbr-21** or **Temurin 21**, copy that path into `JAVA_HOME` for terminal builds.

### Option C — Build only from Android Studio

Open `android/` in Studio, **File → Sync Project with Gradle Files**, then **Run** ▶. Studio uses its own JDK 21 and ignores terminal `JAVA_HOME`.

## Retry

```powershell
cd c:\Users\plyon\Documents\chapappteams\Ude-1
npm run cap:run:android
```

The `google-services.json missing` line during configure is a **warning** (FCM off) — not the build failure.
