'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, type Game, type GamePlayer, type Member } from '@/lib/supabase'

type GameWithPlayers = Game & {
  players: (GamePlayer & { member: Member })[]
}

const GAME_TYPE_LABEL: Record<string, string> = {
  singles: '단식',
  doubles: '복식',
  half_singles: '반코트 단식',
}

export default function GamesPage() {
  const [games, setGames] = useState<GameWithPlayers[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGames()
  }, [])

  async function fetchGames() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: gamesData } = await supabase
      .from('games')
      .select('*')
      .gte('played_at', today.toISOString())
      .order('played_at', { ascending: false })

    if (!gamesData || gamesData.length === 0) {
      setGames([])
      setLoading(false)
      return
    }

    const gameIds = gamesData.map((g: Game) => g.id)
    const { data: playersData } = await supabase
      .from('game_players')
      .select('*, member:members(*)')
      .in('game_id', gameIds)

    const merged: GameWithPlayers[] = gamesData.map((game: Game) => ({
      ...game,
      players: (playersData ?? []).filter((p: GamePlayer) => p.game_id === game.id),
    }))

    setGames(merged)
    setLoading(false)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/" className="text-gray-500 text-xl">←</Link>
        <h1 className="font-bold text-lg flex-1">오늘의 경기</h1>
        <span className="text-sm text-gray-500">{games.length}경기</span>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        {loading ? (
          <p className="text-center text-gray-400 py-12">불러오는 중...</p>
        ) : games.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">오늘 기록된 경기가 없습니다</p>
            <Link href="/record" className="mt-4 inline-block bg-blue-500 text-white px-6 py-2 rounded-xl text-sm font-semibold">
              경기 입력하기
            </Link>
          </div>
        ) : (
          games.map(game => {
            const team1 = game.players.filter(p => p.team === 1)
            const team2 = game.players.filter(p => p.team === 2)
            const score1 = team1[0]?.score ?? 0
            const score2 = team2[0]?.score ?? 0
            const time = new Date(game.played_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

            return (
              <div key={game.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400">{GAME_TYPE_LABEL[game.game_type]} · {game.court}면 · {time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-center">
                    {team1.map(p => (
                      <p key={p.id} className="font-semibold text-gray-800">{p.member?.name}</p>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 px-4">
                    <span className={`text-2xl font-bold ${score1 > score2 ? 'text-blue-500' : 'text-gray-400'}`}>{score1}</span>
                    <span className="text-gray-300">:</span>
                    <span className={`text-2xl font-bold ${score2 > score1 ? 'text-blue-500' : 'text-gray-400'}`}>{score2}</span>
                  </div>
                  <div className="flex-1 text-center">
                    {team2.map(p => (
                      <p key={p.id} className="font-semibold text-gray-800">{p.member?.name}</p>
                    ))}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
