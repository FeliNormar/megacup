import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vgakrirmkbxwujhclcns.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_jE1j-IMgf2Cz7F30UDYfYg_YlDZjS2l'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
