# Markdown Export

This is a plugin for TiddlyWiki that lets you export tiddlers to Markdown.

Read more and install from here: https://cdaven.github.io/tiddlywiki/

## Bugs and Feature Requests

You are welcome to create [issues](https://github.com/cdaven/tiddlywiki-stuff/issues) or [pull requests](https://github.com/cdaven/tiddlywiki-stuff/pulls) in this repo.

## Building

When done updating markdown-export.ts, run `make.ps1` (Windows only).

To rebuild plugin in browser, e.g. with updates to the "readme" tiddler, run `$tw.utils.repackPlugin("$:/plugins/cdaven/markdown-export")`.

## Changelog

### 0.1.13

* Inserts LaTeX-style page breaks between each rendered tiddler
* Adds a comment/note at the top of the file, that by default says "Exported from TiddlyWiki at \<\<now\>\>"
* Doesn't render empty `tags: []` in the front matter
