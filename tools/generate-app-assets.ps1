$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$assetRoot = Join-Path $projectRoot 'assets'
$iconRoot = Join-Path $projectRoot 'public\icons'
New-Item -ItemType Directory -Path $assetRoot -Force | Out-Null
New-Item -ItemType Directory -Path $iconRoot -Force | Out-Null

function New-TravelSwishIcon([int]$size, [string]$path, [bool]$maskable = $false) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
        $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#103f3b'))
        $margin = if ($maskable) { [int]($size * 0.20) } else { [int]($size * 0.12) }
        $lime = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#d6e88e'))
        $paper = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#f5f2eb'))
        $coral = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#e97655'))
        $graphics.FillEllipse($lime, $margin, $margin, $size - (2 * $margin), $size - (2 * $margin))
        $font = New-Object System.Drawing.Font('Georgia', ($size * 0.48), [System.Drawing.FontStyle]::Italic, [System.Drawing.GraphicsUnit]::Pixel)
        $format = New-Object System.Drawing.StringFormat
        $format.Alignment = [System.Drawing.StringAlignment]::Center
        $format.LineAlignment = [System.Drawing.StringAlignment]::Center
        $graphics.DrawString('S', $font, $paper, (New-Object System.Drawing.RectangleF(0, -($size * 0.035), $size, $size)), $format)
        $graphics.FillEllipse($coral, [int]($size * 0.70), [int]($size * 0.70), [int]($size * 0.09), [int]($size * 0.09))
        $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
        $font.Dispose(); $format.Dispose(); $lime.Dispose(); $paper.Dispose(); $coral.Dispose()
    } finally {
        $graphics.Dispose(); $bitmap.Dispose()
    }
}

function New-TravelSwishSplash([int]$width, [int]$height, [string]$path, [string]$background) {
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml($background))
        $teal = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#103f3b'))
        $lime = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#d6e88e'))
        $shortEdge = [Math]::Min($width, $height)
        $circle = [int]($shortEdge * 0.30)
        $startX = [int](($width - $circle) / 2)
        $startY = [int](($height - $circle) / 2)
        $graphics.FillEllipse($teal, $startX, $startY, $circle, $circle)
        $font = New-Object System.Drawing.Font('Georgia', ($shortEdge * 0.15), [System.Drawing.FontStyle]::Italic, [System.Drawing.GraphicsUnit]::Pixel)
        $format = New-Object System.Drawing.StringFormat
        $format.Alignment = [System.Drawing.StringAlignment]::Center
        $format.LineAlignment = [System.Drawing.StringAlignment]::Center
        $graphics.DrawString('S', $font, $lime, (New-Object System.Drawing.RectangleF(0, -($shortEdge * 0.01), $width, $height)), $format)
        $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
        $font.Dispose(); $format.Dispose(); $teal.Dispose(); $lime.Dispose()
    } finally {
        $graphics.Dispose(); $bitmap.Dispose()
    }
}

New-TravelSwishIcon 1024 (Join-Path $assetRoot 'icon-only.png')
New-TravelSwishIcon 1024 (Join-Path $assetRoot 'icon-foreground.png') $true
New-TravelSwishIcon 1024 (Join-Path $assetRoot 'icon-background.png') $true
New-TravelSwishSplash 2732 2732 (Join-Path $assetRoot 'splash.png') '#f5f2eb'
New-TravelSwishSplash 2732 2732 (Join-Path $assetRoot 'splash-dark.png') '#103f3b'
New-TravelSwishIcon 192 (Join-Path $iconRoot 'icon-192.png')
New-TravelSwishIcon 512 (Join-Path $iconRoot 'icon-512.png')
New-TravelSwishIcon 512 (Join-Path $iconRoot 'icon-maskable-512.png') $true
New-TravelSwishIcon 180 (Join-Path $iconRoot 'apple-touch-icon.png')

$androidRes = Join-Path $projectRoot 'android\app\src\main\res'
if (Test-Path -LiteralPath $androidRes) {
    $densities = @{
        'mdpi' = @{ Icon = 48; Foreground = 108 }
        'hdpi' = @{ Icon = 72; Foreground = 162 }
        'xhdpi' = @{ Icon = 96; Foreground = 216 }
        'xxhdpi' = @{ Icon = 144; Foreground = 324 }
        'xxxhdpi' = @{ Icon = 192; Foreground = 432 }
    }
    foreach ($density in $densities.Keys) {
        $folder = Join-Path $androidRes "mipmap-$density"
        New-TravelSwishIcon $densities[$density].Icon (Join-Path $folder 'ic_launcher.png')
        New-TravelSwishIcon $densities[$density].Icon (Join-Path $folder 'ic_launcher_round.png') $true
        New-TravelSwishIcon $densities[$density].Foreground (Join-Path $folder 'ic_launcher_foreground.png') $true
    }
    $androidSplashes = @{
        'drawable\splash.png' = @(480, 320)
        'drawable-land-mdpi\splash.png' = @(480, 320)
        'drawable-land-hdpi\splash.png' = @(800, 480)
        'drawable-land-xhdpi\splash.png' = @(1280, 720)
        'drawable-land-xxhdpi\splash.png' = @(1600, 960)
        'drawable-land-xxxhdpi\splash.png' = @(1920, 1280)
        'drawable-port-mdpi\splash.png' = @(320, 480)
        'drawable-port-hdpi\splash.png' = @(480, 800)
        'drawable-port-xhdpi\splash.png' = @(720, 1280)
        'drawable-port-xxhdpi\splash.png' = @(960, 1600)
        'drawable-port-xxxhdpi\splash.png' = @(1280, 1920)
    }
    foreach ($relativePath in $androidSplashes.Keys) {
        $dimensions = $androidSplashes[$relativePath]
        New-TravelSwishSplash $dimensions[0] $dimensions[1] (Join-Path $androidRes $relativePath) '#f5f2eb'
    }
}

$iosAssets = Join-Path $projectRoot 'ios\App\App\Assets.xcassets'
if (Test-Path -LiteralPath $iosAssets) {
    New-TravelSwishIcon 1024 (Join-Path $iosAssets 'AppIcon.appiconset\AppIcon-512@2x.png')
    foreach ($splashName in @('splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png')) {
        New-TravelSwishSplash 2732 2732 (Join-Path $iosAssets "Splash.imageset\$splashName") '#f5f2eb'
    }
}

Write-Host 'Travel Swish appikoner og splash-kilder er generert.' -ForegroundColor Green
