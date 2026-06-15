---
name: Feature request
about: Propose a capability or improvement
title: "feat: "
labels: enhancement
assignees: ""
---

## Problem

What's painful or missing today. Lead with the user's situation, not the solution.

## Proposed direction

What you'd build. If it touches the canvas, sketch the interaction; if it touches sync,
say how it stays convergent and whether it's document state or ephemeral presence.

## Tier

Where this sits relative to current scope:

- [ ] MVP — core to the realtime canvas
- [ ] v1 — multi-team, permissions, comments, snapping
- [ ] v2 — WebGL, export, auth, embeds

## States to design

Which of these the feature needs to handle:

- [ ] idle / empty
- [ ] loading
- [ ] connected
- [ ] disconnected / reconnecting
- [ ] error

## Acceptance criteria

How we'll know it's done. Be specific (e.g. "two clients converge on identical
state after concurrent edits to the same field").

## Alternatives considered

Anything you weighed and rejected, and why.
