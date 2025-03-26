#!/bin/bash

# Change to Shelly-App directory
cd /home/damian/Shelly-App/

# Check if shelly_monitoring exists and remove it if it does
if [ -d "shelly_monitoring" ]; then
    sudo rm -rf shelly_monitoring
fi

# Copy shelly_monitoring from /opt
sudo cp -a /opt/shelly_monitoring/ .

# Add all changes to git
git add .

# Ask for commit message with timeout
echo "Enter commit message (waiting 5 seconds):"
read -t 5 commit_message

# Get current date and time
current_datetime=$(date "+%Y-%m-%d %H:%M:%S")

# If no message provided, use only timestamp
if [ -z "$commit_message" ]; then
    full_message="$current_datetime"
else
    full_message="$current_datetime $commit_message"
fi

# Commit changes
git commit -m "$full_message"

# Push to origin main
git push origin main

echo "Process completed successfully!"
