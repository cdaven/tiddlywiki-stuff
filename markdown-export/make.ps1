param(
    $version
)

$TW_SINGLE_FILE = "..\..\cdaven.github.io\tiddlywiki\index.html"
$TW_NODE_DIR = "TW5"
$PLUGIN_DIR = "$TW_NODE_DIR\plugins\markdown-export"

# Compile Typescript
npx tsc

# Split TiddlyWiki HTML file to directory
npx tiddlywiki --load $TW_SINGLE_FILE --savewikifolder $TW_NODE_DIR
if (!($?)) {
    Exit
}

# Make sure plugin directory exists
New-Item -ItemType Directory -Force -Path $PLUGIN_DIR

# Update plugin metadata
if ($version) {
    $pluginInfo = Get-Content plugin.info | Out-String | ConvertFrom-Json
    $pluginInfo.version = $version
    $pluginInfo | ConvertTo-Json | Out-File plugin.info
}
Copy-Item plugin.info "$PLUGIN_DIR\"

# Update Javascript tiddlers
Move-Item .\markdown-export.js "$PLUGIN_DIR\"
Move-Item .\md-tiddler.js "$PLUGIN_DIR\"
Move-Item .\render.js "$PLUGIN_DIR\"
Move-Item .\render-helpers.js "$PLUGIN_DIR\"
Move-Item .\render-rules.js "$PLUGIN_DIR\"

# Update content tiddlers
Copy-Item *.tid "$PLUGIN_DIR\"

# Generate plugin JSON file
npx tiddlywiki $TW_NODE_DIR --output . --render '$:/plugins/cdaven/markdown-export' '[encodeuricomponent[]addsuffix[.json]]' 'application/json' '$:/core/templates/json-tiddler'
if ($?) {
    Move-Item -Force '%24%3A%2Fplugins%2Fcdaven%2Fmarkdown-export.json' '$__plugins_cdaven_markdown-export.json'
}

# Build single HTML file again
npx tiddlywiki $TW_NODE_DIR --output . --render '$:/core/save/all' "$TW_NODE_DIR.html" 'text/plain'
if ($?) {
    # Restore single-file wiki
    Move-Item -Force "$TW_NODE_DIR.html" $TW_SINGLE_FILE

    # Remove TiddlyWiki directory
    Remove-Item -Force -Recurse $TW_NODE_DIR
}
