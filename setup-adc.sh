#!/bin/bash

# Script to help set up Application Default Credentials for Google Workspace Admin API
# This creates the ADC file that the Google Admin service is looking for

echo "Google Workspace Admin API ADC Setup Helper"
echo "==========================================="
echo ""
echo "Since the gcloud auth flow is having localhost redirect issues in Replit,"
echo "you'll need to create the ADC file manually with your Google OAuth credentials."
echo ""
echo "Here's what you need to do:"
echo ""
echo "1. Go to Google Cloud Console: https://console.cloud.google.com/"
echo "2. Navigate to APIs & Services > Credentials" 
echo "3. Find your OAuth 2.0 Client ID (the one starting with 537178633862)"
echo "4. Download the JSON file or copy the client_id and client_secret"
echo "5. Create the ADC file at: ~/.config/gcloud/application_default_credentials.json"
echo ""
echo "The ADC file should look like this:"
echo '{'
echo '  "client_id": "your_oauth_client_id_here",'
echo '  "client_secret": "your_oauth_client_secret_here",'
echo '  "refresh_token": "your_refresh_token_here",'
echo '  "type": "authorized_user",'
echo '  "universe_domain": "googleapis.com"'
echo '}'
echo ""
echo "You can get a refresh token by using the OAuth playground:"
echo "https://developers.google.com/oauthplayground/"
echo ""
echo "Required scopes for the refresh token:"
echo "- https://www.googleapis.com/auth/admin.directory.user.readonly"
echo "- https://www.googleapis.com/auth/admin.directory.group.readonly"  
echo "- https://www.googleapis.com/auth/admin.directory.group.member.readonly"
echo ""
echo "Once you create that file, restart the application and the Admin API will work!"