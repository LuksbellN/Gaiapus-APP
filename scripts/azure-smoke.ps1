param([Parameter(Mandatory)][uri]$Origin)
$ErrorActionPreference = 'Stop'
if ($Origin.Scheme -ne 'https') { throw 'Informe a origem HTTPS do aplicativo.' }
$base = $Origin.GetLeftPart([System.UriPartial]::Authority)
foreach ($path in @('/health', '/', '/v1/simulations/regional')) {
    $response = Invoke-WebRequest -Uri "$base$path" -TimeoutSec 180
    if ($response.StatusCode -ne 200) { throw "Falha em $path" }
    if ($path -eq '/' -and $response.Headers['Content-Type'] -notmatch 'text/html') {
        throw 'A raiz nao retornou HTML.'
    }
    Write-Host "OK $path"
}
Write-Host 'Endpoints publicos verificados. Auth, isolamento e Python exigem os testes do guia.'
