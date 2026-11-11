param(
    [Parameter(Mandatory)][string]$IconPath,
    [string]$Executable
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function New-Frame([int]$Size) {
    $bitmap = [Drawing.Bitmap]::new($Size, $Size, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $canvas = [Drawing.Graphics]::FromImage($bitmap)
    $stream = [IO.MemoryStream]::new()
    $tile = [Drawing.Drawing2D.GraphicsPath]::new()
    $shield = [Drawing.Drawing2D.GraphicsPath]::new()
    $navy = [Drawing.Color]::FromArgb(12, 23, 46)
    $teal = [Drawing.Color]::FromArgb(46, 211, 201)
    $mint = [Drawing.Color]::FromArgb(191, 255, 169)
    $bounds = [Drawing.RectangleF]::new(0, 0, 256, 256)
    $background = [Drawing.Drawing2D.LinearGradientBrush]::new($bounds, [Drawing.Color]::FromArgb(30, 58, 89), $navy, [single]45)
    $foreground = [Drawing.Drawing2D.LinearGradientBrush]::new($bounds, $mint, $teal, [single]65)
    $darkFill = [Drawing.SolidBrush]::new($navy)
    $lockPen = [Drawing.Pen]::new($navy, 12)
    $trace = [Drawing.Pen]::new([Drawing.Color]::FromArgb(140, 92, 204, 215), 3)
    try {
        $canvas.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $canvas.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $scale = [single]($Size / 256.0)
        $canvas.ScaleTransform($scale, $scale)

        $tile.AddArc(4, 4, 64, 64, 180, 90)
        $tile.AddArc(188, 4, 64, 64, 270, 90)
        $tile.AddArc(188, 188, 64, 64, 0, 90)
        $tile.AddArc(4, 188, 64, 64, 90, 90)
        $tile.CloseFigure()
        $canvas.FillPath($background, $tile)

        if ($Size -ge 48) {
            $canvas.DrawLines($trace, [Drawing.PointF[]]@(
                [Drawing.PointF]::new(24, 85), [Drawing.PointF]::new(24, 50),
                [Drawing.PointF]::new(46, 29), [Drawing.PointF]::new(82, 29)))
            $canvas.DrawLines($trace, [Drawing.PointF[]]@(
                [Drawing.PointF]::new(232, 170), [Drawing.PointF]::new(232, 205),
                [Drawing.PointF]::new(210, 227), [Drawing.PointF]::new(174, 227)))
            $canvas.DrawEllipse($trace, 79, 25, 8, 8)
            $canvas.DrawEllipse($trace, 167, 223, 8, 8)
        }

        $shield.AddLine(128, 30, 207, 60)
        $shield.AddLine(207, 60, 207, 117)
        $shield.AddBezier(207, 117, 207, 171, 165, 207, 128, 229)
        $shield.AddBezier(128, 229, 91, 207, 49, 171, 49, 117)
        $shield.AddLine(49, 117, 49, 60)
        $shield.CloseFigure()
        $canvas.FillPath($foreground, $shield)

        $canvas.DrawArc($lockPen, 101, 82, 54, 63, 180, 180)
        $canvas.DrawLine($lockPen, 101, 112, 101, 130)
        $canvas.DrawLine($lockPen, 155, 112, 155, 130)
        $canvas.FillRectangle($darkFill, 86, 119, 84, 55)
        $canvas.FillEllipse($foreground, 120, 134, 16, 16)
        $canvas.FillRectangle($foreground, 125, 147, 6, 12)

        $bitmap.Save($stream, [Drawing.Imaging.ImageFormat]::Png)
        return ,$stream.ToArray()
    } finally {
        foreach ($item in $trace, $lockPen, $darkFill, $foreground, $background, $shield, $tile, $stream, $canvas, $bitmap) {
            $item.Dispose()
        }
    }
}

$sizes = @(16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 60, 64, 72, 80, 96, 108, 120, 128, 144, 160, 192, 224, 256)
$frames = [Collections.Generic.List[byte[]]]::new()
foreach ($size in $sizes) { $frames.Add((New-Frame $size)) }

$iconFile = [IO.File]::Create($IconPath)
$writer = [IO.BinaryWriter]::new($iconFile)
try {
    $writer.Write([uint16]0)
    $writer.Write([uint16]1)
    $writer.Write([uint16]$sizes.Count)
    $offset = 6 + 16 * $sizes.Count
    for ($index = 0; $index -lt $sizes.Count; $index++) {
        $dimension = [byte]($sizes[$index] % 256)
        $writer.Write($dimension)
        $writer.Write($dimension)
        $writer.Write([byte]0)
        $writer.Write([byte]0)
        $writer.Write([uint16]1)
        $writer.Write([uint16]32)
        $writer.Write([uint32]$frames[$index].Length)
        $writer.Write([uint32]$offset)
        $offset += $frames[$index].Length
    }
    foreach ($frame in $frames) { $writer.Write($frame) }
} finally {
    $writer.Dispose()
}

if ($Executable) {
    Add-Type -Path (Join-Path $PSScriptRoot 'WindowsIconResource.cs')
    [WindowsIconResource]::Replace($Executable, $IconPath)
    if (Compare-Object $sizes ([WindowsIconResource]::GetSizes($Executable))) {
        throw 'The executable icon is missing one or more resolutions.'
    }
}
