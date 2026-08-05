# Auto-Deployment Guide

This project is configured to automatically build and publish `.dmg` (Mac) and `.exe` (Windows) binaries to GitHub Releases whenever you push a new version tag.

## How to Publish a New Release

Follow these exact steps every time you want to release a new version of the app to your users.

### Step 1: Bump the Version in `package.json`
Before committing your new features, you **must** update the `"version"` field inside `package.json`.
```json
{
  "name": "ankivocabgen",
  "version": "1.0.2", // <-- UPDATE THIS NUMBER
  // ...
}
```
*Note: If the git tag you create later does not match this version number, the GitHub Action will silently abort the publishing process!*

### Step 2: Stage and Commit Your Code
Save all your files, and commit them using standard git commands.
```bash
git add .
git commit -m "feat: added new awesome features"
```

### Step 3: Create a Git Tag
Create a git tag that corresponds perfectly to the version number you put in `package.json`. Make sure to prefix it with a `v`.
```bash
git tag v1.0.2
```

### Step 4: Push to GitHub
Push your committed code and your new tag simultaneously to the main branch.
```bash
git push origin main --tags
```

### Step 5: Wait for the Build
1. Go to your repository on GitHub.
2. Click the **Actions** tab.
3. You will see your build running on both a Mac and a Windows server.
4. Once they both turn green (usually takes ~5 minutes), go to the **Releases** tab.
5. You will see a new release automatically created with your `.dmg` and `.exe` attached!

---

## Versioning Conventions (Semantic Versioning)

This project follows [Semantic Versioning](https://semver.org/) (SemVer). Version numbers are formatted as **MAJOR.MINOR.PATCH** (e.g., `1.0.2`). 

Here is a quick guide on when to increase each number:

### 1. MAJOR Version (`1.0.0` ➔ `2.0.0`)
**When to bump:** You make **breaking changes** or massive architectural overhauls.
*   *Examples:* Changing how data is saved so old flashcards break, completely rebuilding the entire UI from scratch, or dropping support for older operating systems.
*   *Rule:* When you increase the MAJOR version, you must reset the MINOR and PATCH numbers to `0`.

### 2. MINOR Version (`1.0.2` ➔ `1.1.0`)
**When to bump:** You add **new, backward-compatible features**.
*   *Examples:* Adding the Image Support API, adding the Anki TTS Toggle, or building the new Deck Selection dropdown.
*   *Rule:* When you increase the MINOR version, you must reset the PATCH number to `0`.

### 3. PATCH Version (`1.0.2` ➔ `1.0.3`)
**When to bump:** You make **backward-compatible bug fixes** or small tweaks.
*   *Examples:* Fixing a typo in a popup, preventing the app from crashing when offline, or adjusting the padding on a button.
*   *Rule:* The MAJOR and MINOR versions stay exactly the same.
