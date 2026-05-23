# Node.js 22 (required)

Capacitor CLI 8 and this repo require **Node 22+**. Older Node (18/20) causes cryptic build/sync failures.

## Check what you’re using

```powershell
node -v
```

Should show `v22.x.x`.

## Windows — nvm-windows

1. Install [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) if needed.
2. In PowerShell **as Administrator** (once):

```powershell
nvm install 22.22.0
nvm use 22.22.0
```

3. In the project folder (every new terminal):

```powershell
cd c:\Users\plyon\Documents\chapappteams\migiude-1
nvm use
node -v
```

4. Reinstall deps after switching Node:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
```

## Cursor / VS Code terminal

Close all terminals, open a **new** terminal, run `node -v` again. If it still shows v20, your IDE may be using a different PATH — fix nvm default:

```powershell
nvm use 22.22.0
```

## Volta (optional)

If you use [Volta](https://volta.sh/), `package.json` pins Node `22.22.0` and will auto-switch in this folder.

## Firebase Functions

`functions/` also targets Node **22** (`functions/package.json` → `"engines": { "node": "22" }`).
