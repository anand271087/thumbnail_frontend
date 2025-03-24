import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserPlan {
  id: string;
  user_id: string;
  plan_type: 'starter' | 'creator' | 'pro';
  face_training_limit: number;
  face_training_used: number;
  image_limit: number;
  images_generated: number;
  subscription_start: string;
  subscription_end: string | null;
  created_at: string;
  is_admin: boolean;
}

export async function getUserPlan(): Promise<UserPlan | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('user_plans')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (error) {
    console.error('Error fetching user plan:', error);
    return null;
  }

  return data;
}

export async function checkFaceTrainingLimit(): Promise<boolean> {
  const plan = await getUserPlan();
  if (!plan) return false;
  if (plan.is_admin) return true;
  return plan.face_training_used < plan.face_training_limit;
}

export async function checkImageGenerationLimit(): Promise<boolean> {
  const plan = await getUserPlan();
  if (!plan) return false;
  if (plan.is_admin) return true;
  return plan.images_generated < plan.image_limit;
}