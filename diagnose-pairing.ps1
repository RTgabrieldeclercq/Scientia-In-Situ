# Scientia In Situ - pairing check. Writes pairing-report.txt next to this file (no tokens or codes in it).
$ErrorActionPreference = 'Continue'
$out = Join-Path $PSScriptRoot 'pairing-report.txt'
$L = New-Object System.Collections.Generic.List[string]
function S($t) { $L.Add(''); $L.Add('=== ' + $t) }
function A($x) { if ($x -eq $null) { $L.Add('(none)') } else { ($x | Out-String -Width 200).TrimEnd() -split "`r?`n" | ForEach-Object { $L.Add($_) } } }
$L.Add('Report ' + (Get-Date -Format s))
S 'Network profiles (Public blocks incoming connections unless allowed)'
try { A (Get-NetConnectionProfile | Select-Object InterfaceAlias, Name, NetworkCategory, IPv4Connectivity | Format-Table -AutoSize) } catch { A $_.Exception.Message }
S 'IPv4 addresses'
try { A (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' } | Select-Object InterfaceAlias, IPAddress | Format-Table -AutoSize) } catch { A $_.Exception.Message }
S 'Who listens on 8766'
try { $c = Get-NetTCPConnection -LocalPort 8766 -State Listen -ErrorAction Stop; A ($c | Select-Object LocalAddress, LocalPort, OwningProcess | Format-Table -AutoSize); foreach ($p in $c.OwningProcess | Select-Object -Unique) { A (Get-Process -Id $p | Select-Object Id, ProcessName, Path | Format-List) } } catch { A 'NOTHING is listening on 8766 - launch.bat is not running' }
S 'App answers on this computer'
try { A (Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 'http://127.0.0.1:8766/api/sync/hello').Content } catch { A ('FAILED: ' + $_.Exception.Message) }
S 'Firewall rules for Python (inbound)'
try {
  $f = Get-NetFirewallApplicationFilter | Where-Object { $_.Program -like '*python*' }
  if (-not $f) { A 'no rule mentions python' }
  foreach ($x in $f) { $r = $x | Get-NetFirewallRule; foreach ($y in $r) { if ($y.Direction -eq 'Inbound') { $L.Add(('{0} | enabled={1} action={2} profile={3} | {4}' -f $y.DisplayName, $y.Enabled, $y.Action, $y.Profile, $x.Program)) } } }
} catch { A $_.Exception.Message }
S 'Tailscale'
$ts = (Get-Command tailscale -ErrorAction SilentlyContinue).Source; if (-not $ts -and (Test-Path 'C:\Program Files\Tailscale\tailscale.exe')) { $ts = 'C:\Program Files\Tailscale\tailscale.exe' }
if ($ts) {
  A (& $ts status 2>&1)
  S 'tailscale serve status'; A (& $ts serve status 2>&1)
  try { $j = (& $ts status --json 2>$null) | ConvertFrom-Json; $dns = $j.Self.DNSName.TrimEnd('.'); $L.Add('this computer: ' + $dns + '  state=' + $j.BackendState)
    S ('App through Tailscale: https://' + $dns + '/api/sync/hello')
    try { A (Invoke-WebRequest -UseBasicParsing -TimeoutSec 8 ('https://' + $dns + '/api/sync/hello')).Content } catch { A ('FAILED: ' + $_.Exception.Message) } } catch { A $_.Exception.Message }
} else { A 'Tailscale not found' }
S 'Pairing state (devices.json)'
$dj = Join-Path $env:APPDATA 'ScientiaInSitu\devices.json'
if (Test-Path $dj) { try { $d = Get-Content $dj -Raw | ConvertFrom-Json; $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $L.Add('codes: ' + @($d.codes).Count + ' (valid now: ' + @($d.codes | Where-Object { $_.exp -gt $now }).Count + ')')
    foreach ($r in @($d.requests)) { if ($r) { $L.Add(('request: name={0} state={1} at={2} expired={3} ua={4}' -f $r.name, $r.state, $r.ts, ($r.exp -lt $now), $r.ua)) } }
    foreach ($v in @($d.devices)) { if ($v) { $L.Add(('device: {0} paired={1} lastSeen={2}' -f $v.name, $v.created, $v.lastSeen)) } } } catch { A $_.Exception.Message } } else { A ('no ' + $dj) }
S 'Config'
$cf = Join-Path $env:APPDATA 'ScientiaInSitu\config.json'; if (Test-Path $cf) { $c = Get-Content $cf -Raw | ConvertFrom-Json; $L.Add('notebook: ' + $c.notebook + '  exists=' + (Test-Path $c.notebook)) } else { A 'no config.json' }
$L | Set-Content -Encoding UTF8 $out
Write-Host "Done - wrote $out"
