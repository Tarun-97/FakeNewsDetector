#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e


echo "Tesseract OCR engine is being installed via the apt.txt build pack."

# Install Python dependencies from requirements.txt
echo "Installing Python dependencies..."
pip install -r requirements.txt



echo "Build process complete."