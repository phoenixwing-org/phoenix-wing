param(
    [Parameter(Mandatory = $true)]
    [string]$ConsumerParent
)

$parent = (Resolve-Path -LiteralPath $ConsumerParent -ErrorAction Stop).Path
$target = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$link = Join-Path $parent 'phoenix-wing'
if (Test-Path -LiteralPath $link) {
    throw 'The phoenix-wing path already exists. Verify it manually; this script never replaces it.'
}
New-Item -ItemType Junction -Path $link -Target $target -ErrorAction Stop
