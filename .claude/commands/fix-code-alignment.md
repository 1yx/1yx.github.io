# Fix Code Block Alignment in MDX Files

Scan all blog MDX files and fix alignment issues in ASCII-art diagrams within code blocks.

## Context

This blog uses **Maple Mono** (and Maple Mono NF CN for CJK) as the monospace code font. CJK characters render at **2:1 width** relative to ASCII (each CJK glyph occupies 2 monospace columns). This makes alignment in mixed-language code blocks tricky — a diagram that looks aligned in a Latin-only context breaks when CJK characters are present.

## Discovery: Find Misaligned Code Blocks

1. Scan all `.mdx` files under `src/data/blog/` (both `en/` and `zh-CN/`)
2. For each file, find all fenced code blocks (between ``` markers)
3. Within each code block, detect **alignment markers** — patterns where lines share a common separator character that should be vertically aligned. Common markers:
   - `—` (em dash, used as label separator in diagrams)
   - `│` (vertical line, used in tree/flow diagrams)
   - `├`, `└` (tree branches)
   - `─` (horizontal lines)
4. For each group of consecutive lines using the same separator, check if the separator appears at the same **visual column** on every line
5. If not, flag the code block as misaligned

### Visual Column Calculation

To compute the visual column of a character, sum the widths of all characters before it:

- **ASCII** (U+0000–U+007F): 1 column
- **Box-drawing** (U+2500–U+257F): 1 column
- **Block elements** (U+2580–U+259F): 1 column
- **CJK Unified Ideographs** (U+4E00–U+9FFF): 2 columns
- **CJK punctuation** (U+3000–U+303F): 2 columns (except U+3000 IDEOGRAPHIC SPACE which is 2)
- **Fullwidth forms** (U+FF00–U+FFEF): 2 columns
- **Hiragana/Katakana** (U+3040–U+30FF): 2 columns
- **Em dash** (U+2014): 1 column (Maple Mono renders this as narrow in code context)
- **Other Unicode**: default to 1 column unless East Asian Width is "W" or "F"

Use `unicode` or `wcwidth` Python library if available, otherwise the above rules cover 99% of cases in this blog.

### Alignment Pattern Detection

Focus on two common patterns:

**Pattern A: Separator alignment** (like `—` in standardization gap diagram)
```
Label1         — Description1
Label2-shorter — Description2
```
The `—` on all lines must be at the same visual column.

**Pattern B: Box-drawing connector alignment** (like `│`, `├`, `└` in tree diagrams)
```
├── branch1
│   └── leaf
└── branch2
```
Connectors that should line up vertically must be at the same visual column.

## Fix: Align the Diagram

For each misaligned code block:

1. **Identify the separator character** and the group of lines that should share alignment
2. **Find the target column**: the maximum visual column where the separator appears across all lines in the group
3. **Pad each shorter line**: insert spaces before the separator to push it to the target column
4. **Preserve everything else**: don't change any content, only add/remove spaces before the separator

### Fix Rules

- Only modify spacing (spaces) — never change content characters
- Only modify lines within the same code block (never cross ``` boundaries)
- When both EN and zh-CN versions of the same post exist, fix BOTH
- After fixing, verify the fix by recalculating visual columns

## Execution

Run the following Python script to detect and fix issues:

```python
#!/usr/bin/env python3
"""Detect and fix alignment in code blocks within MDX files."""
import re, glob, unicodedata

def char_width(c):
    """Return visual column width of a character in Maple Mono."""
    cp = ord(c)
    # CJK ranges (2 columns)
    if 0x4E00 <= cp <= 0x9FFF: return 2  # CJK Unified Ideographs
    if 0x3000 <= cp <= 0x303F: return 2  # CJK Symbols and Punctuation
    if 0x3040 <= cp <= 0x30FF: return 2  # Hiragana + Katakana
    if 0xFF00 <= cp <= 0xFFEF: return 2  # Fullwidth Forms
    if 0x3400 <= cp <= 0x4DBF: return 2  # CJK Extension A
    if 0x2E80 <= cp <= 0x2FDF: return 2  # CJK Radicals
    if 0xF900 <= cp <= 0xFAFF: return 2  # CJK Compatibility Ideographs
    # Everything else: 1 column
    return 1

def visual_len(s):
    """Return visual column width of a string."""
    return sum(char_width(c) for c in s)

def find_separator_col(line, sep):
    """Find the visual column where `sep` first appears in line."""
    idx = line.find(sep)
    if idx == -1:
        return -1
    return visual_len(line[:idx])

def fix_block(lines):
    """Fix separator alignment in a code block. Returns (fixed_lines, changed)."""
    # Try common separators in priority order
    separators = ['—', '│']
    changed = False

    for sep in separators:
        # Find lines containing this separator
        sep_lines = [(i, l) for i, l in enumerate(lines) if sep in l]
        if len(sep_lines) < 2:
            continue

        # Check if all separator positions are the same
        cols = [(i, find_separator_col(l, sep)) for i, l in sep_lines]
        target = max(col for _, col in cols)

        for line_idx, current_col in cols:
            if current_col < target:
                old_line = lines[line_idx]
                idx = old_line.find(sep)
                # Calculate how many spaces to add
                current_visual = visual_len(old_line[:idx])
                spaces_needed = target - current_visual
                lines[line_idx] = old_line[:idx] + ' ' * spaces_needed + old_line[idx:]
                changed = True

    return lines, changed

def process_file(filepath):
    """Process an MDX file, fixing alignment in all code blocks."""
    with open(filepath, 'r') as f:
        content = f.read()

    # Find all fenced code blocks
    parts = re.split(r'(```[^\n]*\n)', content)
    result = []
    any_changed = False
    in_code = False
    block_lines = []
    block_start = 0

    for part in parts:
        if part.startswith('```') and not in_code:
            in_code = True
            result.append(part)
            block_lines = []
        elif part.startswith('```') and in_code:
            # End of code block — fix alignment
            fixed, changed = fix_block(block_lines)
            if changed:
                any_changed = True
            result.append(''.join(fixed))
            result.append(part)
            in_code = False
        elif in_code:
            block_lines.append(part)
        else:
            result.append(part)

    if any_changed:
        with open(filepath, 'w') as f:
            f.write(''.join(result))
        return True
    return False

# Process all MDX files
files = glob.glob('src/data/blog/**/*.mdx', recursive=True)
fixed_count = 0
for fp in sorted(files):
    if process_file(fp):
        print(f'Fixed: {fp}')
        fixed_count += 1

if fixed_count == 0:
    print('All code blocks are properly aligned.')
else:
    print(f'\nFixed {fixed_count} file(s).')
```

## Arguments

If the user provides a specific file path as an argument, only scan that file. Otherwise scan all MDX files under `src/data/blog/`.

## Output

Report which files were fixed and what was changed. If nothing was misaligned, confirm that all code blocks are properly aligned.
