# Powershell script to generate a new custom release keystore for GreenKid TV (CurateTV)
param(
    [string]$KeystorePath = "app/release.jks",
    [string]$Alias = "curatetv",
    [string]$StorePassword = "curatetv123",
    [string]$KeyPassword = "curatetv123",
    [int]$ValidityDays = 10000,
    [string]$DName = "CN=GreenKid TV, OU=Mobile, O=CurateTV, L=Cairo, S=Cairo, C=EG"
)

Write-Host "Generating release keystore at $KeystorePath with alias '$Alias'..." -ForegroundColor Cyan

keytool -genkeypair -v `
    -keystore $KeystorePath `
    -alias $Alias `
    -keyalg RSA `
    -keysize 2048 `
    -validity $ValidityDays `
    -storepass $StorePassword `
    -keypass $KeyPassword `
    -dname $DName

if ($LASTEXITCODE -eq 0) {
    Write-Host "Keystore generated successfully at $KeystorePath" -ForegroundColor Green
} else {
    Write-Host "Failed to generate keystore." -ForegroundColor Red
}

