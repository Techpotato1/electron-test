# Windows Disk Cleanup - Electron App

A modern, portable Windows disk cleanup utility built with Electron.

## Features

- Real file deletion with true disk space measurement
- Modern UI with dark/light mode toggle
- Custom styled checkboxes and progress bar
- ezytdl-inspired color scheme
- Portable Windows executable
- Multiple cleanup categories (temp files, recycle bin, thumbnails, etc.)

## Downloads

### Stable Releases
- **Latest stable version**: [View Releases](../../releases/latest)
- Download the `.exe` file for Windows (portable, no installation required)

### Nightly Builds
- **Latest nightly build**: [View Nightly](../../releases/tag/nightly)
- Automatically built from the latest main branch
- ⚠️ **Pre-release**: May contain experimental features and bugs
- Updated daily when changes are pushed to main

## Build Outputs

- **Windows**: `Windows-Disk-Cleanup-1.0.0-portable.exe`

## CI/CD

This project uses GitHub Actions for automated builds:
- **Stable releases**: Triggered on version tags (`v*`)
- **Nightly releases**: Triggered on every push to main branch
- **Builds**: Windows portable executable (.exe)