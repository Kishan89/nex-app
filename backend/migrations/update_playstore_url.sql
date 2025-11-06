-- Fix Play Store URL to match correct package ID
UPDATE app_version 
SET play_store_url = 'https://play.google.com/store/apps/details?id=com.mycompany.nexeed1'
WHERE platform = 'android';
