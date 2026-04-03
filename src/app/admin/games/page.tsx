'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type GameWithPlayers = {
  id: string
  game_type: string
  court: string
  played_at: string
  players: { team: number; score: number; member: { name: string } }[]
}

const GAME_TYPE_LABEL: Record<string, string> = {
  singles: '단식',
  doubles: '복식',
  half_singles: '반코트 단식',
}

const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

function getChosung(char: string): string {
  const code = char.charCodeAt(0)
  if (code >= 0xAC00 && code <= 0xD7A3) {
    return CHOSUNG[Math.floor((code - 0xAC00) / 28 / 21)]
  }
  return char
}

function matchesSearch(game: GameWithPlayers, query: string): boolean {
  if (!query.trim()) return true
  const q = query.trim()

  // 선수 이름으로 검색
  for (const player of game.players) {
    const name = player.member?.name || ''
    if (name.toLowerCase().includes(q.toLowerCase())) return true

    const isChosungQuery = [...q].every(c => CHOSUNG.includes(c))
    if (isChosungQuery) {
      const nameChosung = [...name].map(getChosung).join('')
      if (nameChosung.includes(q)) return true
    }
  }

  return false
}

export default function GamesManagementPage() {
  const [games, setGames] = useState<GameWithPlayers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchGames()
  }, [])

  async function fetchGames() {
    const { data: gamesData } = await supabase
      .from('games')
      .select('*')
      .order('played_at', { ascending: false })

    if (!gamesData) {
      setGames([])
      setLoading(false)
      return
    }

    const gameIds = gamesData.map((g: any) => g.id)
    const { data: playersData } = await supabase
      .from('game_players')
      .select('game_id, team, score, member:members(name)')
      .in('game_id', gameIds)

    const merged = gamesData.map((game: any) => ({
      ...game,
      players: (playersData ?? []).filter((p: any) => p.game_id === game.id),
    }))

    setGames(merged)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('이 경기를 삭제할까요?')) return

    setError('')
    const { error: delError } = await supabase
      .from('games')
      .delete()
      .eq('id', id)

    if (delError) {
      setError(delError.message)
      return
    }

    setGames(games.filter(g => g.id !== id))
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin" className="text-gray-500 text-xl">←</Link>
        <h1 className="font-bold text-lg flex-1">게임 관리</h1>
        <span className="text-sm text-gray-500">{games.length}경기</span>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="검색(초성가능)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm bg-white outline-none focus:border-blue-400"
        />

        {loading ? (
          <p className="text-center text-gray-400 py-12">불러오는 중...</p>
        ) : games.filter(g => matchesSearch(g, search)).length === 0 ? (
          <p className="text-center text-gray-400 py-12">
            {search ? '검색 결과 없음' : '기록된 경기가 없습니다'}
          </p>
        ) : (
          games.filter(g => matchesSearch(g, search)).map(game => {
            const time = new Date(game.played_at).toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
            return (
              <div key={game.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {GAME_TYPE_LABEL[game.game_type]}
                    </span>
                    <span className="text-xs text-gray-400">{game.court}면</span>
                    <span className="text-xs text-gray-400">{time}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(game.id)}
                    className="text-red-400 text-sm px-3 py-1 rounded active:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  {game.players.length === 0 ? (
                    <p className="text-gray-400">참여자 없음</p>
                  ) : (
                    <>
                      {(() => {
                        const team1 = game.players.filter(p => p.team === 1)
                        const team2 = game.players.filter(p => p.team === 2)
                        const score1 = team1[0]?.score ?? 0
                        const score2 = team2[0]?.score ?? 0
                        return (
                          <div className="flex items-center justify-between">
                            <span>
                              {team1.map(p => p.member?.name).join(', ')}
                            </span>
                            <span className="font-semibold mx-2 text-gray-800">
                              {score1} : {score2}
                            </span>
                            <span>
                              {team2.map(p => p.member?.name).join(', ')}
                            </span>
                          </div>
                        )
                      })()}
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
