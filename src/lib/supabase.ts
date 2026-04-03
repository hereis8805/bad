import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'

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
