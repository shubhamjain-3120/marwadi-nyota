# Overnight Codebase Cleanup Agent

This file provides guidance to Claude Code when performing automated codebase cleanup and refactoring.

## Purpose
Overnight maintenance agent that improves code readability for LLMs while maintaining 100% functional parity. This is a SAFETY-FIRST operation - if something might break, skip it.

## Core Principles

1. **Zero Breaking Changes**: Everything must work exactly as before
2. **LLM Readability First**: Code should be easier for AI to understand and modify
3. **Low-Hanging Fruit Only**: Quick wins, not architectural rewrites
4. **Test Everything**: No change ships without verification

## Cleanup Strategy

### Phase 1: Analysis & Planning (15 min)

1. **Scan codebase** - inventory all files, note complexity
2. **Identify safe targets** - look for:
   - Dead code (unused imports, commented blocks, unreachable functions)
   - Obvious duplications (exact same logic in 2+ places)
   - Unclear variable names (data, temp, x, handleClick2)
   - Missing/outdated comments that confuse rather than help
   - Inconsistent formatting (mixing styles in same file)

3. **Create ordered checklist** - prioritize by safety:
   - **SAFE**: Remove unused imports, delete commented code
   - **SAFE**: Rename variables for clarity
   - **SAFE**: Add missing JSDoc/comments for complex logic
   - **MEDIUM**: Extract repeated code blocks (if < 10 lines)
   - **MEDIUM**: Core generation pipeline (OK if tests pass)
   - **SKIP**: Anything requiring new dependencies
   - **SKIP**: Large-scale reorganization

### Phase 2: Pre-Cleanup Testing (10 min)

Before touching ANY code:

```bash
# Frontend tests
cd frontend
npm run build                    # Must complete without errors
npm run dev &                    # Start dev server
# Manual check: open localhost:5173, verify home page loads

# Backend tests
cd backend
npm test || echo "No tests yet"  # Run if exists
npm run dev &                    # Start server
curl http://localhost:3001/health || echo "No health endpoint"
```

Create baseline test script (scripts/test-baseline.sh):

```bash
#!/bin/bash
set -e

echo "=== Testing Frontend Build ==="
cd frontend && npm run build && cd ..

echo "=== Testing Backend Startup ==="
cd backend && timeout 10s npm run dev &
sleep 5
PID=$!
kill $PID 2>/dev/null || true

echo "=== Baseline Tests Passed ==="
```

### Phase 3: Cleanup Execution (Iterative)

Work in small batches - one file or function at a time:

1. Make ONE type of change (e.g., only remove unused imports)
2. Run test script immediately
3. If tests pass → commit with clear message
4. If tests fail → revert, add to skip list, move on
5. Repeat

**Safe Changes:**

```javascript
// BEFORE (confusing)
const data = await fetch(url).then(r => r.json())
const x = data.map(d => d.name) // what is x?

// AFTER (clear)
const apiResponse = await fetch(url).then(r => r.json())
const userNames = apiResponse.map(user => user.name)
```

```javascript
// BEFORE (dead code)
import { useState, useEffect, useMemo } from 'react' // only uses useState
// const oldFunction = () => {} // TODO: remove this

// AFTER (clean)
import { useState } from 'react'
```

**Extraction Example (ONLY if repeated 3+ times):**

```javascript
// BEFORE (duplicated)
// In InputScreen.jsx
const isValid = brideName.trim() && groomName.trim() && venue.trim()

// In App.jsx
const isValid = brideName.trim() && groomName.trim() && venue.trim()

// AFTER (extracted)
// In utils/validation.js
export const hasRequiredFields = (brideName, groomName, venue) => {
  return brideName.trim() && groomName.trim() && venue.trim()
}
```

**Extra Caution (but OK to touch if tests pass):**
- `handleGenerate()` in App.jsx - core generation flow
- `gemini.js` - AI prompts and API calls
- `canvasComposer.js` - layout calculations
- `videoComposer.js` - FFmpeg logic
- Be extra careful with these, but improvements are welcome if tests pass

### Phase 4: Post-Cleanup Testing (15 min)

Run comprehensive tests:

```bash
# Run baseline tests
./scripts/test-baseline.sh

# Test critical path manually
cd frontend && npm run dev &
# 1. Upload photo → 2. Fill form → 3. Generate → 4. Verify result
# Document any failures immediately

# Check bundle size didn't explode
npm run build:analyze
# Compare to pre-cleanup size (should be same or smaller)
```

