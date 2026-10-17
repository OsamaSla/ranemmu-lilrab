# Exports every slide of a .pptx to PNG at a fixed resolution using PowerPoint.
#   powershell -File scripts/tutorial/export_slides.ps1 -In <pptx> -Out <dir> [-Width 1920 -Height 1080]
param(
    [Parameter(Mandatory = $true)][string]$In,
    [Parameter(Mandatory = $true)][string]$Out,
    [int]$Width = 1920,
    [int]$Height = 1080
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $In)) { throw "not found: $In" }
New-Item -ItemType Directory -Force -Path $Out | Out-Null

$ppt = New-Object -ComObject PowerPoint.Application
try {
    $pres = $ppt.Presentations.Open($In, $true, $false, $false)
    # ppExport PNG -> "Slide1.PNG", "Slide2.PNG", ...
    $pres.Export($Out, 'PNG', $Width, $Height)
    $pres.Close()
}
finally {
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}
$n = (Get-ChildItem -LiteralPath $Out -Filter *.PNG).Count
Write-Host "exported $n slide(s) -> $Out"
