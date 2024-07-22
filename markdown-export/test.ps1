#!/usr/bin/env pwsh

$TW_SINGLE_FILE = Join-Path "..\tiddlywiki" -ChildPath "index.html"
$TW_NODE_DIR = "TW5.Test"

Write-Host "Loading TiddlyWiki ..."
npx tiddlywiki --load $TW_SINGLE_FILE --savewikifolder $TW_NODE_DIR
if (!($?)) {
    Exit 9
}

function RemoveFrontMatter()
{
    param ($Markdown)
    return ($Markdown -Split "^---[\r\n]", 3, "multiline")[2];
}

function GetFrontMatter()
{
    param ($Markdown)
    $string = ($Markdown -Split "^---[\r\n]", 3, "multiline")[1]
    return $string.Trim();
}

function TrimNewlines()
{
    param ($String)
    return $String -Replace "^`n+","" -Replace "`n+$",""
}

function NormalizeNewlines()
{
    param ($String)
    return $String -Replace "`r`n","`n"
}

function CompareMarkdown()
{
    param ($Actual, $Expected)
    $_act = TrimNewlines(NormalizeNewlines($Actual))
    $_exp = TrimNewlines(NormalizeNewlines($Expected))
    return $_act -ceq $_exp;
}

function TestExport()
{
    param ($TwPage, $Expected, $Scope = "body")

    $mdFile = $TwPage -replace "/", "_"

    npx tiddlywiki $TW_NODE_DIR --output . --render "$TwPage" "$mdFile.md" 'text/plain' '$:/plugins/cdaven/markdown-export/md-tiddler'

    if ($Scope -eq "frontmatter") {
        $actual = $actual = GetFrontMatter(Get-Content "$mdFile.md" | Out-String)
    }
    else {
        $actual = RemoveFrontMatter(Get-Content "$mdFile.md" | Out-String)
    }
    
    if (CompareMarkdown -Actual $actual -Expected $expected) {
        $originalColor = $host.ui.RawUI.ForegroundColor
        $host.ui.RawUI.ForegroundColor = "DarkGreen"
        Write-Host "[[$TwPage]] ok";
        $host.ui.RawUI.ForegroundColor = $originalColor
    }
    else {
        $originalColor = $host.ui.RawUI.ForegroundColor
        $host.ui.RawUI.ForegroundColor = "DarkRed"
        Write-Host "[[$TwPage]] failed!"
        $host.ui.RawUI.ForegroundColor = $originalColor
        
        # Write-Host "--- Expected:"
        # Write-Host $expected
        # Write-Host "--- Actual:"
        # Write-Host $actual
        # Write-Host "---"

        Write-Host "Saving actual and expected data to files"
        $actual | Out-File "$mdFile.actual.md"
        $expected | Out-File "$mdFile.expected.md"
    }

    Remove-Item "$mdFile.md"
}


# -------------------------------------------------------------------------
$foo = @'
Hello

'@

$bar = @'

World
'@

if (CompareMarkdown -Expected $foo -Actual $bar) {
    $originalColor = $host.ui.RawUI.ForegroundColor
    $host.ui.RawUI.ForegroundColor = "DarkRed"
    Write-Host "Sanity check failed"
    $host.ui.RawUI.ForegroundColor = $originalColor
}

# -------------------------------------------------------------------------

$expected = @'
title: 'TestPage/FrontMatter/FieldNames'
date: '2024-06-29T01:37:51.193Z'
tags: ['TestData', 'TestData/Fields']
created: '2024-06-28T22:42:41.002Z'
dir-ty-field: 'dir-ty-field'
CamelCaseField: 'CamelCaseField'
ALLCAPS: 'ALLCAPS'
really-dir-ty-<field>**`::`: 'really-dir-ty-<field>**`::`'
π: 'π'
dir-ty-field-lotsa-colons: 'dir-ty-field-lotsa-colons'
'@
TestExport -TwPage 'TestPage/FrontMatter/FieldNames' -Expected $expected -Scope "frontmatter"

