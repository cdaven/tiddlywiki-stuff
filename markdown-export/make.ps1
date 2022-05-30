param(
    $version
)

$TW_SINGLE_FILE = "..\..\cdaven.github.io\tiddlywiki\index.html"
$TW_NODE_DIR = "tw"

# Compile Typescript
npx tsc

# Split TiddlyWiki HTML file to directory
tiddlywiki --load $TW_SINGLE_FILE --savewikifolder $TW_NODE_DIR
if (!($?)) {
    Exit
}

# Update Javascript tiddler
Copy-Item .\markdown-export.js "$TW_NODE_DIR\plugins\markdown-export\`$__plugins_cdaven_markdown-export_markdown-export.js"

# Update plugin metadata
$PLUGIN_INFO_FILE = "$TW_NODE_DIR\plugins\markdown-export\plugin.info"
$pluginInfo = Get-Content $PLUGIN_INFO_FILE | Out-String | ConvertFrom-Json
$pluginInfo.modified = Get-Date -Format "yyyyMMddHHmmssfff"
if ($version) {
    $pluginInfo.version = $version
}
$pluginInfo | ConvertTo-Json | Out-File $PLUGIN_INFO_FILE

# Generate plugin JSON file
tiddlywiki $TW_NODE_DIR --output . --render '$:/plugins/cdaven/markdown-export' '[encodeuricomponent[]addsuffix[.json]]' 'application/json' '$:/core/templates/json-tiddler'
if ($?) {
    Move-Item -Force '%24%3A%2Fplugins%2Fcdaven%2Fmarkdown-export.json' '$__plugins_cdaven_markdown-export.json'
}

# Build single HTML file again
tiddlywiki $TW_NODE_DIR --output . --render '$:/core/save/all' "$TW_NODE_DIR.html" 'text/plain'
if ($?) {
    Move-Item -Force "$TW_NODE_DIR.html" $TW_SINGLE_FILE
}

# Remove TiddlyWiki directory
Remove-Item -Force -Recurse $TW_NODE_DIR
