/*
  # Create Results Table

  1. New Tables
    - `results`
      - `id` (uuid, primary key)
      - `request_id` (text, unique)
      - `image_url` (text)
      - `created_at` (timestamp)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on `results` table
    - Add policy for authenticated users to read their own data
*/

CREATE TABLE IF NOT EXISTS results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text UNIQUE NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users NOT NULL
);

ALTER TABLE results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own results"
  ON results
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own results"
  ON results
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);