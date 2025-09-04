# CI/CD Documentation for XipChat Chrome Extension

This document describes the automated build and release process for the XipChat Chrome Extension.

## 🚀 Workflows Overview

### 1. Build and Release Workflow (`.github/workflows/build-and-release.yml`)

**Triggers:**
- Every push to `main` branch
- Pull requests to `main` branch

**What it does:**
- ✅ Installs dependencies
- ✅ Runs type checking (`npm run check`)
- ✅ Builds the extension (`npm run build`)
- ✅ Packages the extension into zip and tar.gz files
- ✅ Creates GitHub releases automatically (only on main branch pushes)
- ✅ Uploads build artifacts

**Outputs:**
- `xipchat-extension.zip` - Ready for Chrome Web Store
- `xipchat-extension.tar.gz` - Alternative distribution format
- `extension-package/` - Unpacked extension directory

### 2. Version Bump Workflow (`.github/workflows/version-bump.yml`)

**Triggers:**
- Manual workflow dispatch from GitHub Actions tab

**What it does:**
- ✅ Bumps version in `package.json` and `public/manifest.json`
- ✅ Creates a git tag
- ✅ Pushes changes to main branch
- ✅ Triggers the build and release workflow automatically

**Options:**
- `patch` - 1.0.0 → 1.0.1
- `minor` - 1.0.0 → 1.1.0  
- `major` - 1.0.0 → 2.0.0
- `custom` - Specify exact version

## 📦 Local Build Scripts

### Build Extension Script (`scripts/build-extension.sh`)

```bash
# Make the script executable (one time)
chmod +x scripts/build-extension.sh

# Build the extension locally
npm run build:extension
# or
./scripts/build-extension.sh
```

**What it does:**
- Cleans previous builds
- Installs dependencies
- Runs type checking
- Builds the extension
- Creates distribution packages
- Shows package information

## 🔄 Release Process

### Automatic Releases (Recommended)

1. **Make your changes** and commit to a feature branch
2. **Create a Pull Request** to `main` branch
3. **Merge the PR** - this triggers a build but no release
4. **Bump the version** using GitHub Actions:
   - Go to GitHub → Actions → "Version Bump" workflow
   - Click "Run workflow"
   - Choose version bump type (patch/minor/major)
   - Click "Run workflow"
5. **Automatic release** will be created with the new version

### Manual Releases

1. **Update version** in both files:
   ```bash
   # Update package.json
   npm version patch  # or minor/major
   
   # Update public/manifest.json manually
   # Change the "version" field to match package.json
   ```

2. **Commit and push**:
   ```bash
   git add package.json package-lock.json public/manifest.json
   git commit -m "🔖 Bump version to v1.0.1"
   git tag v1.0.1
   git push origin main
   git push origin v1.0.1
   ```

3. **GitHub Actions** will automatically build and create a release

## 📋 NPM Scripts

```bash
# Development
npm run dev              # Start development server
npm run preview          # Preview built extension

# Building
npm run build            # Build extension (Vite)
npm run build:extension  # Build and package extension
npm run package          # Full build and package

# Type checking
npm run check            # Run Svelte type checking

# Version management
npm run version:patch    # Bump patch version (local only)
npm run version:minor    # Bump minor version (local only)
npm run version:major    # Bump major version (local only)
```

## 🔧 Configuration

### Required Secrets

No additional secrets are required. The workflows use the default `GITHUB_TOKEN` which is automatically provided by GitHub Actions.

### Workflow Permissions

The workflows need the following permissions (automatically granted):
- `contents: write` - To create releases and push tags
- `actions: read` - To download artifacts

## 📁 File Structure

```
.github/
├── workflows/
│   ├── build-and-release.yml    # Main CI/CD workflow
│   └── version-bump.yml         # Version management workflow
scripts/
└── build-extension.sh           # Local build script
docs/
└── CI-CD.md                     # This documentation
```

## 🐛 Troubleshooting

### Build Fails

1. **Check dependencies**: Ensure all dependencies are properly installed
2. **Type errors**: Run `npm run check` locally to catch TypeScript issues
3. **Build errors**: Run `npm run build` locally to test the build process

### Release Not Created

1. **Check branch**: Releases only trigger on `main` branch pushes
2. **Check version**: Ensure version in `manifest.json` matches `package.json`
3. **Check permissions**: Ensure the repository has Actions enabled

### Version Conflicts

1. **Tag already exists**: Delete the existing tag if you need to recreate it
2. **Version mismatch**: Ensure both `package.json` and `manifest.json` have the same version

## 🎯 Best Practices

1. **Use feature branches** for development
2. **Test locally** before pushing to main
3. **Use semantic versioning** (patch for fixes, minor for features, major for breaking changes)
4. **Write meaningful commit messages** - they appear in release notes
5. **Review build artifacts** before distributing

## 📊 Monitoring

- **GitHub Actions tab**: Monitor workflow runs
- **Releases page**: View all published releases
- **Artifacts**: Download build artifacts for testing

---

For questions or issues with the CI/CD process, check the GitHub Actions logs or create an issue in the repository.
