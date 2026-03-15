---
description: How to start the local Foundry VTT server for testing
---

# Local Integration Testing for Foundry VTT

This framework provides a reproducible way to start the local Foundry server and execute browser tests against the `forge-char-creator` module.

### Prerequisites
- The module codebase is in `~/git/forge-char-creator`
- A Foundry V13 Linux runtime is extracted to `./FoundryVTT-Linux-13.351`
- A local data directory is built at `./FoundryData`

### Server Configuration
If the `FoundryData` folder structure is ever lost, it must be rebuilt with symlinks so Foundry can discover it relative to the `--dataPath` argument:
```bash
mkdir -p FoundryData/Data/modules FoundryData/Data/worlds FoundryData/Data/systems
ln -s $PWD FoundryData/Data/modules/forge-char-creator
# Note: Systems and worlds must also be symlinked into FoundryData/Data if recreating from scratch
```

### Starting the Server
Foundry V13 requires **Node 20**. Use NVM to source and run it with the specific electron entry point:

```bash
// turbo
bash -c 'source ~/.nvm/nvm.sh && nvm use 20 && node ./FoundryVTT-Linux-13.351/resources/app/main.js --dataPath=$PWD/FoundryData'
```

### Browser Subagent Access
1. Spawn the browser agent to target `http://localhost:30000/game` window.
2. The user has already configured the license and world; the agent can interact directly with the game session.
3. Verify module logs and UI settings via javascript `console.log` evaluations and DOM/Screenshot inspection.
