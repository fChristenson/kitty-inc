---
description: Keep game/canvas logic split into dedicated folder modules
applyTo: "src/**"
---

# Kitty Inc

A canvas-based idle/clicker game (Vite + TypeScript, no framework). Click workers on
each floor to earn money, buy upgrades/workers/boosts, unlock new floors up the
skyscraper, and collect badges — income keeps accruing while the tab is closed too.

## Module-first rule

All game logic should be added to their own folder under src. Each folder should have a single `index.ts` entry point, and all related code for that module should stay within that folder.
Files that grow bigger than a few hundred lines should be split into additional files within the same module folder, and imported into the module's `index.ts`.

## Sharing code

All code that is shared between game module should be placed in their own dedicated folder under src/shared/. The same pattern of organization applies to each shared module folder. Game modules only import other modules from the shared folder.

## Code generalization

Animations and UI elements are to be created as general implementation and reused. Do not duplicate code across different modules. Any code that is not strictly tied to a specific game module should be made in to a generalized implementation that can be used across multiple modules. Only duplicate similar logic if it is strictly necessary.
