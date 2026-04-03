'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const GAME_TYPE_LABEL: Record<string, string> = {
  singles: '단식',
  doubles: '복식',
  half_singles: '반코트',
}

type MemberStat = {
  id: string
  name: string
  total: number
  wins: number
  rate: number
}

type Summary = {
  totalGames: number
  totalMembers: number
  thisMonth: number
  byType: Record<string, number>
}

export default function OverallStatsPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [winRanking, setWinRanking] = useState<MemberStat[]>([])
  const [activeRanking, setActiveRanking] = useState<MemberStat[]>([])
  const [tab, setTab] = useState<'win' | 'active'>('win')
  const [minGames, setMinGames] = useState(3)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    // 게임 전체
    const { data: games } = await supabase
      .from('games')
      .select('id, game_type, played_at')

    // 게임 참여자 전체
    const { data: players } = await supabase
      .from('game_players')
      .select('game_id, member_id, team, score, members(id, name)')

    if (!games || !players) { setLoading(false); return }

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // 게임 타입별 집계
    const byType: Record<string, number> = {}
    let thisMonth = 0
    for (const g of games) {
      byType[g.game_type] = (byType[g.game_type] ?? 0) + 1
      if (g.played_at >= thisMonthStart) thisMonth++
    }

    // 참여 멤버 수
    const uniqueMembers = new Set(players.map(p => p.member_id))

    setSummary({
      totalGames: games.length,
      totalMembers: uniqueMembers.size,
      thisMonth,
      byType,
    })

    // 게임별 그룹핑
    const gameMap: Record<string, typeof players> = {}
    for (const p of players) {
      if (!gameMap[p.game_id]) gameMap[p.game_id] = []
      gameMap[p.game_id].push(p)
    }

    // 멤버별 승패 집계
    const memberMap: Record<string, { id: string; name: string; total: number; wins: number }> = {}

    for (const [, gamePlayers] of Object.entries(gameMap)) {
      for (const player of gamePlayers) {
        const mid = player.member_id
        const member = player.members as any
        if (!member) continue

        const myScore = player.score
        const oppScore = gamePlayers.find(p => p.team !== player.team)?.score ?? 0
        const win = myScore > oppScore

        if (!memberMap[mid]) memberMap[mid] = { id: mid, name: member.name, total: 0, wins: 0 }
        memberMap[mid].total++
        if (win) memberMap[mid].wins++
      }
    }

    const stats: MemberStat[] = Object.values(memberMap).map(m => ({
      ...m,
      rate: m.total > 0 ? Math.round((m.wins / m.total) * 100) : 0,
    }))

    setWinRanking(
      [...stats]
        .filter(m => m.total >= minGames)
        .sort((a, b) => b.rate - a.rate || b.total - a.total)
    )
    setActiveRanking(
      [...stats].sort((a, b) => b.total - a.total)
    )

    setLoading(false)
  }

  const displayWinRanking = winRanking.filter(m => m.total >= minGames)

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-500 text-xl">←</Link>
          <h1 className="font-bold text-lg">전체 통계</h1>
        </div>
        <p className="text-center text-gray-400 py-16">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/" className="text-gray-500 text-xl">←</Link>
        <h1 className="font-bold text-lg">전체 통계</h1>
      </div>

      <div className="p-4 flex flex-col gap-4">

        {/* 요약 카드 */}
        {summary && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-500 text-white rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{summary.totalGames}</p>
              <p className="text-xs text-blue-100 mt-0.5">총 경기</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-gray-800">{summary.totalMembers}</p>
              <p className="text-xs text-gray-400 mt-0.5">참여 인원</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-gray-800">{summary.thisMonth}</p>
              <p className="text-xs text-gray-400 mt-0.5">이번 달</p>
            </div>
          </div>
        )}

        {/* 게임 종류 비율 */}
        {summary && Object.keys(summary.byType).length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-3 font-medium">게임 종류</p>
            <div className="flex flex-col gap-2">
              {Object.entries(summary.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => {
                  const pct = summary.totalGames > 0 ? Math.round((count / summary.totalGames) * 100) : 0
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-14">{GAME_TYPE_LABEL[type] ?? type}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-16 text-right">{count}경기 ({pct}%)</span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* 랭킹 탭 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* 탭 */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setTab('win')}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === 'win' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400'
              }`}
            >
              승률 랭킹
            </button>
            <button
              onClick={() => setTab('active')}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === 'active' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400'
              }`}
            >
              참여 랭킹
            </button>
          </div>

          <div className="p-4 flex flex-col gap-3">
            {/* 승률 탭: 최소 경기 필터 */}
            {tab === 'win' && (
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <span className="text-xs text-gray-400">최소</span>
                {[3, 5, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setMinGames(n)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      minGames === n ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-500 border-gray-200'
                    }`}
                  >
                    {n}경기
                  </button>
                ))}
                <span className="text-xs text-gray-400">이상</span>
              </div>
            )}

            {/* 랭킹 목록 */}
            {(tab === 'win' ? displayWinRanking : activeRanking).length === 0 ? (
              <p className="text-center text-gray-400 py-4 text-sm">데이터 없음</p>
            ) : (
              (tab === 'win' ? displayWinRanking : activeRanking).map((m, i) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-6 text-center shrink-0 ${
                    i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-300'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-gray-800">{m.name}</span>
                  {tab === 'win' ? (
                    <>
                      <span className="text-xs text-gray-400">{m.wins}승 {m.total - m.wins}패</span>
                      <div className="w-14 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${m.rate >= 50 ? 'bg-blue-400' : 'bg-red-300'}`}
                          style={{ width: `${m.rate}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold w-10 text-right ${m.rate >= 50 ? 'text-blue-500' : 'text-red-400'}`}>
                        {m.rate}%
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-gray-400">{m.wins}승 {m.total - m.wins}패</span>
                      <span className="text-sm font-bold text-gray-700 w-12 text-right">{m.total}경기</span>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
