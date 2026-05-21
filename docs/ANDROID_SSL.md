# Fix Gradle SSL (PKIX) on Windows

Errors like:

- `unable to find valid certification path to requested target`
- `PKIX path building failed`

mean **Java (Gradle) does not trust the HTTPS certificate** it sees. Browsers/Windows may work fine.

## Avast (common on this project)

If certificate issuer shows **Avast Web/Mail Shield**, Avast is decrypting HTTPS. Java does not trust Avast’s root until you import it.

**Option 1 — Disable SSL scanning (quickest)**  
Avast → **Menu → Settings → Privacy → Web Shield** → turn off **HTTPS scanning** / **SSL scanning** → reboot PC → Gradle sync again.

**Option 2 — Import Avast cert into Android Studio’s JDK (keeps Avast on)**  
Run **PowerShell as Administrator** from the project folder:

```powershell
cd c:\Users\plyon\Documents\chapappteams\migiude-1
.\scripts\fix-java-ssl.ps1
```

Then **Invalidate Caches / Restart** in Android Studio and sync Gradle.

`Windows-ROOT` does **not** work on Android Studio’s JDK (`Windows-ROOT not found`).

---

## Other causes

Corporate proxy or other antivirus — same PKIX symptom. Use Option 2 with your vendor’s root CA, or a network without inspection.

## Option A — Import your company root certificate (recommended)

1. Get your organization’s **root CA** file (e.g. `company-root.crt`) from IT, or export it from browser/certmgr.
2. Find the JDK Android Studio uses for Gradle:
   - **Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK**
   - Click the path (often under `Android Studio\jbr`).
3. In PowerShell (replace paths):

```powershell
$jdk = "C:\Program Files\Android\Android Studio\jbr"
$cert = "C:\path\to\company-root.crt"
& "$jdk\bin\keytool.exe" -importcert -noprompt -alias company-root -file $cert -keystore "$jdk\lib\security\cacerts" -storepass changeit
```

4. **File → Invalidate Caches → Restart** → **Sync Project with Gradle Files**.

## Option B — Use a non-corporate network

Phone hotspot or home Wi‑Fi often avoids SSL inspection so Gradle can download without extra certs.

## Option C — Pre-download Gradle (if only wrapper URL fails)

If sync fails only on `services.gradle.org`, download `gradle-8.14.3-all.zip` from another network, place it in:

`%USERPROFILE%\.gradle\wrapper\dists\gradle-8.14.3-all\<hash>\`

Then sync again. **Maven/Google deps may still need Option A or B.**

## Verify

After fixing, **Build** tab should show Gradle sync success, then Run ▶ works.
