param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet('gh', 'git')]
  [string]$Tool,

  [Parameter(ValueFromRemainingArguments = $true, Position = 1)]
  [string[]]$ToolArgs
)

$ErrorActionPreference = 'Stop'

function Add-CandidateProxy {
  param(
    [System.Collections.Generic.List[string]]$Candidates,
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return
  }

  $normalized = $Value.Trim()
  if ($normalized -match '=') {
    foreach ($part in ($normalized -split ';')) {
      if ($part -match '^(?:http|https)=([^;]+)$') {
        Add-CandidateProxy -Candidates $Candidates -Value $Matches[1]
      }
    }
    return
  }

  if ($normalized -notmatch '^[a-z]+://') {
    $normalized = "http://$normalized"
  }

  if (-not $Candidates.Contains($normalized)) {
    $Candidates.Add($normalized)
  }
}

function Test-ProxyPort {
  param([string]$ProxyUrl)

  try {
    $uri = [Uri]$ProxyUrl
    $client = [Net.Sockets.TcpClient]::new()
    $task = $client.ConnectAsync($uri.Host, $uri.Port)
    if (-not $task.Wait(1500)) {
      $client.Dispose()
      return $false
    }
    $client.Dispose()
    return $true
  } catch {
    return $false
  }
}

function Test-GitHubAccess {
  param([string]$ProxyUrl)

  $args = @(
    '-sS',
    '-o',
    'NUL',
    '-w',
    '%{http_code}',
    '--connect-timeout',
    '2',
    '--max-time',
    '6'
  )

  if (-not [string]::IsNullOrWhiteSpace($ProxyUrl)) {
    $args += @('--proxy', $ProxyUrl)
  }

  $args += 'https://api.github.com'

  try {
    $status = (& curl.exe @args 2>$null).Trim()
    return ($LASTEXITCODE -eq 0 -and $status -match '^(2|3)\d\d$')
  } catch {
    return $false
  }
}

function Resolve-GitHubProxy {
  if (Test-GitHubAccess) {
    return $null
  }

  $candidates = [System.Collections.Generic.List[string]]::new()

  try {
    $settings = Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
    Add-CandidateProxy -Candidates $candidates -Value $settings.ProxyServer
  } catch {
    # Ignore registry lookup failures; common local proxy ports below are still tested.
  }

  foreach ($port in @(7890, 7897, 1080, 10808, 10809, 12334, 16450, 16756, 8080, 8118, 6152)) {
    Add-CandidateProxy -Candidates $candidates -Value "127.0.0.1:$port"
  }

  foreach ($candidate in $candidates) {
    if ((Test-ProxyPort -ProxyUrl $candidate) -and (Test-GitHubAccess -ProxyUrl $candidate)) {
      return $candidate
    }
  }

  return $null
}

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$proxy = Resolve-GitHubProxy

if ($Tool -eq 'gh') {
  $ghPath = (Get-Command gh -ErrorAction SilentlyContinue).Source
  if (-not $ghPath) {
    $ghPath = 'C:\Program Files\GitHub CLI\gh.exe'
  }
  if (-not (Test-Path -LiteralPath $ghPath)) {
    throw 'GitHub CLI is not installed or gh.exe is not in PATH.'
  }

  if ($proxy) {
    $env:HTTP_PROXY = $proxy
    $env:HTTPS_PROXY = $proxy
    $env:ALL_PROXY = $proxy
    Write-Host "GitHub proxy: $proxy" -ForegroundColor DarkGray
  } else {
    Write-Host 'GitHub proxy: direct' -ForegroundColor DarkGray
  }

  & $ghPath @ToolArgs
  exit $LASTEXITCODE
}

if ($Tool -eq 'git') {
  if ($proxy) {
    Write-Host "GitHub proxy: $proxy" -ForegroundColor DarkGray
    & git -c "http.proxy=$proxy" -c "https.proxy=$proxy" @ToolArgs
  } else {
    Write-Host 'GitHub proxy: direct' -ForegroundColor DarkGray
    & git @ToolArgs
  }
  exit $LASTEXITCODE
}
