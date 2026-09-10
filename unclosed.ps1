param(
  [Parameter(Position=0)][ValidateSet('start','stop','restart','logs','status','help')][string]$Command = 'help',
  [Parameter(Position=1,ValueFromRemainingArguments=$true)][string[]]$Folders
)
$ErrorActionPreference = 'Stop'
$projectPath = $PSScriptRoot
$generatedPath = Join-Path $projectPath '.unclosed/compose.json'
$composeArgs = @('compose','-p','unclosed','--project-directory',$projectPath,'-f')
if (Test-Path -LiteralPath $generatedPath) { $composeArgs += $generatedPath } else { $composeArgs += (Join-Path $projectPath 'docker-compose.yml') }
function Invoke-Docker([string[]]$Arguments) {
  & docker @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Docker exited with code $LASTEXITCODE" }
}
switch ($Command) {
  'start' {
    if ($Folders.Count -gt 0) {
      $resolvedFolders = @($Folders | ForEach-Object {
        $entry = Get-Item -LiteralPath $_
        if (-not $entry.PSIsContainer) { throw 'Every scan location must be a folder.' }
        $entry.FullName
      })
      Invoke-Docker @('compose','-p','unclosed','--project-directory',$projectPath,'-f',(Join-Path $projectPath 'docker-compose.yml'),'build')
      New-Item -ItemType Directory -Force -Path (Split-Path $generatedPath) | Out-Null
      $configText = & docker run --rm --network none --read-only --entrypoint node unclosed:local /app/scripts/configure.mjs $projectPath @resolvedFolders
      if ($LASTEXITCODE -ne 0) { throw 'Could not generate folder configuration.' }
      [IO.File]::WriteAllText($generatedPath, ($configText -join "`n"), [Text.UTF8Encoding]::new($false))
      $composeArgs = @('compose','-p','unclosed','--project-directory',$projectPath,'-f',$generatedPath)
      Invoke-Docker ($composeArgs + @('up','-d','--no-build','--wait'))
    } else { Invoke-Docker ($composeArgs + @('up','-d','--build','--wait')) }
    Write-Host 'Unclosed is ready at http://localhost:3000'
  }
  'stop' { Invoke-Docker ($composeArgs + @('stop')) }
  'restart' { Invoke-Docker ($composeArgs + @('restart')) }
  'logs' { Invoke-Docker ($composeArgs + @('logs','--follow','--tail','100')) }
  'status' { Invoke-Docker ($composeArgs + @('ps')) }
  default { Write-Host '.\unclosed.ps1 {start [folders...]|stop|restart|logs|status}' }
}
