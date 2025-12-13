param(
  [ValidateSet('start','stop','status','logs','clean')]
  [string]$Action = 'start',
  [string]$Service
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
Write-Host "Ação: $Action" -ForegroundColor Cyan

switch ($Action) {
  'start' {
    Write-Host 'Construindo e iniciando todos os containers (API, Frontend, Caddy, Infra)...' -ForegroundColor Green
    docker compose up -d --build

    Write-Host 'Status dos containers:' -ForegroundColor Green
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
    break
  }
  'stop' {
    Write-Host 'Parando e removendo todos os containers, redes e volumes...' -ForegroundColor Yellow
    docker compose down -v --remove-orphans
    break
  }
  'status' {
    Write-Host 'Status dos containers:' -ForegroundColor Cyan
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
    break
  }
  'logs' {
    if ($Service) {
      Write-Host "Acompanhando logs do serviço '$Service' (Ctrl+C para sair)..." -ForegroundColor Cyan
      docker compose logs -f $Service
    } else {
      Write-Host 'Acompanhando logs de todos os serviços (Ctrl+C para sair)...' -ForegroundColor Cyan
      docker compose logs -f
    }
    break
  }
  'clean' {
    Write-Host 'Executando docker image prune -af' -ForegroundColor Yellow
    docker image prune -af
    break
  }
}
