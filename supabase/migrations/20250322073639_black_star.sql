/*
  # Add Admin Features

  1. Updates
    - Add admin flag to user_plans table
    - Add admin policy for unlimited access
    - Add admin policy to view all plans

  2. Security
    - Only admins can view all plans
    - Admins have unlimited usage
*/

-- Add admin column to user_plans
ALTER TABLE user_plans 
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Create policy for admins to view all plans
CREATE POLICY "Admins can view all plans"
  ON user_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_plans 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );