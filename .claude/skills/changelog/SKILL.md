---
name: changelog
description: Add or revise an entry in CHANGELOG.md. Use when a change alters what a user can do, sees, or relies on — a new capability, a changed behaviour, a fixed defect, or a security-relevant change — and before cutting a release.
---

# Changelog

`CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
New work goes under `## [Unreleased]`, in one of: `Added`, `Changed`,
`Deprecated`, `Removed`, `Fixed`, `Security`.

## What earns an entry

Anything a person using the app would notice. A new capability, a behaviour that
changed under them, a defect they might have hit, or anything affecting what
leaves their browser.

**Not** refactors, test-only changes, dependency bumps with no visible effect,
or documentation. If an entry can only be understood by reading the diff, it does
not belong here.

## How to write one

- Address the user, not the reviewer. "Answers silently degraded to 'N rows
  returned'" — not "fixed response_format on the narrate call".
- Lead with what changed, then why it mattered. One or two sentences.
- Link the ADR in `docs/adr/` for a structural decision instead of restating its
  reasoning: the changelog says *what*, the ADR says *why*.
- A fix should name the symptom someone would have experienced, so a reader can
  tell whether it was the thing biting them.

## Steps

1. Read the existing entries first and match their voice.
2. Add the line under the right heading in `## [Unreleased]`, creating the
   heading if it is absent.
3. Commit it **with** the change it describes, never as a follow-up.

## Releasing

Rename `## [Unreleased]` to `## [x.y.z] — YYYY-MM-DD`, open a fresh
`## [Unreleased]` above it, and bump the version in `package.json`. Breaking
changes drive the major, new capabilities the minor, fixes alone the patch.
