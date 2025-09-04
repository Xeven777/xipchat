#!/bin/bash

# Build script for XipChat Chrome Extension
# This script builds the extension and packages it for distribution

set -e

echo "🚀 Building XipChat Chrome Extension..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "public/manifest.json" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf dist/
rm -rf extension-package/
rm -f xipchat-extension.zip
rm -f xipchat-extension.tar.gz

# Install dependencies
print_status "Installing dependencies..."
npm ci

# Run type checking
print_status "Running type checks..."
npm run check

# Build the extension
print_status "Building extension..."
npm run build

# Create extension package directory
print_status "Creating extension package..."
mkdir -p extension-package

# Copy built files
print_status "Copying built files..."
cp -r dist/* extension-package/

# Copy manifest and icons
print_status "Copying manifest and assets..."
cp public/manifest.json extension-package/
cp -r public/icons extension-package/

# Get version from manifest
VERSION=$(node -p "require('./public/manifest.json').version")
print_status "Extension version: $VERSION"

# Create zip file for Chrome Web Store
print_status "Creating zip package..."
cd extension-package
zip -r "../xipchat-extension-v${VERSION}.zip" .
cd ..

# Create tar.gz for other distributions
print_status "Creating tar.gz package..."
tar -czf "xipchat-extension-v${VERSION}.tar.gz" -C extension-package .

# Display package info
print_success "Build completed successfully!"
echo ""
echo "📦 Package Information:"
echo "  Version: $VERSION"
echo "  Zip file: xipchat-extension-v${VERSION}.zip"
echo "  Tar file: xipchat-extension-v${VERSION}.tar.gz"
echo "  Package directory: extension-package/"
echo ""
echo "🔧 Installation Instructions:"
echo "  1. Extract xipchat-extension-v${VERSION}.zip"
echo "  2. Open Chrome and go to chrome://extensions/"
echo "  3. Enable 'Developer mode'"
echo "  4. Click 'Load unpacked' and select the extracted folder"
echo ""
echo "📊 Package Contents:"
ls -la extension-package/
echo ""

# Check package size
ZIP_SIZE=$(du -h "xipchat-extension-v${VERSION}.zip" | cut -f1)
print_status "Package size: $ZIP_SIZE"

if [ -f "xipchat-extension-v${VERSION}.zip" ]; then
    print_success "Extension package ready for distribution!"
else
    print_error "Failed to create extension package"
    exit 1
fi
