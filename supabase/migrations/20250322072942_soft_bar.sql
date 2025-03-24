/*
  # User Plan Tracking Implementation

  1. New Tables
    - `user_plans`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `plan_type` (text, check constraint for valid plans)
      - `face_training_limit` (integer)
      - `face_training_used` (integer)
      - `image_limit` (integer)
      - `images_generated` (integer)
      - `subscription_start` (timestamptz)
      - `subscription_end` (timestamptz)
      - `created_at` (timestamptz)

  2. Functions and Triggers
    - Functions to increment counters
    - Triggers to track usage

  3. Security
    - Enable RLS
    - Add policies for user access
*/

-- Create user_plans table
CREATE TABLE IF NOT EXISTS user_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  plan_type text NOT NULL CHECK (plan_type IN ('starter', 'creator', 'pro')),
  face_training_limit integer NOT NULL,
  face_training_used integer NOT NULL DEFAULT 0,
  image_limit integer NOT NULL,
  images_generated integer NOT NULL DEFAULT 0,
  subscription_start timestamptz NOT NULL DEFAULT now(),
  subscription_end timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

-- Policies for user_plans
CREATE POLICY "Users can view own plan"
  ON user_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own plan"
  ON user_plans
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to increment face training count
CREATE OR REPLACE FUNCTION increment_face_training()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_plans
  SET face_training_used = face_training_used + 1
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment generated images count
CREATE OR REPLACE FUNCTION increment_generated_images()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_plans
  SET images_generated = images_generated + 1
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for counting
CREATE TRIGGER count_face_training
  AFTER INSERT ON training_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_face_training();

CREATE TRIGGER count_generated_images
  AFTER INSERT ON results
  FOR EACH ROW
  EXECUTE FUNCTION increment_generated_images();