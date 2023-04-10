#!/usr/bin/env python3

"""
This script splits exported tiddlers.md into multiple Markdown files in a "tiddlers" folder.

Usage: python split-tiddlers.py
"""

# The name of the multiple tiddlers Markdown file
in_file = 'tiddlers.md'

# The name of the folder where the output is stored
out_folder = 'tiddlers'

import os
import re

# Regular expression to find the "title" field in the YAML front matter
rx_title = re.compile('title: [\'"](.+)[\'"]', re.IGNORECASE | re.MULTILINE)

# Regular expression for characters that are illegal or unwise to use in file names
rx_illegal_file_chars = re.compile("[\[\]#<>:*?|^/\"\\\t\r\n]")

# Regular expression for illegal or unwise chars at the beginning or end of file names
rx_strip = re.compile("(^[\.\s]+|[\s\.]+$)")

# Regular expression for double spaces that are the result of replacing multiple illegal characters with spaces
rx_double_spaces = re.compile(" +")

def clean_filename(title):
    return rx_strip.sub("", rx_double_spaces.sub(" ", rx_illegal_file_chars.sub(" ", title)))

# Create folder
os.makedirs(out_folder, exist_ok=True)

for file in open(in_file, 'r').read().split('\\newpage'):
    titleMatch = rx_title.search(file)
    if titleMatch:
        fileTitle = clean_filename(titleMatch.group(1))
    else:
        raise ValueError('Cannot find title for one of the tiddlers')

    with open(os.path.join(out_folder, fileTitle) + '.md', 'w') as outfile:
        outfile.write(file.strip())
        outfile.close()
