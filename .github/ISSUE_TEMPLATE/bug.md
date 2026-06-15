---
name: Bug report
about: Something on the canvas, sync, or presence isn't behaving
title: "bug: "
labels: bug
assignees: ""
---

## What happened

A clear description of the actual behavior.

## Expected

What you expected instead.

## Reproduction

Steps to reproduce. Realtime bugs often need two clients — describe both:

1. Tab A: ...
2. Tab B: ...
3. ...

## Scope

- [ ] Single client (canvas / tools / geometry)
- [ ] Multi-client sync (edits don't converge / one client loses data)
- [ ] Presence (cursors, selection tints, avatar stack)
- [ ] Offline → reconnect merge
- [ ] Persistence (board didn't survive a reload / server restart)

## Connection state when it happened

idle / connected / disconnected / reconnecting / error

## Environment

- Browser + version:
- OS:
- Number of connected clients:
- Approx. shapes on the board:
- Running via: `pnpm dev` / `docker compose up`

## Console / network notes

Any errors from the browser console or failed socket frames. **Do not paste secrets.**
