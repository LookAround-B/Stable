param(
    [string]$VpsIp = "187.77.185.220",
    [string]$VpsUser = "root",
    [int]$LocalPort = 5433,
    [int]$RemotePort = 5433
)

Write-Host "Starting persistent SSH tunnel to VPS database..."
Write-Host "Local: localhost:$LocalPort -> Remote: $VpsIp`:$RemotePort"
Write-Host ""

$retryCount = 0

while ($true) {
    try {
        $retryCount++
        $timestamp = Get-Date -Format "HH:mm:ss"
        Write-Host "[$timestamp] Attempt $retryCount - Connecting SSH tunnel..."
        
        ssh -o ConnectTimeout=10 `
            -o StrictHostKeyChecking=no `
            -o ServerAliveInterval=60 `
            -o ServerAliveCountMax=3 `
            -L "$($LocalPort):localhost:$($RemotePort)" `
            "$($VpsUser)@$($VpsIp)"
        
        $timestamp = Get-Date -Format "HH:mm:ss"
        Write-Host "[$timestamp] SSH tunnel disconnected. Reconnecting in 5 seconds..."
        Start-Sleep -Seconds 5
    }
    catch {
        $timestamp = Get-Date -Format "HH:mm:ss"
        Write-Host "[$timestamp] Error - $_"
        Write-Host "Reconnecting in 5 seconds..."
        Start-Sleep -Seconds 5
    }
}
