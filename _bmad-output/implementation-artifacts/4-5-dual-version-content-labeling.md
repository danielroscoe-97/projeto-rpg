# Story 4.5: Dual-Version Content Labeling

Status: done

## Story

As a **DM or player**,
I want all SRD content clearly labeled with its ruleset version (2014 or 2024),
So that I always know which version of a rule I'm reading.

## Acceptance Criteria

1. **Given** any monster stat block, spell description, or condition lookup
   **When** the content is displayed
   **Then** a version badge ("2014" or "2024") is prominently visible (FR20)

2. **Given** the search results for monsters or spells
   **When** both versions of the same entity exist
   **Then** both are listed with distinct version labels
   **And** the session's default version is shown first

## Tasks

- [ ] Task 1 — Version-priority sort in search results
  - [ ] When defaultVersion is provided, sort matching version results before others
  - [ ] Applied in both MonsterSearch and SpellSearch

- [ ] Task 2 — Condition version context
  - [ ] Add "All Versions" or "Universal" label to ConditionLookup header
  - [ ] Conditions are identical across 2014/2024 SRD — label accordingly

- [ ] Task 3 — Write tests

## Files

```
components/oracle/MonsterSearch.tsx   ← MODIFY: version-first sort
components/oracle/SpellSearch.tsx     ← MODIFY: version-first sort
components/oracle/ConditionLookup.tsx ← MODIFY: version label
```
