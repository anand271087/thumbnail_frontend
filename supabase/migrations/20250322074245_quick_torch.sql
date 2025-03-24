/*
  # Add Admin User

  1. Changes
    - Insert starter plan for Anand
    - Set admin privileges
*/

-- Insert starter plan for Anand with admin privileges
INSERT INTO user_plans (
  user_id,
  plan_type,
  face_training_limit,
  image_limit,
  is_admin
)
SELECT 
  id as user_id,
  'starter' as plan_type,
  1 as face_training_limit,
  10 as image_limit,
  true as is_admin
FROM auth.users
WHERE email = 'anand@example.com'
ON CONFLICT (user_id) DO UPDATE
SET 
  plan_type = 'starter',
  face_training_limit = 1,
  image_limit = 10,
  is_admin = true;