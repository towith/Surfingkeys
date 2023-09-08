$snippets = (get-content -Encoding UTF8 D:\z_wd\bov.stock\helperWin\my\tools\surfingkeys.setting.js) -replace '`', '\`' -replace '\$', '\$'
$path = "${PSScriptRoot}/../content_scripts/surfingkeys.setting.gen.js"
if (Test-Path $path)
{
    Remove-Item $path
}
Add-Content -Encoding UTF8 -Path  $path @"
module.exports = {
    showAdvanced: true,
    snippets: ``
api.mapkey('oo', 'open new tab', function () {
    api.RUNTIME("openLink", {
            tab: {
                    tabbed: true,
                    active: true
                },
            url: "chrome-extension://aajlcoiaogpknhgninhopncaldipjdnp/pages/start.html"
        });
});
$( $snippets|Out-String )
``
};
"@