$expected = @'
title: 'TestPage/FrontMatter/Dates'
date: '2024-06-29T02:10:13.612Z'
tags: ['TestData', 'TestData/Fields']
a-date: '2000-10-01'
a-datetime: '2000-10-01 13:30:00'
a-number: 2024
created: '2024-06-28T22:33:52.507Z'
custom-tw-date: '2024-01-01T00:00:00.000Z'
'@
TestExport -TwPage 'TestPage/FrontMatter/Dates' -Expected $expected -Scope "frontmatter"

$expected = @'
title: 'TestPage/FrontMatter/Strings'
date: '2024-06-29T02:50:24.871Z'
tags: ['TestData', 'TestData/Fields']
created: '2024-06-28T22:36:28.147Z'
custom-field: 'String with spaces'
dir-ty-field: '   3 spaces with string   '
string-with-quotes-around: '"Hello world"'
string-with-quotes-inside: 'Hello "world", how are you?'
string-with-single-around: "'Hello world'"
string-with-single-inside: "McDonald's"
string-with-yaml-chars: '>- this could be `problematic` [or not]'
utf8-example: 'π, café, Straße, 从'
'@
TestExport -TwPage 'TestPage/FrontMatter/Strings' -Expected $expected -Scope "frontmatter"

$expected = @'
title: 'TestPage/FrontMatter/Numbers'
date: '2024-06-29T02:37:19.623Z'
tags: ['TestData', 'TestData/Fields']
a-large-number: 3.14159265359e12
a-number: 1234
a-real-number: 3.14159265359
created: '2024-06-28T22:37:26.547Z'
'@
TestExport -TwPage 'TestPage/FrontMatter/Numbers' -Expected $expected -Scope "frontmatter"

$expected = @'
title: 'TestPage/FrontMatter/Tags'
date: '2024-06-29T00:10:31.866Z'
tags: ['TestData', 'TestData/Fields', 'Another Tag', 'Tag2', '2024', 'π', "Tag o'mine"]
created: '2024-06-28T22:39:21.848Z'
'@
TestExport -TwPage 'TestPage/FrontMatter/Tags' -Expected $expected -Scope "frontmatter"

$expected = @'
# TestPage/BasicFormatting

Lorem ipsum dolor sit amet, consectetur adipiscing elit. In maximus faucibus nulla, at finibus velit lobortis eget. Suspendisse eu tincidunt ipsum. Sed vehicula lorem elit, ut tempor ante dictum quis. Maecenas elementum finibus mi non faucibus.

## Bold

Lorem ipsum dolor sit amet, consectetur adipiscing elit. **In maximus faucibus nulla, at finibus velit lobortis eget.** Suspendisse eu tincidunt ipsum.

## Italic

Lorem ipsum dolor sit amet, consectetur adipiscing elit. *In maximus faucibus nulla, at finibus velit lobortis eget.* Suspendisse eu tincidunt ipsum.

## Bold+Italic

Lorem ipsum dolor sit amet, consectetur adipiscing elit. ***In maximus faucibus nulla, at finibus velit lobortis eget.*** Suspendisse eu tincidunt ipsum.

## Strikethrough

Lorem ipsum dolor sit amet, consectetur adipiscing elit. ~~In maximus faucibus nulla, at finibus velit lobortis eget.~~ Suspendisse eu tincidunt ipsum.

## Underline

(Supported in Markdown and Pandoc via raw HTML tags.)

Lorem ipsum dolor sit amet, consectetur adipiscing elit. <u>In maximus faucibus nulla, at finibus velit lobortis eget.</u> Suspendisse eu tincidunt ipsum.

## Sub and super

H~2~O is a liquid. 2^10^ is 1024.

Lorem ~ipsum\ dolor~ sit amet ^consectetur\ adipiscing\ elit^.
'@
TestExport -TwPage 'TestPage/BasicFormatting' -Expected $expected

$expected = @'
# TestPage/Headings

# h1

## h2

### h3

#### h4
'@
TestExport -TwPage 'TestPage/Headings' -Expected $expected

$expected = @'
# TestPage/Links

An internal link: Markdown Export Plugin. These are rendered as plain text, since the target of the link may or may not be present in the exported material.

