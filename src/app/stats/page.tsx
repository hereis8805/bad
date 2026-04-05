'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase, type Member } from '@/lib/supabase'

const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

function getChosung(char: string): string {
  const code = char.charCodeAt(0)
  if (code >= 0xAC00 && code <= 0xD7A3) {
    return CHOSUNG[Math.floor((code - 0xAC00) / 28 / 21)]
  }
  return char
}

function matchesSearch(name: string, query: string): boolean {
  if (!query.trim()) return true
  const q = query.trim()
  if (name.toLowerCase().includes(q.toLowerCase())) return true
  const isChosungQuery = [...q].every(c => CHOSUNG.includes(c))
  if (isChosungQuery) {
    const nameChosung = [...name].map(getChosung).join('')
    return nameChosung.includes(q)
  }
  return false
}

type GameRow = {
  game_id: string
  member_id: string
  team: number
  score: number
  game_type: string
  member_name: string
}

type PartnerStat = {
  member: Member
  together: number
  wins: number
  rate: number
}

type OpponentStat = {
  member: Member
  faced: number
  wins: number
  rate: number
}

type Stats = {
  total: number
  wins: number
  losses: number
  rate: number
  byType: Record<string, { total: number; wins: number }>
  byCourt: Record<string, { total: number; wins: number }>
  recentGames: { game_id: string; game_type: string; win: boolean; score: string; opponents: string[] }[]
  partners: PartnerStat[]
  opponents: OpponentStat[]
}

const GAME_TYPE_LABEL: Record<string, string> = {
  singles: '단식',
  doubles: '복식',
  half_singles: '반코트',
}

