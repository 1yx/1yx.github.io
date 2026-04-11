---
name: uncommit-review
description: Run code-reviewer and typescript-reviewer agents in parallel to review all uncommitted changes (staged + unstaged), with OpenSpec integration for multi-round tracking.
user-invocable: true
---

Run both code-reviewer and typescript-reviewer sub-agents **in parallel** against all **uncommitted changes** (staged + unstaged), with results synced to the current OpenSpec change.

## Workflow

### Phase 1: Detect Current OpenSpec Change

First, determine which change is currently in progress:

```bash
# Method 1: Check git status for modified files and match to changes
# Method 2: Look for changes with status = "in-progress"
# Method 3: Ask user if ambiguous
```

Look for:
- `openspec/changes/*/.openspec.yaml` with `status: in-progress`
- Modified files that correspond to a specific change's tasks

If no in-progress change found, proceed with review but warn user to create/track a change.

### Phase 2: Check for Previous Review Round

Read the current change's `tasks.md` and check for existing review sections:

```markdown
## Review History

### Round 1 (2026-04-03 10:15)
**Status**: PENDING_FIX

| # | Severity | File | Issue | Fixed |
|---|----------|------|-------|-------|
| 1 | HIGH | Base.astro | Inline styles | [ ] |
| 2 | MEDIUM | index.astro | Hardcoded redirect | [ ] |
```

**If previous round has PENDING_FIX status:**
1. Check git diff to see if issues were addressed
2. If NOT fixed, INTERRUPT and prompt user:
   > "Review Round N has pending fixes. Please address them before starting Round N+1."
   > "To bypass and start a new round anyway, confirm: --force-new-round"
3. If fixed (or --force-new-round), proceed to Round N+1

### Phase 3: Run Review Agents

Launch both agents concurrently:

- **Agent 1**: `subagent_type: code-reviewer` - quality, security, maintainability
- **Agent 2**: `subagent_type: typescript-reviewer` - type safety, async, idiomatic patterns

### Phase 4: Synthesize and Sync Results

1. Consolidate findings by severity (CRITICAL → HIGH → MEDIUM → LOW)
2. Assign issue numbers for tracking
3. **Update tasks.md** with new review section:

```markdown
## Review History

### Round {N} ({timestamp})
**Status**: PENDING_FIX

| # | Severity | File | Issue | Task Ref | Fixed |
|---|----------|------|-------|----------|-------|
| 1 | HIGH | Base.astro | Inline styles violate UnoCSS convention | R{N}-1 | [ ] |
| 2 | HIGH | index.astro | Hardcoded /en/ redirect | R{N}-2 | [ ] |
| 3 | MEDIUM | index.astro | Unused imports | R{N}-3 | [ ] |

#### Detailed Findings

**R{N}-1 [HIGH] Inline styles in Base.astro**
- **Issue**: Uses inline `style` attributes instead of UnoCSS
- **Location**: lines 17-25
- **Fix**: Use scoped `<style>` or UnoCSS utilities

[... more findings ...]
```

4. **Add verification tasks** to the main tasks list:

```markdown
## 4. Review Fixes (Round {N})

- [ ] R{N}-1: Fix inline styles in Base.astro
- [ ] R{N}-2: Use DEFAULT_LOCALE constant in redirect
- [ ] R{N}-3: Remove unused imports from index.astro
```

### Phase 5: Present Summary

```
## Uncommit Review Summary — Round {N}

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | N     | block  |
| HIGH     | N     | warn   |
| MEDIUM   | N     | info   |
| LOW      | N     | note   |

Current Change: {change-name}
Review synced to: openspec/changes/{change-name}/tasks.md

Verdict: APPROVE / WARNING / BLOCK
```

## Implementation Notes

**Round Detection:**
- Parse existing Review History sections in tasks.md
- Count existing rounds, increment for new round
- Check status of last round before proceeding

**Issue Numbering:**
- Format: `R{round}-{seq}` (e.g., R1-1, R1-2, R2-1)
- Sequential within each round
- Referenced in both review table and fix tasks

**Status Values:**
- `PENDING_FIX`: Issues found, awaiting resolution
- `VERIFIED`: All issues from this round confirmed fixed
- `SUPERSEDED`: Newer round started, this round obsolete

**Force New Round:**
If user wants to start fresh despite pending fixes:
```
/uncommit-review --force-new-round
```

## Severity Levels & Strict Mode

**Strict Mode**: ALL severity levels (CRITICAL, HIGH, MEDIUM, LOW) must be tracked in tasks.md. No exceptions.

- **CRITICAL**: Security vulnerabilities, broken functionality, data loss risks
- **HIGH**: Blocking issues that should be fixed before merge
- **MEDIUM**: Significant improvements needed, but not blocking
- **LOW**: Minor issues, optimizations, polish items, future-proofing

Every finding from the reviewers must be assigned a Task Ref and appear in:
1. The Review History table
2. The Detailed Findings section
3. The Fix Tasks checklist

## Important Rules

1. **Strict Mode**: Always sync ALL severity levels (CRITICAL → LOW) to tasks.md
2. Never overwrite previous rounds - append new sections
3. Require explicit force flag to start new round with pending fixes
4. Link review findings to fix tasks with consistent IDs
5. Run both agents in parallel - never sequentially
6. Never filter out LOW severity issues - they represent polish and completeness
