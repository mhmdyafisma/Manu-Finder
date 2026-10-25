param([int]$Port = 8080)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }

# Determine local Wi-Fi / LAN IP
$localIp = "127.0.0.1"
try {
    $ipObj = Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*", "Ethernet*" -ErrorAction SilentlyContinue | 
             Where-Object { $_.IPAddress -notmatch "^169\." -and $_.IPAddress -ne "127.0.0.1" } | 
             Select-Object -First 1
    if ($ipObj) { $localIp = $ipObj.IPAddress }
} catch {}

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.webp' = 'image/webp'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
}

# Bind to 0.0.0.0 so both PC and mobile phones on Wi-Fi can connect
while ($true) {
    try {
        $tcp = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
        $tcp.Start()
        break
    } catch {
        $Port++
    }
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  MANU FINDER - Web & Mobile Server Running" -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  [PC Browser]     : http://localhost:$Port/" -ForegroundColor Green
Write-Host "  [Mobile / Phone] : http://${localIp}:$Port/" -ForegroundColor Magenta
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "Tip: Open the Mobile URL on any phone connected to the same Wi-Fi!" -ForegroundColor Gray

Start-Process "http://localhost:$Port/"

try {
    while ($true) {
        $client = $tcp.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII)
        $line = $reader.ReadLine()

        if ($line) {
            $parts = $line.Split(' ')
            if ($parts.Length -ge 2 -and $parts[0] -eq 'GET') {
                $rawPath = $parts[1].Split('?')[0]
                if ($rawPath -eq '/' -or [string]::IsNullOrWhiteSpace($rawPath)) {
                    $rawPath = '/index.html'
                }

                $cleanRel = $rawPath.TrimStart('/').Replace('/', '\')
                $filePath = Join-Path $scriptDir $cleanRel

                if (Test-Path $filePath -PathType Leaf) {
                    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                    $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
                    $bytes = [System.IO.File]::ReadAllBytes($filePath)

                    $header = "HTTP/1.1 200 OK`r`n" +
                              "Content-Type: $mime`r`n" +
                              "Content-Length: $($bytes.Length)`r`n" +
                              "Connection: close`r`n" +
                              "Access-Control-Allow-Origin: *`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($bytes, 0, $bytes.Length)
                } else {
                    $notFound = "HTTP/1.1 404 Not Found`r`nContent-Length: 9`r`nConnection: close`r`n`r`nNot Found"
                    $nfBytes = [System.Text.Encoding]::ASCII.GetBytes($notFound)
                    $stream.Write($nfBytes, 0, $nfBytes.Length)
                }
            }
        }

        $client.Close()
    }
} finally {
    $tcp.Stop()
}
