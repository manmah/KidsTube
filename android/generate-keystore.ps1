# Powershell script to generate a new custom release keystore for GreenKid TV

[CmdletBinding()]
param(
    [string]$KeystorePath = "app/release.jks",
    [string]$Alias = "greenkidtv",
    [string]$StorePassword = "greenkidtv123",
    [string]$KeyPassword = "greenkidtv123",
    [string]$DName = "CN=GreenKid TV, OU=Mobile, O=GreenKidTV, L=Cairo, S=Cairo, C=EG"
)

Write-Host "Generating release keystore at: $KeystorePath"

keytool -genkeypair -v `
    -keystore $KeystorePath `
    -alias $Alias `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -storepass $StorePassword `
    -keypass $KeyPassword `
    -dname $DName

Write-Host "Keystore generated successfully!"
