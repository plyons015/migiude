# Fixes Gradle PKIX errors when Windows trusts HTTPS but Java does not
# (common with antivirus / SSL inspection). Run in PowerShell as your user.

param(
  [string]$HostName = "dl.google.com",
  [string]$JbrPath = "C:\Program Files\Android\Android Studio\jbr"
)

$ErrorActionPreference = "Stop"

$keytool = Join-Path $JbrPath "bin\keytool.exe"
$cacerts = Join-Path $JbrPath "lib\security\cacerts"
$certFile = Join-Path $env:TEMP "migiude-ssl-intercept.cer"

if (-not (Test-Path $keytool)) {
  Write-Error "keytool not found at $keytool. Set -JbrPath to your Gradle JDK (Android Studio Settings -> Gradle -> Gradle JDK)."
}

Write-Host "Fetching certificate presented for $HostName ..."
$tcp = New-Object System.Net.Sockets.TcpClient($HostName, 443)
$ssl = New-Object System.Net.Security.SslStream($tcp.GetStream(), $false, ({ $true }))
$ssl.AuthenticateAsClient($HostName)
$cert2 = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($ssl.RemoteCertificate)
$bytes = $cert2.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
[System.IO.File]::WriteAllBytes($certFile, $bytes)
$ssl.Close()
$tcp.Close()

Write-Host "Subject: $($cert2.Subject)"
Write-Host "Issuer:  $($cert2.Issuer)"

& $keytool -importcert -noprompt -alias migiude-ssl-fix -file $certFile -keystore $cacerts -storepass changeit

Write-Host ""
Write-Host "Imported into: $cacerts"
Write-Host "Next: Android Studio -> File -> Invalidate Caches -> Restart -> Sync Project with Gradle Files"
Write-Host "Or run: cd android; `$env:JAVA_HOME='$JbrPath'; .\gradlew.bat :app:assembleDebug"
