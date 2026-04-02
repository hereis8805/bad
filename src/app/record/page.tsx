'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, type GameType, type Court, type Member } from '@/lib/supabase'

type Step = 'type' | 'court' | 'players' | 'score'

const GAME_TYPES: { value: GameType; label: string; desc: string }[] = [
  { value: 'singles', label: '단식', desc: '1 : 1' },
  { value: 'doubles', label: '복식', desc: '2 : 2' },
  { value: 'half_singles', label: '반코트 단식', desc: '1 : 1' },
]

export default function RecordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('type')
  const [gameType, setGameType] = useState<GameType | null>(null)
  const [court, setCourt] = useState<Court | null>(null)

  // 선수 선택
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Member[]>([])
  const [team1, setTeam1] = useState<Member[]>([])
  const [team2, setTeam2] = useState<Member[]>([])
  const [selectingTeam, setSelectingTeam] = useState<1 | 2>(1)

  // 점수
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const maxPlayers = gameType === 'doubles' ? 2 : 1

  async function searchMembers(query: string) {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    const { data } = await supabase
      .from('members')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(10)
    setSearchResults(data ?? [])
  }

  function selectPlayer(member: Member) {
    const alreadySelected = [...team1, ...team2].some(m => m.id === member.id)
    if (alreadySelected) return

    if (selectingTeam === 1 && team1.length < maxPlayers) {
      setTeam1(prev => [...prev, member])
    } else if (selectingTeam === 2 && team2.length < maxPlayers) {
      setTeam2(prev => [...prev, member])
    }
    setSearchQuery('')
    setSearchResults([])
  }

  function removePlayer(team: 1 | 2, id: string) {
    if (team === 1) setTeam1(prev => prev.filter(m => m.id !== id))
    else setTeam2(prev => prev.filter(m => m.id !== id))
  }

  const playersReady =
    team1.length === maxPlayers && team2.length === maxPlayers

  async function handleSubmit() {
    if (!gameType || !court) return
    if (!score1 || !score2) return
    setSubmitting(true)

    const { data: game } = await supabase
      .from('games')
      .insert({ game_type: gameType, court })
      .select()
      .single()

    if (!game) { setSubmitting(false); return }

    const playerRows = [
      ...team1.map(m => ({ game_id: game.id, member_id: m.id, team: 1, score: parseInt(score1) })),
      ...team2.map(m => ({ game_id: game.id, member_id: m.id, team: 2, score: parseInt(score2) })),
    ]
    await supabase.from('game_players').insert(playerRows)

    setSubmitting(false)
    router.push('/games')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => {
            if (step === 'type') router.push('/')
            else if (step === 'court') setStep('type')
            else if (step === 'players') setStep('court')
            else setStep('players')
          }}
          className="text-gray-500 text-xl"
        >←</button>
        <h1 className="font-bold text-lg">경기 결과 입력</h1>
      </div>

      {/* 진행 단계 표시 */}
      <div className="flex bg-white border-b">
        {(['type', 'court', 'players', 'score'] as Step[]).map((s, i) => (
          <div key={s} className={`flex-1 h-1 ${step === s ? 'bg-blue-500' : i < ['type','court','players','score'].indexOf(step) ? 'bg-blue-200' : 'bg-gray-100'}`} />
        ))}
      </div>

      <div className="p-4 flex flex-col gap-4 flex-1">

        {/* STEP 1: 게임 타입 */}
        {step === 'type' && (
          <>
            <p className="text-gray-600 font-medium">게임 종류를 선택하세요</p>
            <div className="flex flex-col gap-3">
              {GAME_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => { setGameType(t.value); setStep('court') }}
                  className="bg-white border border-gray-200 rounded-xl p-4 text-left shadow-sm active:bg-blue-50 active:border-blue-300"
                >
                  <p className="font-semibold text-gray-800">{t.label}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 2: 코트 선택 */}
        {step === 'court' && (
          <>
            <p className="text-gray-600 font-medium">코트를 선택하세요</p>
            <div className="flex flex-col gap-0">
              {/* 단상 */}
              <div className="bg-gray-200 border border-gray-300 rounded-t-xl py-3 text-center">
                <p className="text-sm font-semibold text-gray-500 tracking-widest">단 상</p>
              </div>
              {/* A면 B면 */}
              <div className="flex">
                {(['A', 'B'] as Court[]).map((c, i) => (
                  <button
                    key={c}
                    onClick={() => { setCourt(c); setStep('players') }}
                    className={`flex-1 bg-white border border-t-0 border-gray-200 py-10 text-center shadow-sm active:bg-blue-50 active:border-blue-300 ${i === 0 ? 'border-r-0 rounded-bl-xl' : 'rounded-br-xl'}`}
                  >
                    <p className="text-3xl font-bold text-gray-700">{c}</p>
                    <p className="text-sm text-gray-400 mt-1">{c}면</p>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* STEP 3: 선수 선택 */}
        {step === 'players' && (
          <>
            <p className="text-gray-600 font-medium">선수를 선택하세요</p>

            {/* 팀 선택 탭 */}
            <div className="flex gap-2">
              {([1, 2] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setSelectingTeam(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    selectingTeam === t
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  팀 {t} {t === 1 ? `(${team1.length}/${maxPlayers})` : `(${team2.length}/${maxPlayers})`}
                </button>
              ))}
            </div>

            {/* 선택된 선수 */}
            <div className="flex flex-col gap-2">
              {[...Array(maxPlayers)].map((_, i) => {
                const player = selectingTeam === 1 ? team1[i] : team2[i]
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${player ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-dashed border-gray-200'}`}>
                    {player ? (
                      <>
                        <span className="flex-1 font-medium text-gray-800">{player.name}</span>
                        <button onClick={() => removePlayer(selectingTeam, player.id)} className="text-red-400 text-sm">✕</button>
                      </>
                    ) : (
                      <span className="text-gray-400 text-sm">선수 {i + 1} 검색하여 선택</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 검색 */}
            <input
              type="text"
              placeholder="이름으로 검색..."
              value={searchQuery}
              onChange={e => searchMembers(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-400"
            />
            {searchResults.length > 0 && (
              <div className="flex flex-col gap-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {searchResults.map(m => {
                  const selected = [...team1, ...team2].some(p => p.id === m.id)
                  return (
                    <button
                      key={m.id}
                      onClick={() => selectPlayer(m)}
                      disabled={selected}
                      className={`flex items-center gap-3 px-4 py-3 text-left border-b border-gray-100 last:border-0 ${selected ? 'opacity-30' : 'active:bg-blue-50'}`}
                    >
                      <span className="font-medium text-gray-800">{m.name}</span>
                      <span className="text-xs text-gray-400">{m.gender === 'M' ? '남' : '여'} · {m.birth_year}년생</span>
                    </button>
                  )
                })}
              </div>
            )}

            {playersReady && (
              <button
                onClick={() => setStep('score')}
                className="mt-auto bg-blue-500 text-white py-3 rounded-xl font-semibold text-base"
              >
                다음 → 점수 입력
              </button>
            )}
          </>
        )}

        {/* STEP 4: 점수 입력 */}
        {step === 'score' && (
          <>
            <p className="text-gray-600 font-medium">최종 점수를 입력하세요</p>

            <div className="flex items-center gap-4 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex-1 text-center">
                {team1.map(m => <p key={m.id} className="font-semibold text-gray-800">{m.name}</p>)}
                <input
                  type="number"
                  value={score1}
                  onChange={e => setScore1(e.target.value)}
                  placeholder="0"
                  min={0}
                  className="mt-3 w-full text-center text-3xl font-bold border-b-2 border-gray-200 focus:border-blue-400 outline-none py-1 bg-transparent"
                />
              </div>
              <span className="text-gray-300 text-2xl font-light">:</span>
              <div className="flex-1 text-center">
                {team2.map(m => <p key={m.id} className="font-semibold text-gray-800">{m.name}</p>)}
                <input
                  type="number"
                  value={score2}
                  onChange={e => setScore2(e.target.value)}
                  placeholder="0"
                  min={0}
                  className="mt-3 w-full text-center text-3xl font-bold border-b-2 border-gray-200 focus:border-blue-400 outline-none py-1 bg-transparent"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!score1 || !score2 || submitting}
              className="mt-auto bg-blue-500 text-white py-3 rounded-xl font-semibold text-base disabled:opacity-50"
            >
              {submitting ? '저장 중...' : '저장하기'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
