# Markdown Export

This is a plugin for TiddlyWiki that lets you export tiddlers to Markdown.

Read more and install from here: https://cdaven.github.io/tiddlywiki/

## Bugs and Feature Requests

You are welcome to create [issues](https://github.com/cdaven/tiddlywiki-stuff/issues) or [pull requests](https://github.com/cdaven/tiddlywiki-stuff/pulls) in this repo.

## Building

This build process requires Powershell and npm. You should probably install Typescript and TiddlyWiki locally:

```
npm install typescript tiddlywiki
```

For Linux and macOS builds, see [Install PowerShell on Windows, Linux and macOS](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell).

When done updating Typescript files, run `make.ps1`.

Also, make sure that Typescript preserves comments, and that it doesn't add "use strict" at the top of every Javascript file.

Recommended tsconfig.json:

```json
{
    "compilerOptions": {
        "target": "es2015",
        "module": "commonjs",
        "noImplicitAny": true,
        "strict": false,
        "alwaysStrict": false,
        "noImplicitUseStrict": true,
        "ignoreDeprecations": "5.0",
        "removeComments": false,
        "sourceMap": false,
        "outDir": "dist"
    },
    "exclude": [
        "node_modules",
        "../node_modules"
    ]
}
```

## Changelog

### 0.6.1 (2024-06-12)

* Added build support on non-Windows machines.

### 0.6.0 (2024-05-04)

* Added toolbar button with dropdown for copy, edit, download

The plugin now requires TiddlyWiki 5.3.0 or newer.

### 0.5.0 (2023-02-07)

* Use "==" for highlighted text, compatible with Pandoc 3.0
* Workaround for some nodeType bug (in TiddlyWiki?)

### 0.4.0 (2022-11-13)

* Render all custom fields as YAML properties in the front matter
* Fix bug where tags were rendered as `tags: ['TestData,Tag2,Another Tag']` instead of `tags: ['TestData', 'Tag2', 'Another Tag']`
* Fix miscellaneous problems with rendering of nested lists
* Render FontAwesome icons as � instead of nothing

### 0.3.0 (2022-06-07)

* Enable export from `render` command via template
* Fix bug where `currentTiddler` wasn't set

### 0.2.0 (2022-06-03)

* Pass-through arbitrary HTML into Markdown

### 0.1.13 (2022-06-02)

* Inserts LaTeX-style page breaks between each rendered tiddler
* Adds a comment/note at the top of the file, that by default says "Exported from TiddlyWiki at \<\<now\>\>"
* Doesn't render empty `tags: []` in the front matter
