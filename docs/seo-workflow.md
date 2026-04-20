# SEO Workflow — Branch, Commit & Deploy Discipline

**Last updated:** 2026-04-20 (Épico A story 4)

**Purpose:** Rules of engagement for agents working on SEO tasks in this multi-agent repo. Written because past sprints burned time on recoverable-but-avoidable incidents (files reverted by a parallel checkout, `git stash` blowing up work from another process, bundled commits with misleading messages). Follow this and those won't repeat.

---

## 1. When to use a worktree vs. a branch on master

| Situation | Use |
|---|---|
| Solo session, `master` up to date with `origin/master` | **Normal branch** off `master` (`git checkout -b seo/epic-X-story-Y-slug`) |
| Another agent has local commits on `master` not yet pushed **and** you need to push something isolated | **Worktree** (`git worktree add ../projeto-rpg-seo seo/epic-X-story-Y`) |
| You're the only one touching the repo right now and have a clean tree | **Work directly on a branch off master**, no worktree needed |

**Worktree cheat sheet:**
```bash
# Create an isolated checkout (parallel to main working dir)
git worktree add ../projeto-rpg-seo-epic-a seo/epic-a-story-1-split
cd ../projeto-rpg-seo-epic-a

# When done
git worktree remove ../projeto-rpg-seo-epic-a
```

---

## 2. Branch naming convention

```
seo/epic-{A|B|C}-story-{N}-{short-slug}
```

Examples:
- `seo/epic-a-story-1-blog-split`
- `seo/epic-a-story-2-hub-generator`
- `seo/epic-c-story-1-gsc-export`

For sprint-style work (legacy):
```
seo/sprint-{N}-{short-slug}
```

---

## 3. Commit cadence — NEVER >15 minutes uncommitted

This is non-negotiable in this repo. Sprint 4 had files reverted by a parallel process because they sat in the working tree for 40+ minutes.

**After each story completes (A1.1, A1.2, A2, etc.):**
```bash
rtk npx tsc --noEmit              # must be 0 errors
rtk git add <specific paths>      # avoid `git add -A`/`git add .`
rtk git commit -m "..."           # descriptive message, see commit template in each Epic prompt
rtk git push                      # immediately
```

**Warnings:**
- Do not `git add -A` or `git add .` — sweeps sensitive/unrelated files.
- If pre-commit hook fails: investigate, fix, create a NEW commit. Never `--amend` an already-failed commit (the original didn't land).
- If `git push` is rejected: pull with rebase (`rtk git pull --rebase`) — never force-push unless explicitly authorized by Daniel.

---

## 4. Git index.lock recovery

Symptom: `fatal: Unable to create '.../.git/index.lock': File exists.`

Cause: Two processes tried to stage simultaneously (common with background agents + foreground editor saving files).

**Fix:**
```bash
# Confirm no other git process is alive
ps aux | grep -i git | grep -v grep

# If none, remove the lock (safe)
rm .git/index.lock

# Retry your operation
```

If there's an active git process, wait for it to finish. Never kill a git process mid-operation — can leave the repo in an inconsistent state.

---

## 5. If a file you edited gets reverted

Symptom: you saved a change, came back 10 minutes later, file has old content.

Cause: another agent (or a `git checkout` in another terminal) overwrote your working tree.

**Do NOT** run `git stash` globally — it will sweep work from OTHER agents and lose it.

**Do THIS instead:**
```bash
# Stash ONLY your specific files
git stash push -m "wip: my file" -- components/my-file.tsx lib/my-lib.ts

# Investigate what happened (git reflog often shows the foreign checkout)
git reflog -10

# After resolution, pop your stash
git stash pop
```

If you're unsure whether a change is yours or another agent's, **ask Daniel before staging** — reverting someone else's active work costs more than waiting 2 minutes.

---

## 6. Post-push validation checklist

Every push to master that affects SEO should be followed by:

```bash
# 1. Confirm Vercel deployed
rtk gh run list --workflow=CI --limit=3

# 2. Check production returns 200 for a sample URL you touched
curl -sI "https://pocketdm.com.br/guias/bestiario-dnd-5e?nocache=$(date +%s)"

# 3. Run validate:seo (created in Epic A story 3)
npm run validate:seo:prod

# 4. If blog or hub changed, spot-check canonical + JSON-LD
curl -s "https://pocketdm.com.br/blog/como-usar-combat-tracker-dnd-5e" | \
  grep -oE '<link rel="canonical"[^>]+>'
```

If `validate:seo:prod` fails, **investigate BEFORE shipping more content.** A regression in canonical/JSON-LD compounds across every new page until fixed.

---

## 7. GSC service account setup (one-time, ~30min, human-only)

Required before Epic C story 1 (`scripts/gsc-export.ts`) can run.

1. Google Cloud Console → create project (or reuse existing)
2. Enable **Search Console API** on that project
3. IAM & Admin → Service Accounts → Create → save JSON key
4. Search Console → Settings → Users and permissions → Add user (service account email, Restricted permission)
5. Save to Vercel (Production/Preview/Development) AND `.env.local`:
   - `GSC_SERVICE_ACCOUNT_EMAIL=<service account email>`
   - `GSC_SERVICE_ACCOUNT_KEY=<base64 of JSON key>`
   - `GSC_SITE=sc-domain:pocketdm.com.br`
6. Add `*.gsa.json` to `.gitignore` (never commit the raw key file)

---

## 8. When to run what

| Trigger | Command |
|---|---|
| Before splitting a large file / refactor | `rtk next build > .tmp/before.txt` (capture baseline) |
| After each story complete | `rtk npx tsc --noEmit` → commit → push |
| After push to master (SEO-affecting) | `npm run validate:seo:prod` |
| Weekly (Monday morning) | `npm run seo:gsc-export` → commit `data/seo/gsc-*.json` |
| When Daniel sees a GSC issue | `curl -sI` the affected URL on BOTH apex + www variants |

---

## See also

- [docs/seo-architecture.md](./seo-architecture.md) — canonical architecture decisions
- [docs/seo-monitoring.md](./seo-monitoring.md) — weekly GSC ritual
- Memory `feedback_multi_agent_commits.md` — origin-story for these rules
