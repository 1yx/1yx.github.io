#!/usr/bin/env bash
# Check for smart/curly quotes (U+201C U+201D U+2018 U+2019) in JSX attribute positions in .mdx files.
# Smart quotes in text content are allowed; only quotes inside <... tag="..."> attributes are flagged.

set -euo pipefail

staged_mdx=$(git diff --cached --name-only --diff-filter=ACM -- '*.mdx')

if [ -z "$staged_mdx" ]; then
  exit 0
fi

failed=0

for file in $staged_mdx; do
  # Find lines with JSX tags that contain smart quotes in attribute values
  # Pattern: inside <tag ...attr=SMARTQUOTE...SMARTQUOTE>, detect smart quotes
  matches=$(python3 -c "
import re, sys

with open('$file', 'r') as f:
    lines = f.readlines()

errors = []
for i, line in enumerate(lines, 1):
    # Find all JSX tag regions: from '<' to matching '>'
    for m in re.finditer(r'<[a-zA-Z][^>]*>', line):
        tag_content = m.group(0)
        # Check for smart quotes inside attribute values
        if '\u201c' in tag_content or '\u201d' in tag_content or '\u2018' in tag_content or '\u2019' in tag_content:
            col = m.start() + 1
            errors.append(f'  Line {i}, col {col}: {tag_content[:80]}')

if errors:
    for e in errors:
        print(e)
    sys.exit(1)
" 2>&1)

  if [ $? -ne 0 ]; then
    echo "ERROR: Smart quotes in JSX attributes in $file"
    echo "$matches"
    echo "  Fix: Replace curly quotes (\" \") with straight quotes (\") in attribute values"
    failed=1
  fi
done

exit $failed
