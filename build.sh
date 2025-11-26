#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Update package lists and install Tesseract OCR
# 'tesseract-ocr' is the system package for the engine
echo "Installing Tesseract OCR..."
apt-get update
apt-get install -y tesseract-ocr
echo "Tesseract OCR installed successfully."

# Install Python dependencies from requirements.txt
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Build process complete."