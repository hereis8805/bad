'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type LiveGame = {
  id: string
  game_type: string
  team1: { name: string; isGuest: boolean }[]
  team2: { name: string; isGuest: boolean }[]
  score1: number
  score2: number
  is_active: boolean
  updated_at: string
}

const GAME_TYPE_LABEL: Record<string, string> = {
  singles: '단식',
  doubles: '복식',
}

export default function AdminLivePage() {
  const router = useRouter()
  const [games, setGames] = useState<LiveGame[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_authed') !== 'true') {
      router.push('/admin')
      return
    }
    fetchGames()
  }, [])

  async function fetchGames() {
    const { data } = await supabase
      .from('live_games')
      .select('*')
      .order('updated_at', { ascending: false })
    setGames(data ?? [])
    setLoading(false)
  }

  async function deleteGame(id: string) {
    setDeleting(id)
    await supabase.from('live_games').delete().eq('id', id)
    setGames(prev => prev.filter(g => g.id !== id))
    setDeleting(null)
  }

  async function deleteAll() {
    setDeleting('all')
    await supabase.from('live_games').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setGames([])
    setDeleting(null)
  }

  function timeAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return `${diff}초 전`
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    return `${Math.floor(diff / 86400)}일 전`
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin" className="text-gray-500 text-xl">←</Link>
        <h1 className="font-bold text-lg flex-1">라이브 스코어 관리</h1>
        {games.length > 0 && (
          <button
            onClick={deleteAll}
            disabled={deleting !== null}
            className="text-xs text-red-400 font-semibold disabled:opacity-40"
          >
            전체 삭제
          </button>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          <p className="text-center text-gray-400 py-12">불러오는 중...</p>
        ) : games.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">남아있는 라이브 데이터가 없습니다</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400">총 {games.length}개의 라이브 데이터가 남아있습니다</p>
            {games.map(game => (
              <div key={game.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${game.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {game.is_active ? '진행중' : '종료됨'}
                    </span>
                    <span className="text-xs text-gray-400">{GAME_TYPE_LABEL[game.game_type] ?? game.game_type}</span>
                    <span className="text-xs text-gray-300">{timeAgo(game.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 font-medium">
                      {game.team1.map(p => p.name).join(', ')}
                    </span>
                    <span className="text-sm font-bold text-blue-500">{game.score1}</span>
                    <span className="text-gray-300 text-sm">:</span>
                    <span className="text-sm font-bold text-red-400">{game.score2}</span>
                    <span className="text-sm text-gray-700 font-medium">
                      {game.team2.map(p => p.name).join(', ')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteGame(game.id)}
                  disabled={deleting !== null}
                  className="shrink-0 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 disabled:opacity-40"
                >
                  {deleting === game.id ? '...' : '삭제'}
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
