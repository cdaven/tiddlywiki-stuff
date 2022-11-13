# Markdown Export

This is a plugin for TiddlyWiki that lets you export tiddlers to Markdown.

Read more and install from here: https://cdaven.github.io/tiddlywiki/

## Bugs and Feature Requests

You are welcome to create [issues](https://github.com/cdaven/tiddlywiki-stuff/issues) or [pull requests](https://github.com/cdaven/tiddlywiki-stuff/pulls) in this repo.

## Building

When done updating Typescript files, run `make.ps1` (Windows only).

This build process requires Powershell and npm. You should probably install Typescript and TiddlyWiki locally:

```
npm install typescript tiddlywiki
```

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
        "removeComments": false,
        "sourceMap": false
    },
    "exclude": [
        "node_modules"
    ]
}
```

## Changelog

### 0.3.0 (2022-06-07)

* Enable export from `render` command via template
* Fix bug where `currentTiddler` wasn't set

### 0.2.0 (2022-06-03)

* Pass-through arbitrary HTML into Markdown

### 0.1.13 (2022-06-02)

* Inserts LaTeX-style page breaks between each rendered tiddler
* Adds a comment/note at the top of the file, that by default says "Exported from TiddlyWiki at \<\<now\>\>"
* Doesn't render empty `tags: []` in the front matter
