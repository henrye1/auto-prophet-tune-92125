#!/bin/bash

# Prophet-Tune Complete Setup Script
# Runs all parts and sets up the project

set -e

echo "================================================"
echo "  Prophet-Tune Project Generator"
echo "  Complete Setup"
echo "================================================"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Run all parts
echo "Running part 1: Root config and core files..."
bash "$SCRIPT_DIR/create-project.sh"

echo ""
echo "Running part 2: UI components..."
bash "$SCRIPT_DIR/create-project-part2.sh"

echo ""
echo "Running part 3: Forecast components (part 1)..."
bash "$SCRIPT_DIR/create-project-part3.sh"

echo ""
echo "Running part 4: Forecast components (part 2)..."
bash "$SCRIPT_DIR/create-project-part4.sh"

echo ""
echo "================================================"
echo "  All files created successfully!"
echo "================================================"
echo ""
echo "Project structure:"
echo ""
find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.css" -o -name "*.html" | head -50
echo ""
echo "Next steps:"
echo "1. npm install"
echo "2. npm run dev"
echo ""
echo "The app will run at http://localhost:5173"
