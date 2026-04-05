import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://jycjnmevudsbdiqqexty.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y2pubWV2dWRzYmRpcXFleHR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMjcyNzIsImV4cCI6MjA5MDgwMzI3Mn0.8pBD-hM35XzqDLwbn8SZfqwY8UFM7mLXXxo4ptl0qpo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Gender = 'M' | 'F'
export type SkillLevel = 'A' | 'B' | 'C' | 'D' | '초심'
export type GameType = 'singles' | 'doubles' | 'half_singles'
export type Court = 'A' | 'B'

export interface Member {
  id: string
  name: string
  gender: Gender
  skill_level: SkillLevel
  birth_year: number
  is_guest?: boolean
  created_at: string
}

export interface Game {
  id: string
  game_type: GameType
  court: Court
  played_at: string
  created_at: string
}

export interface GamePlayer {
  id: string
  game_id: string
  member_id: string
  team: 1 | 2
  score: number
  member?: Member
}