export default function StatsPage() {
  const [query, setQuery] = useState('')
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<Member | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('members').select('*').order('name').then(({ data }) => {
      setAllMembers(data ?? [])
    })
  }, [])

  const filteredMembers = allMembers.filter(m => !m.is_guest && matchesSearch(m.name, query))

  async function selectMember(member: Member) {
    setSelected(member)
    setQuery('')
    setIsOpen(false)
    setLoading(true)
    await loadStats(member)
    setLoading(false)
  }

  async function loadStats(member: Member) {
    // 이 회원이 참가한 모든 game_id 조회
    const { data: myRows } = await supabase
      .from('game_players')
      .select('game_id, team, score, games(game_type, court)')
      .eq('member_id', member.id)

    if (!myRows || myRows.length === 0) {
      setStats({ total: 0, wins: 0, losses: 0, rate: 0, byType: {}, byCourt: {}, recentGames: [], partners: [], opponents: [] })
      return
    }

    const gameIds = myRows.map((r: any) => r.game_id)

    // 같은 게임에 참가한 모든 선수 조회
    const { data: allPlayers } = await supabase
      .from('game_players')
      .select('game_id, member_id, team, score, members(id, name, gender, skill_level, birth_year, is_guest, created_at)')
      .in('game_id', gameIds)

    if (!allPlayers) return

    // 게임별 그룹핑
    const gameMap: Record<string, any[]> = {}
    for (const p of allPlayers) {
      if (!gameMap[p.game_id]) gameMap[p.game_id] = []
      gameMap[p.game_id].push(p)
    }

    let wins = 0, losses = 0
    const byType: Record<string, { total: number; wins: number }> = {}
    const byCourt: Record<string, { total: number; wins: number }> = {}
    const partnerMap: Record<string, { member: Member; together: number; wins: number }> = {}
    const opponentMap: Record<string, { member: Member; faced: number; wins: number }> = {}
    const recentGames: Stats['recentGames'] = []

    for (const myRow of myRows as any[]) {
      const gameId = myRow.game_id
      const myTeam = myRow.team
      const myScore = myRow.score
      const gameInfo = Array.isArray(myRow.games) ? myRow.games[0] : myRow.games
      const gameType = gameInfo?.game_type ?? ''
      const court = gameInfo?.court ?? ''
      const players = gameMap[gameId] ?? []

      // 상대팀 점수
      const oppScore = players.find((p: any) => p.team !== myTeam)?.score ?? 0
      const win = myScore > oppScore

      if (win) wins++; else losses++

      // 게임타입별
      if (!byType[gameType]) byType[gameType] = { total: 0, wins: 0 }
      byType[gameType].total++
      if (win) byType[gameType].wins++

      // // 코트별
      // if (court) {
      //   if (!byCourt[court]) byCourt[court] = { total: 0, wins: 0 }
      //   byCourt[court].total++
      //   if (win) byCourt[court].wins++
      // }

      // 파트너 (같은팀, 다른 멤버) - 복식만, 게스트 제외
      const partners = players.filter((p: any) => p.team === myTeam && p.member_id !== member.id)
      for (const pt of partners) {
        const pm = pt.members as Member
        if (!pm || pm.is_guest) continue
        if (!partnerMap[pm.id]) partnerMap[pm.id] = { member: pm, together: 0, wins: 0 }
        partnerMap[pm.id].together++
        if (win) partnerMap[pm.id].wins++
      }

      // 상대방 (게스트 제외)
      const opponents = players.filter((p: any) => p.team !== myTeam)
      const oppNames = opponents.map((p: any) => {
        const m = p.members as Member
        return m?.is_guest ? null : (m?.name ?? '?')
      }).filter(Boolean) as string[]
      for (const op of opponents) {
        const om = op.members as Member
        if (!om || om.is_guest) continue
        if (!opponentMap[om.id]) opponentMap[om.id] = { member: om, faced: 0, wins: 0 }
        opponentMap[om.id].faced++
        if (win) opponentMap[om.id].wins++
      }

      // 최근 경기
      recentGames.push({
        game_id: gameId,
        game_type: gameType,
        win,
        score: `${myScore} : ${oppScore}`,
        opponents: oppNames,
      })
    }

    const total = wins + losses

    const partners: PartnerStat[] = Object.values(partnerMap)
      .map(p => ({ ...p, rate: p.together > 0 ? Math.round((p.wins / p.together) * 100) : 0 }))
      .sort((a, b) => b.rate - a.rate || b.together - a.together)

    const opponents: OpponentStat[] = Object.values(opponentMap)
      .map(o => ({ ...o, rate: o.faced > 0 ? Math.round((o.wins / o.faced) * 100) : 0 }))
      .sort((a, b) => b.rate - a.rate || b.faced - a.faced)

    setStats({
      total,
      wins,
      losses,
      rate: total > 0 ? Math.round((wins / total) * 100) : 0,
      byType,
      byCourt,
      recentGames: recentGames.slice(-10).reverse(),
      partners,
      opponents,
    })
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/" className="text-gray-500 text-xl">←</Link>
        <h1 className="font-bold text-lg">개인 통계</h1>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* 회원 검색 */}
        <div className="relative">
          <input
            type="text"
            placeholder="검색(초성가능)"
            value={query}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            onChange={e => { setQuery(e.target.value); setIsOpen(true) }}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 bg-white"
          />
          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto">
              {filteredMembers.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400 text-center">검색 결과 없음</p>
              ) : filteredMembers.map(m => (
                <button
                  key={m.id}
                  onMouseDown={() => selectMember(m)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-100 last:border-0 hover:bg-blue-50 active:bg-blue-100"
                >
                  <span className="font-medium text-gray-800">{m.name}</span>
                  <span className="text-xs text-gray-400">{m.gender === 'M' ? '남' : '여'} · {m.birth_year}년생</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && <p className="text-center text-gray-400 py-8">불러오는 중...</p>}

        {selected && stats && !loading && (
          <>
            {/* 회원 정보 */}
            <div className="bg-blue-500 text-white rounded-xl p-4">
              <p className="text-lg font-bold">{selected.name}</p>
              <p className="text-blue-100 text-sm mt-0.5">
                {selected.gender === 'M' ? '남' : '여'} · {selected.birth_year}년생
              </p>
            </div>

            {stats.total === 0 ? (
              <p className="text-center text-gray-400 py-6">경기 기록이 없습니다</p>
            ) : (
              <>
                {/* 전체 승패 */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-400 mb-3 font-medium">전체 전적</p>
                  <div className="flex items-center justify-around">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
                      <p className="text-xs text-gray-400 mt-1">경기</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-500">{stats.wins}</p>
                      <p className="text-xs text-gray-400 mt-1">승</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-red-400">{stats.losses}</p>
                      <p className="text-xs text-gray-400 mt-1">패</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-500">{stats.rate}%</p>
                      <p className="text-xs text-gray-400 mt-1">승률</p>
                    </div>
                  </div>
                </div>

                {/* 게임 타입별 */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-400 mb-3 font-medium">게임 종류별</p>
                  <div className="flex flex-col gap-2">
                    {Object.entries(stats.byType).map(([type, s]) => {
                      const rate = s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0
                      return (
                        <div key={type} className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 w-16">{GAME_TYPE_LABEL[type] ?? type}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-24 text-right">{s.wins}승 {s.total - s.wins}패 ({rate}%)</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 코트별 승률 */}
                {Object.keys(stats.byCourt).length > 0 && (
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-400 mb-3 font-medium">코트별 승률</p>
                    <div className="flex gap-3">
                      {['A', 'B'].filter(c => stats.byCourt[c]).map(c => {
                        const s = stats.byCourt[c]
                        const rate = s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0
                        return (
                          <div key={c} className="flex-1 bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                            <p className="text-lg font-bold text-gray-700">{c}면</p>
                            <p className={`text-2xl font-bold mt-1 ${rate >= 50 ? 'text-blue-500' : 'text-red-400'}`}>{rate}%</p>
                            <p className="text-xs text-gray-400 mt-1">{s.wins}승 {s.total - s.wins}패 · {s.total}경기</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 최고의 파트너 */}
                {stats.partners.length > 0 && (
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-400 mb-3 font-medium">최고의 파트너 (복식)</p>
                    <div className="flex flex-col gap-2">
                      {stats.partners.map((p, i) => (
                        <div key={p.member.id} className="flex items-center gap-3">
                          <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-800 flex-1">{p.member.name}</span>
                          <span className="text-xs text-gray-400">{p.together}경기</span>
                          <div className="w-16 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-green-400 h-2 rounded-full" style={{ width: `${p.rate}%` }} />
                          </div>
                          <span className={`text-sm font-bold w-10 text-right ${p.rate >= 50 ? 'text-green-500' : 'text-red-400'}`}>
                            {p.rate}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 상대 전적 */}
                {stats.opponents.length > 0 && (
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-400 mb-3 font-medium">상대별 승률</p>
                    <div className="flex flex-col gap-2">
                      {stats.opponents.map((o, i) => (
                        <div key={o.member.id} className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-5 text-center">{i + 1}</span>
                          <span className="text-sm font-medium text-gray-800 flex-1">{o.member.name}</span>
                          <span className="text-xs text-gray-400">{o.faced}경기</span>
                          <div className="w-16 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${o.rate}%` }} />
                          </div>
                          <span className={`text-sm font-bold w-10 text-right ${o.rate >= 50 ? 'text-blue-500' : 'text-red-400'}`}>
                            {o.rate}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 최근 경기 */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-400 mb-3 font-medium">최근 경기</p>
                  <div className="flex flex-col gap-2">
                    {stats.recentGames.map((g, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${g.win ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-500'}`}>
                          {g.win ? '승' : '패'}
                        </span>
                        <span className="text-xs text-gray-400">{GAME_TYPE_LABEL[g.game_type]}</span>
                        <span className="text-sm text-gray-600 flex-1">vs {g.opponents.join(', ')}</span>
                        <span className="text-sm font-medium text-gray-700">{g.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
