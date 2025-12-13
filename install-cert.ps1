# Verifica se o script está sendo executado como Administrador
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Este script precisa ser executado com privilégios de Administrador para instalar o certificado."
    Write-Warning "Por favor, abra um novo PowerShell como Administrador e execute o script novamente."
    exit 1
}

# Obtém o diretório onde o script está sendo executado
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Define o caminho completo para o arquivo do certificado
$certPath = Join-Path $scriptDir 'caddy-root.crt'

if (Test-Path $certPath) {
    try {
        Import-Certificate -FilePath $certPath -CertStoreLocation Cert:\LocalMachine\Root -Confirm:$false -ErrorAction Stop
        Write-Host "[OK] Certificado importado com sucesso!" -ForegroundColor Green
        Write-Host "Agora você pode acessar: https://localhost:8443/" -ForegroundColor Cyan
    } catch {
        Write-Host "[ERRO] Falha ao importar: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[ERRO] Arquivo não encontrado: $certPath" -ForegroundColor Red
    exit 1
}
