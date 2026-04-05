@AGENTS.md

# 프로젝트 요약

**배드민턴 클럽 경기 기록·통계 관리 앱**  
Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL + Realtime)

## 환경변수 (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_ADMIN_PASSWORD=
```

## 파일 구조
```
src/
  lib/supabase.ts          # supabase 클라이언트 + 타입 정의 (Member, Game, GamePlayer 등)
  app/
    page.tsx               # 홈 메뉴 (통계 공개 설정에 따라 조건부 메뉴 표시)
    layout.tsx
    games/page.tsx         # 오늘의 경기 목록 + 라이브 등록/보기 버튼
    record/page.tsx        # 경기 결과 입력 (3단계: 타입→선수→점수)
    live/page.tsx          # 라이브 스코어 등록 (단식/복식, 게스트 지원, Realtime broadcast)
    live/watch/page.tsx    # 라이브 보기 (Realtime 구독, settings 테이블 초기 상태)
    stats/page.tsx         # 개인 통계 (회원 검색 → 전적/파트너/상대 분석)
    overall/page.tsx       # 전체 통계 (요약·랭킹·기간 필터)
    request/page.tsx       # 요청·건의 제출
    admin/
      page.tsx             # 관리자 로그인 (localStorage admin_authed)
      games/page.tsx       # 경기 목록·삭제
      members/page.tsx     # 회원 CRUD
      requests/page.tsx    # 건의 관리
      settings/page.tsx    # 통계 공개 설정 토글
```

## DB 스키마 (Supabase / RLS allow-all)
```sql
members        (id uuid PK, name text, gender 'M'|'F', skill_level 'A'|'B'|'C'|'D'|'초심', birth_year int, created_at)
games          (id uuid PK, game_type 'singles'|'doubles'|'half_singles', court 'A'|'B', played_at, created_at)
game_players   (id uuid PK, game_id→games, member_id→members, team 1|2, score int)
settings       (key text PK, value text)   -- 예: show_overall_stats, live_game(JSON)
requests       (id uuid PK, name text|null, category text, message text, status 'pending'|'done', created_at)
```

## 핵심 패턴
- **모든 페이지** `'use client'` + 클라이언트 사이드 fetch
- **초성 검색**: `matchesSearch(name, query)` — record, live, stats, admin/games 등에서 동일 로직 복사 사용
- **선수 슬롯 UI**: `renderSlot(team, index)` 패턴 — record/page.tsx, live/page.tsx
- **경기 저장**: `games` insert → `game_players` insert (team1 score1, team2 score2)
- **라이브 동기화**: `settings` upsert (`key='live_game'`, value=JSON) + Supabase broadcast channel `'live_game'`
- **게스트 처리**: live 종료 시 동일 이름 member 없으면 `{skill_level:'초심', birth_year:2000}` 자동 생성

## TypeScript 타입 (`src/lib/supabase.ts`)
```ts
Member { id, name, gender: 'M'|'F', skill_level, birth_year, created_at }
Game   { id, game_type, court, played_at, created_at }
GamePlayer { id, game_id, member_id, team: 1|2, score, member?: Member }
```

## 주의사항
- 통계 메뉴 노출: `settings` 테이블의 `show_overall_stats`, `show_personal_stats` 값으로 제어
- 관리자 인증: `localStorage.getItem('admin_authed')` === `'1'`
- 실력별 색상: A빨강 B주황 C노랑 D초록 초심회색
