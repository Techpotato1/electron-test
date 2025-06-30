# Windows Disk Cleanup - Electron App

A modern, portable Windows disk cleanup utility built with Electron.

## Features

- Real file deletion with true disk space measurement
- Modern UI with dark/light mode toggle
- Custom styled checkboxes and progress bar
- ezytdl-inspired color scheme
- Portable Windows executable
- Multiple cleanup categories (temp files, recycle bin, thumbnails, etc.)

## Development

```bash
# Install dependencies
npm install

# Run in development
npm start

# Build portable executable
npm run build-portable
```

## GitHub Actions CI/CD

This repository includes automated builds using GitHub Actions:

### Workflows

1. **`build.yml`** - Multi-platform builds (Windows, macOS, Linux)
2. **`windows-build.yml`** - Windows-only builds (faster)

### Automatic Builds

- **On every push** to main/master branch
- **On pull requests**
- **On tagged releases** (creates GitHub releases)

### Downloads

Built executables are available as:
- **Artifacts** on every build (30-day retention)
- **Releases** for tagged versions (permanent)

## Setup Instructions

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Enable Actions**: Go to your GitHub repo → Actions tab → Enable workflows

3. **Create releases**: 
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

4. **Download builds**: Check the Actions tab for build artifacts

## Build Outputs

- **Windows**: `Windows-Disk-Cleanup-1.0.0-portable.exe`
- **macOS**: `Windows-Disk-Cleanup-1.0.0.dmg`
- **Linux**: `Windows-Disk-Cleanup-1.0.0.AppImage`
