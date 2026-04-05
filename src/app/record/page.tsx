'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type GameType, type Member } from '@/lib/supabase'

type Step = 'type' | 'players' | 'score'

const GAME_TYPES: { value: GameType; label: string; desc: string }[] = [
  { value: 'singles', label: '단식', desc: '1 : 1' },
  { value: 'doubles', label: '복식', desc: '2 : 2' },
  { value: 'half_singles', label: '반코트 단식', desc: '1 : 1' },
]

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

type SlotKey = string

type GuestPlayer = { id: null; name: string; isGuest: true }
type RecordPlayer = Member | GuestPlayer

export default function RecordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('type')
  const [gameType, setGameType] = useState<GameType | null>(null)

  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [team1, setTeam1] = useState<(RecordPlayer | undefined)[]>([])
  const [team2, setTeam2] = useState<(RecordPlayer | undefined)[]>([])
  const [slotQueries, setSlotQueries] = useState<Record<SlotKey, string>>({})
  const [activeSlot, setActiveSlot] = useState<SlotKey | null>(null)
  const [guestInputActive, setGuestInputActive] = useState<string | null>(null)
  const [guestName, setGuestName] = useState('')

  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const maxPlayers = gameType === 'doubles' ? 2 : 1

  useEffect(() => {
    if (step === 'players') {
      supabase.from('members').select('*').order('name').then(({ data }) => {
        setAllMembers(data ?? [])
      })
    }
  }, [step])

  function getFilteredMembers(team: 1 | 2, index: number): Member[] {
    const key = `${team}_${index}`
    const query = slotQueries[key] ?? ''
    const selectedIds = new Set([
      ...team1.filter(Boolean).filter(m => m!.id !== null).map(m => m!.id as string),
      ...team2.filter(Boolean).filter(m => m!.id !== null).map(m => m!.id as string),
    ])
    return allMembers.filter(m => !m.is_guest && !selectedIds.has(m.id) && matchesSearch(m.name, query))
  }

  function selectPlayer(team: 1 | 2, index: number, member: Member) {
    const setter = team === 1 ? setTeam1 : setTeam2
    setter(prev => {
      const arr = [...prev]
      arr[index] = member
      return arr
    })
    setSlotQueries(prev => ({ ...prev, [`${team}_${index}`]: '' }))
    setActiveSlot(null)
  }

  function removePlayer(team: 1 | 2, index: number) {
    const setter = team === 1 ? setTeam1 : setTeam2
    setter(prev => { const arr = [...prev]; arr[index] = undefined; return arr })
  }

  function addGuestPlayer(team: 1 | 2, index: number) {
    if (!guestName.trim()) return
    const player: GuestPlayer = { id: null, name: guestName.trim(), isGuest: true }
    const setter = team === 1 ? setTeam1 : setTeam2
    setter(prev => { const arr = [...prev]; arr[index] = player; return arr })
    setGuestInputActive(null)
    setGuestName('')
    setActiveSlot(null)
  }

  const filledTeam1 = team1.filter(Boolean).length
  const filledTeam2 = team2.filter(Boolean).length
  const playersReady = filledTeam1 === maxPlayers && filledTeam2 === maxPlayers

  async function handleSubmit() {
    if (!gameType || !score1 || !score2) return
    setSubmitting(true)
    setError('')

    try {
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({ game_type: gameType, court: 'A', played_at: new Date().toISOString() })
        .select()
        .single()

      if (gameError) {
        setError(gameError.message)
        setSubmitting(false)
        return
      }

      if (!game) {
        setError('경기 생성 실패')
        setSubmitting(false)
        return
      }

      const t1 = team1.filter(Boolean) as RecordPlayer[]
      const t2 = team2.filter(Boolean) as RecordPlayer[]

      async function resolveId(player: RecordPlayer): Promise<string | null> {
        if (player.id) return player.id
        const { data: ex } = await supabase.from('members').select('id').eq('name', player.name).eq('is_guest', true).maybeSingle()
        if (ex) return ex.id
        const { data } = await supabase.from('members').insert({ name: player.name, gender: 'M', skill_level: '초심', birth_year: 2000, is_guest: true }).select().single()
        return data?.id ?? null
      }

      const t1Ids = await Promise.all(t1.map(resolveId))
      const t2Ids = await Promise.all(t2.map(resolveId))

      if (t1Ids.some(id => !id) || t2Ids.some(id => !id)) {
        setError('선수 등록 실패')
        setSubmitting(false)
        return
      }

      const { error: playersError } = await supabase.from('game_players').insert([
        ...t1.map((_, i) => ({ game_id: game.id, member_id: t1Ids[i]!, team: 1, score: parseInt(score1) })),
        ...t2.map((_, i) => ({ game_id: game.id, member_id: t2Ids[i]!, team: 2, score: parseInt(score2) })),
      ])

      if (playersError) {
        setError(playersError.message)
        setSubmitting(false)
        return
      }

      setSubmitting(false)
      router.push('/games')
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류 발생')
      setSubmitting(false)
    }
  }

  function renderSlot(team: 1 | 2, index: number) {
    const player = (team === 1 ? team1 : team2)[index]
    const key: SlotKey = `${team}_${index}`
    const query = slotQueries[key] ?? ''
    const isActive = activeSlot === key
    const filtered = getFilteredMembers(team, index)

    if (player) {
      return (
        <div key={key} className="flex items-center gap-1.5 px-2 py-2 rounded-lg border bg-blue-50 border-blue-200">
          <p className="flex-1 min-w-0 font-semibold text-gray-800 text-sm truncate">
            {player.name}
            {'isGuest' in player && player.isGuest && <span className="ml-1 text-xs text-orange-400">(게스트)</span>}
          </p>
          <button onClick={() => removePlayer(team, index)} className="shrink-0 text-red-400 text-xs">✕</button>
        </div>
      )
    }

    return (
      <div key={key} className="relative">
        {guestInputActive === key ? (
          <div className="flex gap-1">
            <input
              type="text"
              autoFocus
              placeholder="게스트 이름 입력"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addGuestPlayer(team, index) }}
              className="flex-1 border border-orange-300 rounded-lg px-2 py-2 text-sm outline-none focus:border-orange-400 bg-white"
            />
            <button onMouseDown={() => addGuestPlayer(team, index)} className="bg-orange-400 text-white px-2 py-1 rounded-lg text-xs font-semibold">추가</button>
            <button onMouseDown={() => { setGuestInputActive(null); setGuestName('') }} className="text-gray-400 text-xs px-1">✕</button>
          </div>
        ) : (
          <>
            <input
              type="text"
              placeholder="검색(초성가능)"
              value={query}
              onFocus={() => setActiveSlot(key)}
              onBlur={() => setTimeout(() => setActiveSlot(prev => prev === key ? null : prev), 200)}
              onChange={e => {
                setSlotQueries(prev => ({ ...prev, [key]: e.target.value }))
                setActiveSlot(key)
              }}
              className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-blue-400 bg-white"
            />
            {isActive && (
              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-52 overflow-y-auto min-w-[160px] w-max max-w-[80vw]">
                {filtered.map(m => (
                  <button
                    key={m.id}
                    onMouseDown={() => selectPlayer(team, index, m)}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-left border-b border-gray-100 last:border-0 hover:bg-blue-50 active:bg-blue-100 whitespace-nowrap"
                  >
                    <span className="font-medium text-gray-800 text-sm">{m.name}</span>
                    <span className="text-xs text-gray-400">{m.gender === 'M' ? '남' : '여'} · {m.birth_year}년생</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="px-3 py-3 text-sm text-gray-400 text-center whitespace-nowrap">결과 없음</p>
                )}
                <button
                  onMouseDown={() => {
                    setGuestInputActive(key)
                    setGuestName(query)
                    setActiveSlot(null)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-left hover:bg-orange-50 active:bg-orange-100 whitespace-nowrap border-t border-gray-100"
                >
                  <span className="text-orange-500 font-medium text-sm">+ 게스트 입력하기</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => {
            if (step === 'type') router.push('/')
            else if (step === 'players') setStep('type')
            else setStep('players')
          }}
          className="text-gray-500 text-xl"
        >←</button>
        <h1 className="font-bold text-lg">경기 결과 입력</h1>
      </div>

      {/* 진행 단계 표시 */}
      <div className="flex bg-white border-b">
        {(['type', 'players', 'score'] as Step[]).map((s, i) => (
          <div key={s} className={`flex-1 h-1 ${step === s ? 'bg-blue-500' : i < ['type','players','score'].indexOf(step) ? 'bg-blue-200' : 'bg-gray-100'}`} />
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
                  onClick={() => { setGameType(t.value); setStep('players') }}
                  className="bg-white border border-gray-200 rounded-xl p-4 text-left shadow-sm active:bg-blue-50 active:border-blue-300"
                >
                  <p className="font-semibold text-gray-800">{t.label}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 2: 선수 입력 (코트 레이아웃) */}
        {step === 'players' && (
          <>
            {/* 코트 시각화 + 선수 입력 */}
            <div className="flex flex-col">
              {/* 단상 */}
              <div className="bg-gray-200 border border-gray-300 rounded-t-xl py-3 text-center">
                <p className="text-sm font-semibold text-gray-500 tracking-widest">단 상</p>
              </div>

              {/* A면(팀1) | B면(팀2) */}
              <div className="flex border border-t-0 border-gray-200 rounded-b-xl overflow-visible bg-white shadow-sm">
                {/* 팀 1 (A면) */}
                <div className="flex-1 p-3 flex flex-col gap-2 border-r border-gray-200 overflow-visible">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">팀 1</span>
                    <span className="text-xs text-gray-400">A면</span>
                  </div>
                  {Array.from({ length: maxPlayers }, (_, i) => renderSlot(1, i))}
                </div>

                {/* 팀 2 (B면) */}
                <div className="flex-1 p-3 flex flex-col gap-2 overflow-visible">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-red-400 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">팀 2</span>
                    <span className="text-xs text-gray-400">B면</span>
                  </div>
                  {Array.from({ length: maxPlayers }, (_, i) => renderSlot(2, i))}
                </div>
              </div>
            </div>

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

        {/* STEP 3: 점수 입력 */}
        {step === 'score' && (
          <>
            <p className="text-gray-600 font-medium">최종 점수를 입력하세요</p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-center gap-4 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex-1 text-center">
                {(team1.filter(Boolean) as Member[]).map(m => <p key={m.id} className="font-semibold text-gray-800">{m.name}</p>)}
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
                {(team2.filter(Boolean) as Member[]).map(m => <p key={m.id} className="font-semibold text-gray-800">{m.name}</p>)}
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
