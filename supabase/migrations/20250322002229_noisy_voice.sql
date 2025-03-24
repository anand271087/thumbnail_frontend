/*
  # Create Training Requests Table

  1. New Tables
    - `training_requests`
      - `id` (uuid, primary key)
      - `request_id` (text, unique)
      - `user_id` (uuid, references auth.users)
      - `status` (text)
      - `percentage` (integer)
      - `created_at` (timestamp)
      - `trigger_phrase` (text)

  2. Security
    - Enable RLS on `training_requests` table
    - Add policy for authenticated users to read their own data
*/

CREATE TABLE IF NOT EXISTS training_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  percentage integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  trigger_phrase text NOT NULL
);

ALTER TABLE training_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own training requests"
  ON training_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training requests"
  ON training_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);