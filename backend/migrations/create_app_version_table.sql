-- Create app_version table to store current required app version
-- Simple exact match: if app version != supabase version, force update
CREATE TABLE IF NOT EXISTS app_version (
  id SERIAL PRIMARY KEY,
  version VARCHAR(20) NOT NULL, -- Required version - must match exactly
  min_version VARCHAR(20) NOT NULL, -- Keep same as version for compatibility
  platform VARCHAR(10) NOT NULL DEFAULT 'android', -- 'android' or 'ios'
  force_update BOOLEAN DEFAULT true, -- Always true for exact match
  update_message TEXT DEFAULT 'Please update the app to continue',
  play_store_url TEXT,
  app_store_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on platform for faster queries
CREATE INDEX IF NOT EXISTS idx_app_version_platform ON app_version(platform);

-- Insert default version for Android
INSERT INTO app_version (version, min_version, platform, force_update, update_message, play_store_url)
VALUES (
  '1.1.7', 
  '1.1.7', 
  'android', 
  true, 
  'Please update the app from Play Store to continue using Nexeed.',
  'https://play.google.com/store/apps/details?id=com.mycompany.nexeed1'
)
ON CONFLICT DO NOTHING;

-- Insert default version for iOS (optional)
INSERT INTO app_version (version, min_version, platform, force_update, update_message, app_store_url)
VALUES (
  '1.1.7', 
  '1.1.7', 
  'ios', 
  true, 
  'Please update the app from App Store to continue using Nexeed.',
  'https://apps.apple.com/app/nexeed/id123456789'
)
ON CONFLICT DO NOTHING;

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_app_version_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER app_version_updated_at_trigger
BEFORE UPDATE ON app_version
FOR EACH ROW
EXECUTE FUNCTION update_app_version_updated_at();

-- Comments
COMMENT ON TABLE app_version IS 'Stores current app version and minimum required version for force updates';
COMMENT ON COLUMN app_version.version IS 'Current latest version available';
COMMENT ON COLUMN app_version.min_version IS 'Minimum version required - users below this must update';
COMMENT ON COLUMN app_version.force_update IS 'If true, users cannot use app without updating';
