Add-Type -AssemblyName System.Drawing

$assetsDir = Join-Path $PSScriptRoot "package_staging\Assets"
if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null
}

function Create-AppIcon {
    param([int]$width, [int]$height, [string]$outPath, [bool]$isWide = $false, [bool]$isSplash = $false)
    
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    # Background
    $rect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 15, 17, 26),
        [System.Drawing.Color]::FromArgb(255, 28, 32, 48),
        45.0
    )
    $g.FillRectangle($bgBrush, $rect)
    
    if ($isSplash) {
        # Logo in center-left or center
        $iconSize = 100
        $iconX = ($width - $iconSize) / 2
        $iconY = 60
        
        # Glow circle
        $glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 56, 189, 248))
        $g.FillEllipse($glowBrush, ($iconX - 20), ($iconY - 20), ($iconSize + 40), ($iconSize + 40))
        
        # Card
        $cardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 30, 41, 59))
        $g.FillEllipse($cardBrush, $iconX, $iconY, $iconSize, $iconSize)
        $cardPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 56, 189, 248), 3)
        $g.DrawEllipse($cardPen, $iconX, $iconY, $iconSize, $iconSize)
        
        # Letter T
        $font = New-Object System.Drawing.Font("Segoe UI", 52, [System.Drawing.FontStyle]::Bold)
        $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 240, 249, 255))
        $sf = New-Object System.Drawing.StringFormat
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
        $g.DrawString("T", $font, $textBrush, (New-Object System.Drawing.RectangleF $iconX, ($iconY + 4), $iconSize, $iconSize), $sf)
        
        # Text "Translucent"
        $titleFont = New-Object System.Drawing.Font("Segoe UI", 26, [System.Drawing.FontStyle]::Bold)
        $titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
        $g.DrawString("Translucent", $titleFont, $titleBrush, (New-Object System.Drawing.RectangleF 0, 180, $width, 50), $sf)
        
        $subFont = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Regular)
        $subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 148, 163, 184))
        $g.DrawString("Invisible Stealth Browser & AI Overlay", $subFont, $subBrush, (New-Object System.Drawing.RectangleF 0, 230, $width, 30), $sf)
        
    } elseif ($isWide) {
        # Wide Tile (310x150)
        $iconSize = 70
        $iconX = 40
        $iconY = ($height - $iconSize) / 2
        
        $cardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 30, 41, 59))
        $g.FillEllipse($cardBrush, $iconX, $iconY, $iconSize, $iconSize)
        $cardPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 56, 189, 248), 2)
        $g.DrawEllipse($cardPen, $iconX, $iconY, $iconSize, $iconSize)
        
        $font = New-Object System.Drawing.Font("Segoe UI", 36, [System.Drawing.FontStyle]::Bold)
        $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 240, 249, 255))
        $sf = New-Object System.Drawing.StringFormat
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
        $g.DrawString("T", $font, $textBrush, (New-Object System.Drawing.RectangleF $iconX, ($iconY + 2), $iconSize, $iconSize), $sf)
        
        $titleFont = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
        $titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
        $sfLeft = New-Object System.Drawing.StringFormat
        $sfLeft.Alignment = [System.Drawing.StringAlignment]::Near
        $sfLeft.LineAlignment = [System.Drawing.StringAlignment]::Center
        $g.DrawString("Translucent", $titleFont, $titleBrush, (New-Object System.Drawing.RectangleF 130, 45, 170, 35), $sfLeft)
        
        $subFont = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Regular)
        $subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 148, 163, 184))
        $g.DrawString("Stealth Browser & AI", $subFont, $subBrush, (New-Object System.Drawing.RectangleF 130, 80, 170, 25), $sfLeft)
        
    } else {
        # Square icons (44x44, 50x50, 150x150)
        $padding = [Math]::Max(2, [int]($width * 0.12))
        $iconW = $width - ($padding * 2)
        $iconH = $height - ($padding * 2)
        
        # Subtle glow
        $glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(35, 56, 189, 248))
        $g.FillEllipse($glowBrush, [int]($padding * 0.5), [int]($padding * 0.5), ($width - $padding), ($height - $padding))
        
        # Circle badge
        $cardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 20, 28, 44))
        $g.FillEllipse($cardBrush, $padding, $padding, $iconW, $iconH)
        
        $penWidth = [Math]::Max(1, [int]($width * 0.03))
        $cardPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 56, 189, 248), $penWidth)
        $g.DrawEllipse($cardPen, $padding, $padding, $iconW, $iconH)
        
        # "T" Letter
        $fontSize = [int]($width * 0.52)
        $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold)
        $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 240, 249, 255))
        $sf = New-Object System.Drawing.StringFormat
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
        
        $offsetY = [int]($width * 0.02)
        $g.DrawString("T", $font, $textBrush, (New-Object System.Drawing.RectangleF 0, $offsetY, $width, $height), $sf)
    }
    
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated: $outPath ($width x $height)"
}

Create-AppIcon 50 50 (Join-Path $assetsDir "StoreLogo.png")
Create-AppIcon 44 44 (Join-Path $assetsDir "Square44x44Logo.png")
Create-AppIcon 150 150 (Join-Path $assetsDir "Square150x150Logo.png")
Create-AppIcon 310 150 (Join-Path $assetsDir "Wide310x150Logo.png") -isWide $true
Create-AppIcon 620 300 (Join-Path $assetsDir "SplashScreen.png") -isSplash $true
