Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path $PSScriptRoot '../public/icons'
[System.IO.Directory]::CreateDirectory($iconDirectory) | Out-Null
foreach ($icon in @(@{Size=180;Name='apple-touch-icon.png'}, @{Size=192;Name='icon-192.png'}, @{Size=512;Name='icon-512.png'}, @{Size=512;Name='icon-maskable-512.png'})) {
  $bitmap = [System.Drawing.Bitmap]::new($icon.Size, $icon.Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#1d3729'))
  $graphics.ScaleTransform($icon.Size / 512.0, $icon.Size / 512.0)
  $pen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#e9eddf'), 18)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.DrawLine($pen, 166, 350, 346, 350)
  $graphics.DrawLine($pen, 246, 239, 322, 315)
  $graphics.DrawPolygon($pen, [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(198, 250), [System.Drawing.PointF]::new(174, 226),
    [System.Drawing.PointF]::new(257, 143), [System.Drawing.PointF]::new(281, 167)
  ))
  $graphics.DrawLine($pen, 164, 214, 210, 260)
  $graphics.DrawLine($pen, 248, 132, 292, 176)
  $bitmap.Save((Join-Path $iconDirectory $icon.Name), [System.Drawing.Imaging.ImageFormat]::Png)
  $pen.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
Write-Output 'Generated four Auction Pro app icons.'
