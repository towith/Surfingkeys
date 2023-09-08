$snippets = (get-content -Encoding UTF8 D:\z_wd\bov.stock\helperWin\my\tools\surfingkeys.setting.js) -replace '`', '\`' -replace '\$', '\$'
$path = "../content_scripts/surfingkeys.setting.gen.js"
if (Test-Path $path)
{
    Remove-Item $path
}
Add-Content -Encoding UTF8 -Path  $path @"
module.exports = {
    showAdvanced: true,
    snippets: ``
$( $snippets|Out-String )
``
};
"@
