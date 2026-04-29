# Batch thumbnail generator
# Usage: drop all portfolio originals into images/portfolio/, run this script
# It resizes every jpg/png to max 800px longest side and saves to images/portfolio/thumbs/

$srcDir = "D:\codebuddy\Githubio\images\portfolio"
$thumbDir = "D:\codebuddy\Githubio\images\portfolio\thumbs"
$maxSize = 800

if (!(Test-Path $thumbDir)) { New-Item -Path $thumbDir -ItemType Directory -Force | Out-Null }

Add-Type -AssemblyName System.Drawing

$files = Get-ChildItem -Path $srcDir -File | Where-Object { $_.Extension -match '\.(jpg|jpeg|png)$' }
Write-Host "Found $($files.Count) images, generating thumbnails..." -ForegroundColor Cyan

foreach ($f in $files) {
    $outPath = Join-Path $thumbDir $f.Name
    try {
        $img = [System.Drawing.Image]::FromFile($f.FullName)
        $ratio = [Math]::Min($maxSize / $img.Width, $maxSize / $img.Height)
        if ($ratio -ge 1) {
            $img.Dispose()
            Copy-Item $f.FullName $outPath -Force
            Write-Host "  [copy] $($f.Name)" -ForegroundColor Gray
            continue
        }
        $newW = [int]($img.Width * $ratio)
        $newH = [int]($img.Height * $ratio)
        $thumb = New-Object System.Drawing.Bitmap($newW, $newH)
        $g = [System.Drawing.Graphics]::FromImage($thumb)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($img, 0, 0, $newW, $newH)
        if ($f.Extension -eq '.png') {
            $thumb.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        } else {
            $thumb.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
        }
        $g.Dispose()
        $thumb.Dispose()
        $img.Dispose()
        Write-Host "  [done] $($f.Name)  $newW x $newH" -ForegroundColor Green
    } catch {
        Write-Host "  [fail] $($f.Name): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done. Thumbnails at $thumbDir" -ForegroundColor Cyan
