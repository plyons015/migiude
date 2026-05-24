# Set Stripe secrets for Ude (Firebase + local emulators)
#
# Run from repo root in PowerShell:
#   .\scripts\set-stripe-secrets.ps1              # secret key + optional webhook
#   .\scripts\set-stripe-secrets.ps1 -SecretKeyOnly   # reset API key only
#
# Tip: Copy the key in Stripe first, then run (uses clipboard).

param(
  [switch]$SecretKeyOnly
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Read-StripeSecret {
  param(
    [string]$Label,
    [string[]]$ValidPrefixes
  )

  Write-Host ""
  Write-Host $Label -ForegroundColor Cyan
  Write-Host "  1. In Stripe, click Reveal on the key, then Copy"
  Write-Host "  2. Come back here and press Enter (reads from clipboard)"
  Write-Host "  Or type/paste manually if clipboard is empty"
  Write-Host ""
  Read-Host "Press Enter when copied" | Out-Null

  $value = (Get-Clipboard -Raw -ErrorAction SilentlyContinue).Trim()
  if (-not $value) {
    $value = (Read-Host "Paste key here").Trim()
  } else {
    $preview = if ($value.Length -gt 12) { $value.Substring(0, 12) + "..." } else { $value }
    Write-Host "From clipboard: $preview ($($value.Length) chars)"
    $confirm = Read-Host "Use this? (y/n)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
      $value = (Read-Host "Paste key here").Trim()
    }
  }

  $ok = $false
  foreach ($prefix in $ValidPrefixes) {
    if ($value.StartsWith($prefix)) { $ok = $true; break }
  }
  if (-not $ok) {
    Write-Host "Expected prefix: $($ValidPrefixes -join ' or ')" -ForegroundColor Yellow
    Write-Host "Got: $($value.Substring(0, [Math]::Min(20, $value.Length)))..." -ForegroundColor Yellow
    if ($value.StartsWith("k_test_") -or $value.StartsWith("k_live_")) {
      $fix = Read-Host "Missing leading 's'? Prepend sk_ (y/n)"
      if ($fix -eq "y" -or $fix -eq "Y") {
        $value = "s$value"
      }
    }
  }

  return $value.Trim()
}

function Set-FirebaseSecret {
  param([string]$Name, [string]$Value)
  $Value.Trim() | npx firebase-tools functions:secrets:set $Name --data-file -
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host ""
if ($SecretKeyOnly) {
  Write-Host "=== Reset STRIPE_SECRET_KEY only (webhook skipped) ===" -ForegroundColor Cyan
} else {
  Write-Host "=== Ude Stripe secret setup ===" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Key guide:" -ForegroundColor Yellow
Write-Host "  pk_...  Publishable - skip (not used)"
Write-Host "  sk_...  Secret key  - STRIPE_SECRET_KEY"
Write-Host "  whsec_  Webhook     - STRIPE_WEBHOOK_SECRET"
Write-Host ""
Write-Host "Project: migiude-app-plyons015"
Write-Host ""
Write-Host "Note: Pasting directly into PowerShell often drops the first letter (sk_ -> k_)."
Write-Host "This script reads from your clipboard instead."

$sk = Read-StripeSecret -Label "STRIPE secret key" -ValidPrefixes @("sk_test_", "sk_live_", "rk_test_", "rk_live_")
if ($sk.Length -lt 32) {
  Write-Host "Warning: key looks too short - Stripe secret keys are usually 90+ characters." -ForegroundColor Yellow
  $continue = Read-Host "Continue anyway? (y/n)"
  if ($continue -ne "y" -and $continue -ne "Y") { exit 1 }
}

Set-FirebaseSecret -Name "STRIPE_SECRET_KEY" -Value $sk
Write-Host "OK: STRIPE_SECRET_KEY set (new version in Secret Manager)." -ForegroundColor Green

$wh = $null
if (-not $SecretKeyOnly) {
  $setWebhook = Read-Host "Set webhook signing secret now? (y/n)"
  if ($setWebhook -eq "y" -or $setWebhook -eq "Y") {
    $wh = Read-StripeSecret -Label "Webhook signing secret" -ValidPrefixes @("whsec_")
    Set-FirebaseSecret -Name "STRIPE_WEBHOOK_SECRET" -Value $wh
    Write-Host "OK: STRIPE_WEBHOOK_SECRET set." -ForegroundColor Green
  } else {
    Write-Host "Skip webhook for now. After deploy, create webhook at:" -ForegroundColor Yellow
    Write-Host "  https://us-central1-migiude-app-plyons015.cloudfunctions.net/stripeWebhook"
  }
} else {
  Write-Host "Webhook secret not touched (set after deploy + Stripe webhook endpoint)." -ForegroundColor Yellow
}

$localPath = Join-Path $root "functions\.secret.local"
if (Test-Path $localPath) {
  $updateLocal = Read-Host "Also write to functions/.secret.local for emulators? (y/n)"
  if ($updateLocal -eq "y" -or $updateLocal -eq "Y") {
    $content = Get-Content $localPath -Raw
    if ($content -match "STRIPE_SECRET_KEY=") {
      $content = $content -replace "STRIPE_SECRET_KEY=.*", "STRIPE_SECRET_KEY=$($sk.Trim())"
    } else {
      $content = $content.TrimEnd() + "`nSTRIPE_SECRET_KEY=$($sk.Trim())`n"
    }
    if ($wh) {
      if ($content -match "STRIPE_WEBHOOK_SECRET=") {
        $content = $content -replace "STRIPE_WEBHOOK_SECRET=.*", "STRIPE_WEBHOOK_SECRET=$($wh.Trim())"
      } else {
        $content = $content.TrimEnd() + "`nSTRIPE_WEBHOOK_SECRET=$($wh.Trim())`n"
      }
    }
    Set-Content -Path $localPath -Value $content -NoNewline
    Write-Host "OK: functions/.secret.local updated." -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  npm run build --prefix functions"
Write-Host "  npx firebase-tools deploy --only functions"
Write-Host ""
