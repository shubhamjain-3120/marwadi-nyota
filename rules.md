# Safety Rules for Overnight Cleanup Agent

## NEVER Do These

1. **Never delete files** - only modify existing code

2. **Never add new dependencies** - no npm install, no new imports from external packages

3. **Never push to remote** - only local commits

4. **Never run destructive git commands:**
   - No `git push --force`
   - No `git reset --hard`
   - No `git clean -f`

5. **Never modify files outside the project directory**

## ALWAYS Do These

1. **Always run tests before AND after changes**
2. **Always commit after each successful change**
3. **Always revert immediately if tests fail**
4. **Always document changes in CLEANUP_RESULTS.md**
5. **Always skip if uncertain about safety**

## Stop Conditions

Stop execution immediately if:
- Frontend build fails
- Backend fails to start
- More than 3 consecutive reverts needed
- Any runtime error in dev mode
- Unsure about a change's impact