An internal link with an alias: alias.

An external link: <https://tiddlywiki.com>.

An external link with an alias: [TiddlyWiki](https://tiddlywiki.com).

A CamelCase link and a CamelCase non-link.
'@
TestExport -TwPage 'TestPage/Links' -Expected $expected

$expected = @'
# TestPage/Lists

## Unordered

* First
* Second
* Third

## Ordered

1. First
1. Second
1. Third

## Mixed

1. 1-1
    * 2-1
    * 2-2
1. 1-2
    * 2-3
        * 3-1
        * 3-2
            1. 4-1
            1. 4-2

## With Quotes

WikiText seems to render blockquote-list-items wrong when they are not the first child of the ul/ol tag. So we stick to using quotes as the first child of a list:

* List Item 1 at Level 1
    * > A quote at level 2
    > 
    > The quote's next line
* List Item 2 at Level 1

## With Paragraphs

Must transclude tiddler with multiple paragraphs, since WikiText doesn't allow it.

* First entry
* Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed semper luctus suscipit. Suspendisse ac ultricies turpis. Maecenas tortor nisl, gravida id lacus sed, vestibulum lacinia urna.

    Vivamus volutpat sagittis libero elementum lacinia. Cras faucibus in mi quis feugiat. Nunc finibus vulputate ipsum, id ornare velit lobortis a.

    Phasellus venenatis ipsum a ligula imperdiet feugiat. Nulla scelerisque elit ipsum, eu ultricies metus placerat quis. Vivamus eget erat a leo porta consequat a id massa.
* Third entry
'@
TestExport -TwPage 'TestPage/Lists' -Expected $expected

$expected = @'
# TestPage/ToDo

* [x] Meet Gandalf
* [ ] Go on adventure
* [ ] Destroy ring
'@
TestExport -TwPage 'TestPage/ToDo' -Expected $expected

$expected = @'
# TestPage/Quotes

> Just a normal blockquote.

With a citation:

> Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas volutpat quis mauris eu tempor. Cras dapibus neque sed malesuada mollis. Nulla imperdiet, odio a accumsan congue, arcu leo dignissim justo, sit amet sollicitudin eros ipsum fermentum massa.
> 
> <cite>Ancient Latin Scholars</cite>

Multiple lines and a list:

> Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas volutpat quis mauris eu tempor. Cras dapibus neque sed malesuada mollis.
> 
> Nulla imperdiet, odio a accumsan congue, arcu leo dignissim justo, sit amet sollicitudin eros ipsum fermentum massa.
> 
> * Donec sem mi, ullamcorper vitae elit vel, consequat tempor mi.
> * Praesent pellentesque purus eget augue varius, vitae imperdiet nunc finibus.
> * Nullam a tempus dolor.

A poem with forced line breaks:

> Roses are red\
>   Violets are blue,\
> Sugar is sweet\
>   And so are you.
'@
TestExport -TwPage 'TestPage/Quotes' -Expected $expected

$expected = @'
# TestPage/Code

If you have the [Highlight plugin](https://tiddlywiki.com/plugins/tiddlywiki/highlight/) installed, the language of the code in the snippet will be included in the export as well. Otherwise, not.

```c
#include <stdio.h>

int main() {   
    int number;
   
    printf("Enter an integer: ");  
    
    // reads and stores input
    scanf("%d", &number);

    // displays output
    printf("You entered: %d", number);
    
    return 0;
}
```

Without language:

```
bash -x {{path/to/script.sh}}
```

And finally an `inline code` example.
'@
TestExport -TwPage 'TestPage/Code' -Expected $expected

$expected = @'
# TestPage/Definitions

Again, not in the common Markdown specification, but Pandoc understands it.

Term being defined
 ~ Definition of that term

Another term
 ~ Another definition
'@
TestExport -TwPage 'TestPage/Definitions' -Expected $expected

$expected = @'
# TestPage/Tables

Unfortunately, Markdown has a *very* limited table syntax. The first row must be a header, and you cannot use col-spacing or row-spacing or different alignment in different cells.

| Cell1 | Cell2 |
|-------|-------|
| Cell3 | Cell4 |

## Different cell sizes

| First column | Number two | Three |
|--------------|------------|-------|
| Some data    |     ...    | more! |
|          And |   another  | row   |

## Raw HTML

| Cell1 | Cell2 |
|-------|-------|
| Cell3 | Cell4 |
'@
TestExport -TwPage 'TestPage/Tables' -Expected $expected

$expected = @'
# TestPage/Images

Images are exported using the "data" protocol, which means they will be embedded in the Markdown (I have not tried this from a Node.js installation of TiddlyWiki, that probably works differently).

PNGs seem to work fine, at least in some Markdown renderers and Pandoc:

![](data:image/png;base64,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)

JPEGs seem to work fine as well.

![](data:image/jpeg;base64,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)

SVGs seem to work fine as well. Pandoc converts it via external tool `rsvg-convert`.

![Union Jack](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCAzMCIgd2lkdGg9IjEyMDAiIGhlaWdodD0iNjAwIj4KPGNsaXBQYXRoIGlkPSJ0Ij4KCTxwYXRoIGQ9Ik0zMCwxNSBoMzAgdjE1IHogdjE1IGgtMzAgeiBoLTMwIHYtMTUgeiB2LTE1IGgzMCB6Ii8+CjwvY2xpcFBhdGg+CjxwYXRoIGQ9Ik0wLDAgdjMwIGg2MCB2LTMwIHoiIGZpbGw9IiMwMDI0N2QiLz4KPHBhdGggZD0iTTAsMCBMNjAsMzAgTTYwLDAgTDAsMzAiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSI2Ii8+CjxwYXRoIGQ9Ik0wLDAgTDYwLDMwIE02MCwwIEwwLDMwIiBjbGlwLXBhdGg9InVybCgjdCkiIHN0cm9rZT0iI2NmMTQyYiIgc3Ryb2tlLXdpZHRoPSI0Ii8+CjxwYXRoIGQ9Ik0zMCwwIHYzMCBNMCwxNSBoNjAiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxMCIvPgo8cGF0aCBkPSJNMzAsMCB2MzAgTTAsMTUgaDYwIiBzdHJva2U9IiNjZjE0MmIiIHN0cm9rZS13aWR0aD0iNiIvPgo8L3N2Zz4K)

Hotlinking should work, as long as the image is available. Could be a security issue if you're paranoid.

![](https://imgs.xkcd.com/comics/standards.png)
'@
TestExport -TwPage 'TestPage/Images' -Expected $expected

$expected = @'
# TestPage/Misc

En-dash: –

Em-dash: —

Horizontal line/break:

---

I like ==marking stuff==, to make it easier to find later.

<details><summary>This should be open</summary>
Content will be immediately visible if open is set to "yes".</details>
'@
TestExport -TwPage 'TestPage/Misc' -Expected $expected

$expected = @'
# TestPage/FontAwesome

FontAwesome icons will be rendered as �. I would recommend using Unicode characters instead of icons in the text.

I would � some �!
'@
TestExport -TwPage 'TestPage/FontAwesome' -Expected $expected

$expected = @'
# TestPage/SelfReferencing

Referencing the current tiddler (TestPage/SelfReferencing) in various ways:

* TestPage/SelfReferencing

A short and sweet description
'@
TestExport -TwPage 'TestPage/SelfReferencing' -Expected $expected

$expected = @'
# TestPage/KaTeX

Rendering of this in both TiddlyWiki and the exported markup requires the [KaTeX plugin](https://tiddlywiki.com/plugins/tiddlywiki/katex/).

Note that Markdown doesn't support math by default, but in Pandoc and some other renderers it works.

$$
f(x) = \int_{-\infty}^\infty\hat f(\xi)\,e^{2 \pi i \xi x}\,d\xi
$$

This is an inline formula: $C = \alpha + \beta Y^{\gamma} + \epsilon$
'@
TestExport -TwPage 'TestPage/KaTeX' -Expected $expected

# -------------------------------------------------------------------------

# Remove TiddlyWiki directory
Remove-Item -Force -Recurse $TW_NODE_DIR
