'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type LivePlayer = {
  id: string | null
  name: string
  isGuest: boolean
}

type LiveGame = {
  id: string
  game_type: string
  team1: LivePlayer[]
  team2: LivePlayer[]
  score1: number
  score2: number
  is_active: boolean
  updated_at: string
}

const GAME_TYPE_LABEL: Record<string, string> = {
  singles: '단식',
  doubles: '복식',
}

export default function LiveWatchPage() {
  const [games, setGames] = useState<LiveGame[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  async function fetchGames() {
    const { data, error } = await supabase
      .from('live_games')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: true })

    if (error) { setLoading(false); return }
    setGames(data ?? [])
    setLastUpdated(new Date())
    setLoading(false)
  }

  useEffect(() => {
    fetchGames()

    const pollInterval = setInterval(fetchGames, 1000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchGames()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const channel = supabase
      .channel('live_games_watch')
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'live_games' },
        () => fetchGames()
      )
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      document.removeEventListener('visibilitychange', handleVisibility)
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/" className="text-gray-500 text-xl">←</Link>
        <h1 className="font-bold text-lg flex-1">라이브 보기</h1>
        {games.length > 0 && (
          <span className="text-xs text-green-500 font-semibold animate-pulse">
            ● LIVE {games.length > 1 ? `${games.length}경기` : ''}
          </span>
        )}
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">
        {loading ? (
          <p className="text-center text-gray-400 py-16">불러오는 중...</p>
        ) : games.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
            <div className="text-5xl mb-4">🏸</div>
            <p className="font-bold text-gray-700 text-lg mb-1">현재 진행 중인 경기가 없습니다</p>
            <p className="text-sm text-gray-400">라이브 경기가 시작되면 자동으로 표시됩니다</p>
          </div>
        ) : (
          <>
            {lastUpdated && (
              <p className="text-xs text-gray-400 text-center">
                {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} 기준 · 1초마다 자동 갱신
              </p>
            )}
            {games.map(game => (
              <div key={game.id} className="bg-white rounded-3xl shadow-md border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-green-100 text-green-600 text-xs font-bold px-3 py-1 rounded-full">
                    {GAME_TYPE_LABEL[game.game_type] ?? game.game_type}
                  </span>
                  <span className="text-xs text-green-500 font-semibold animate-pulse">● LIVE</span>
                </div>

                <div className="flex items-stretch gap-4">
                  <div className="flex-1 flex flex-col items-center gap-2">
                    {game.team1.map((p, i) => (
                      <div key={i} className="text-center">
                        <p className="font-bold text-gray-800">{p.name}</p>
                      </div>
                    ))}
                    <span className={`text-6xl font-black tabular-nums mt-2 ${game.score1 > game.score2 ? 'text-blue-500' : 'text-gray-700'}`}>
                      {game.score1}
                    </span>
                    {game.score1 > game.score2 && (
                      <span className="text-xs text-blue-400 font-semibold">리드</span>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <div className="h-full w-px bg-gray-100" />
                    <span className="text-gray-300 text-xl font-light my-2">:</span>
                    <div className="h-full w-px bg-gray-100" />
                  </div>

                  <div className="flex-1 flex flex-col items-center gap-2">
                    {game.team2.map((p, i) => (
                      <div key={i} className="text-center">
                        <p className="font-bold text-gray-800">{p.name}</p>
                      </div>
                    ))}
                    <span className={`text-6xl font-black tabular-nums mt-2 ${game.score2 > game.score1 ? 'text-red-400' : 'text-gray-700'}`}>
                      {game.score2}
                    </span>
                    {game.score2 > game.score1 && (
                      <span className="text-xs text-red-400 font-semibold">리드</span>
                    )}
                  </div>
                </div>

                {game.score1 === game.score2 && (game.score1 > 0 || game.score2 > 0) && (
                  <p className="text-center text-sm text-gray-500 font-semibold mt-3">듀스</p>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
