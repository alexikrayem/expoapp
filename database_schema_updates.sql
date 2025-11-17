-- SQL commands to add clinic information and profile completion fields to the user_profiles table

-- Add new columns to the existing user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS clinic_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS clinic_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS clinic_address_line1 VARCHAR(255),
ADD COLUMN IF NOT EXISTS clinic_address_line2 VARCHAR(255),
ADD COLUMN IF NOT EXISTS clinic_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS clinic_country VARCHAR(100),
ADD COLUMN IF NOT EXISTS clinic_coordinates JSONB, -- For storing latitude/longitude as {"lat": 0.0, "lng": 0.0}
ADD COLUMN IF NOT EXISTS clinic_license_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS clinic_specialization VARCHAR(100),
ADD COLUMN IF NOT EXISTS professional_role VARCHAR(100),
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
ADD COLUMN IF NOT EXISTS education_background TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
ADD COLUMN IF NOT EXISTS professional_license_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Create an index on profile_completed for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_profile_completed ON user_profiles(profile_completed);

-- Update existing records to have profile_completed = TRUE where we have basic information
-- This will mark existing profiles as incomplete by default, so they'll go through the onboarding flow
-- If you want to preserve existing profiles, you can update them based on existing data
UPDATE user_profiles 
SET profile_completed = CASE 
  WHEN full_name IS NOT NULL AND full_name != '' 
    AND phone_number IS NOT NULL AND phone_number != ''
    AND clinic_name IS NOT NULL AND clinic_name != ''
    AND clinic_phone IS NOT NULL AND clinic_phone != ''
  THEN TRUE 
  ELSE FALSE 
END;