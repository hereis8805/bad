-- 배드민턴 클럽 DB 스키마
-- Supabase SQL Editor에서 실행하세요

-- 회원 테이블
CREATE TABLE members (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  gender      text NOT NULL CHECK (gender IN ('M', 'F')),
  skill_level text NOT NULL CHECK (skill_level IN ('A', 'B', 'C', 'D', '초심')),
  birth_year  int  NOT NULL,
  created_at  timestamp with time zone DEFAULT now()
);

-- 경기 테이블
CREATE TABLE games (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  game_type   text NOT NULL CHECK (game_type IN ('singles', 'doubles', 'half_singles')),
  court       text NOT NULL CHECK (court IN ('A', 'B')),
  played_at   timestamp with time zone DEFAULT now(),
  created_at  timestamp with time zone DEFAULT now()
);

-- 경기 참가자 테이블
CREATE TABLE game_players (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id    uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  member_id  uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  team       int  NOT NULL CHECK (team IN (1, 2)),
  score      int  NOT NULL DEFAULT 0
);

-- 통계 공개설정 테이블
CREATE TABLE settings (
  key   text PRIMARY KEY,
  value text NOT NULL
);

-- 기본값: 통계 비공개
INSERT INTO settings (key, value) VALUES ('stats_visible', 'false');

-- RLS (Row Level Security) - 모두 읽기 가능, 쓰기도 허용 (간단한 운영)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON game_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON settings FOR ALL USING (true) WITH CHECK (true);