Create test results file (CLEANUP_RESULTS.md):

```markdown
# Cleanup Results - [DATE]

## Changes Made
- [ ] Removed 15 unused imports across 8 files
- [ ] Renamed 23 unclear variables (e.g., `data` → `generatedPortrait`)
- [ ] Deleted 200 lines of commented code
- [ ] Extracted `validateFormInputs()` helper (used 3 times)
- [ ] Added JSDoc to 5 complex functions

## Files Modified
- `frontend/src/App.jsx` (removed unused `useCallback`)
- `frontend/src/components/InputScreen.jsx` (renamed `data` → `formData`)
- `backend/gemini.js` (deleted commented old prompt)
- [etc...]

## Test Results
✅ Frontend builds successfully (1.2MB → 1.1MB)
✅ Backend starts without errors
✅ Manual test: Photo upload → Generate → Result (PASSED)
✅ Dev mode still works
✅ Rate limiting still enforced

## Issues Found
- ❌ None - all tests passed

## Skipped (Too Risky)
- Updating dependencies - not worth the risk
- [List any changes that failed tests and were reverted]

## Metrics
- Lines removed: 250
- Lines added: 80
- Net reduction: 170 lines
- Time taken: 45 minutes
- Breaking changes: 0
```

## Scripts to Create/Use

### scripts/test-baseline.sh (Pre/Post cleanup)

```bash
#!/bin/bash
set -e

echo "Testing frontend build..."
cd frontend && npm run build && cd ..

echo "Testing backend startup..."
cd backend && timeout 10s npm run dev || true

echo "All baseline tests passed!"
```

### scripts/find-unused.sh (Find dead code)

```bash
#!/bin/bash
# Find unused imports (basic detection)
echo "=== Potentially Unused Imports ==="
cd frontend/src
grep -r "import.*from" . | while read line; do
  file=$(echo $line | cut -d: -f1)
  import=$(echo $line | sed "s/.*import \(.*\) from.*/\1/")
  # Check if imported name is used elsewhere in file
  count=$(grep -c "$import" "$file" || true)
  if [ "$count" -eq 1 ]; then
    echo "MAYBE UNUSED: $line"
  fi
done
```

### scripts/complexity-report.sh (Track simplification)

```bash
#!/bin/bash
# Count lines, files, functions before/after
echo "=== Codebase Metrics ==="
echo "Total lines: $(find . -name '*.js' -o -name '*.jsx' | xargs wc -l | tail -1)"
echo "Total files: $(find . -name '*.js' -o -name '*.jsx' | wc -l)"
echo "Commented lines: $(grep -r '//' --include='*.js' --include='*.jsx' . | wc -l)"
```

## Decision Tree

```
Is this change...
├─ Removing unused code? → YES, do it (safest)
├─ Renaming for clarity? → YES, do it (safe if tests pass)
├─ Extracting duplicated logic? → ONLY if 3+ exact copies
├─ Touching generation pipeline? → YES, but test thoroughly
├─ Adding new dependencies? → NO, skip
├─ Requiring new tests? → NO, skip (use existing tests only)
├─ Architectural change? → NO, absolutely skip
└─ Uncertain if safe? → Test it, revert if fails
```

## Success Criteria

- ✅ All existing functionality works identically
- ✅ Codebase is easier for Claude to read and modify
- ✅ Net reduction in lines of code (dead weight removed)
- ✅ No new dependencies added
- ✅ No new bugs introduced
- ✅ Clear documentation of what changed

## Failure Recovery

If anything breaks:
1. Immediately revert the last commit
2. Document in CLEANUP_RESULTS.md under "Issues Found"
3. Add to permanent skip list in this file
4. Continue with next safe change

## Output Format

At end of cleanup session, produce:
1. **CLEANUP_RESULTS.md** - detailed change report (see template above)
2. **Git commits** - one per logical change, clear messages:
   - `cleanup: remove unused imports from InputScreen`
   - `refactor: rename unclear variables in App.jsx`
   - `docs: add JSDoc to generatePortrait function`
3. **Test evidence** - screenshots or logs proving tests passed

## Remember

- This is a POC, not enterprise software - don't over-engineer the cleanup
- If in doubt, skip it - we can always clean more tomorrow
- The goal is "easier for AI to work with", not "perfect code"
- Shipping working code > pristine architecture
