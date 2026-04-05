'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, type Member } from '@/lib/supabase'

type LiveStep = 'type' | 'players' | 'game'
type LiveGameType = 'singles' | 'doubles'

type LivePlayer = {
  id: string | null
  name: string
  isGuest: boolean
}

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

export default function LivePage() {
  const router = useRouter()
  const [step, setStep] = useState<LiveStep>('type')
  const [gameType, setGameType] = useState<LiveGameType | null>(null)
  const maxPlayers = gameType === 'doubles' ? 2 : 1

  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [team1, setTeam1] = useState<(LivePlayer | undefined)[]>([])
  const [team2, setTeam2] = useState<(LivePlayer | undefined)[]>([])
  const [slotQueries, setSlotQueries] = useState<Record<string, string>>({})
  const [activeSlot, setActiveSlot] = useState<string | null>(null)
  const [guestInputActive, setGuestInputActive] = useState<string | null>(null)
  const [guestName, setGuestName] = useState('')

  const [score1, setScore1] = useState(0)
  const [score2, setScore2] = useState(0)
  const [history, setHistory] = useState<(1 | 2)[]>([])
  const [ending, setEnding] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showBackModal, setShowBackModal] = useState(false)
  const [isLandscape, setIsLandscape] = useState(false)

  const [liveDbId, setLiveDbId] = useState<string | null>(null)
  const liveDbIdRef = useRef<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight)
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', () => setTimeout(check, 100))
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [])

  useEffect(() => {
    if (step === 'players') {
      supabase.from('members').select('*').order('name').then(({ data }) => {
        setAllMembers(data ?? [])
      })
    }
  }, [step])

  useEffect(() => {
    if (!liveDbId) return
    const channel = supabase.channel(`live_${liveDbId}`)
    channelRef.current = channel
    channel.subscribe()
    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [liveDbId])

  function broadcastScore(s1: number, s2: number) {
    const id = liveDbIdRef.current
    if (!id) return
    const t1 = team1.filter(Boolean) as LivePlayer[]
    const t2 = team2.filter(Boolean) as LivePlayer[]
    channelRef.current?.send({ type: 'broadcast', event: 'score_update', payload: { score1: s1, score2: s2, team1: t1, team2: t2 } })
    supabase.from('live_games').update({ score1: s1, score2: s2, updated_at: new Date().toISOString() }).eq('id', id).then()
  }

  async function startGame() {
    const t1 = team1.filter(Boolean) as LivePlayer[]
    const t2 = team2.filter(Boolean) as LivePlayer[]
    const { data } = await supabase
      .from('live_games')
      .insert({ game_type: gameType, team1: t1, team2: t2, score1: 0, score2: 0, is_active: true, updated_at: new Date().toISOString() })
      .select('id')
      .single()
    if (!data) return
    setScore1(0)
    setScore2(0)
    setHistory([])
    liveDbIdRef.current = data.id
    setLiveDbId(data.id)
    setStep('game')
  }

  function addPoint(team: 1 | 2) {
    const newScore1 = team === 1 ? score1 + 1 : score1
    const newScore2 = team === 2 ? score2 + 1 : score2
    setScore1(newScore1)
    setScore2(newScore2)
    setHistory(h => [...h, team])
    broadcastScore(newScore1, newScore2)
  }

  function undoLast() {
    if (history.length === 0) return
    const last = history[history.length - 1]
    const newScore1 = last === 1 ? Math.max(0, score1 - 1) : score1
    const newScore2 = last === 2 ? Math.max(0, score2 - 1) : score2
    setScore1(newScore1)
    setScore2(newScore2)
    setHistory(h => h.slice(0, -1))
    broadcastScore(newScore1, newScore2)
  }

  async function getMemberIdForPlayer(player: LivePlayer): Promise<string | null> {
    if (!player.isGuest && player.id) return player.id
    // 게스트: 동일 이름 회원이 있으면 재사용, 없으면 새로 생성
    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .eq('name', player.name)
      .eq('is_guest', true)
      .maybeSingle()
    if (existing) return existing.id
    const { data } = await supabase
      .from('members')
      .insert({ name: player.name, gender: 'M', skill_level: '초심', birth_year: 2000, is_guest: true })
      .select()
      .single()
    return data?.id ?? null
  }

  async function handleEndGame() {
    if (!liveDbId) return
    setEnding(true)
    setShowEndConfirm(false)
    try {
      const t1 = team1.filter(Boolean) as LivePlayer[]
      const t2 = team2.filter(Boolean) as LivePlayer[]

      const t1Ids = await Promise.all(t1.map(getMemberIdForPlayer))
      const t2Ids = await Promise.all(t2.map(getMemberIdForPlayer))

      if (t1Ids.some(id => !id) || t2Ids.some(id => !id)) {
        setEnding(false)
        return
      }

      const gameTypeDB = gameType === 'doubles' ? 'doubles' : 'singles'
      const { data: game } = await supabase
        .from('games')
        .insert({ game_type: gameTypeDB, court: 'A', played_at: new Date().toISOString() })
        .select()
        .single()

      if (!game) { setEnding(false); return }

      await supabase.from('game_players').insert([
        ...t1.map((_, i) => ({ game_id: game.id, member_id: t1Ids[i]!, team: 1, score: score1 })),
        ...t2.map((_, i) => ({ game_id: game.id, member_id: t2Ids[i]!, team: 2, score: score2 })),
      ])

      await supabase.from('live_games').delete().eq('id', liveDbId)
      router.push('/games')
    } catch {
      setEnding(false)
    }
  }

  async function handleEndWithoutSave() {
    if (!liveDbId) return
    await supabase.from('live_games').delete().eq('id', liveDbId)
    router.push('/')
  }

  // --- 선수 슬롯 ---
  function getFilteredMembers(team: 1 | 2, index: number): Member[] {
    const key = `${team}_${index}`
    const query = slotQueries[key] ?? ''
    const selectedIds = new Set([
      ...(team1.filter(Boolean) as LivePlayer[]).filter(p => !p.isGuest && p.id).map(p => p.id!),
      ...(team2.filter(Boolean) as LivePlayer[]).filter(p => !p.isGuest && p.id).map(p => p.id!),
    ])
    return allMembers.filter(m => !m.is_guest && !selectedIds.has(m.id) && matchesSearch(m.name, query))
  }

  function selectMember(team: 1 | 2, index: number, member: Member) {
    const player: LivePlayer = { id: member.id, name: member.name, isGuest: false }
    const setter = team === 1 ? setTeam1 : setTeam2
    setter(prev => { const arr = [...prev]; arr[index] = player; return arr })
    setSlotQueries(prev => ({ ...prev, [`${team}_${index}`]: '' }))
    setActiveSlot(null)
  }

  function addGuestPlayer(team: 1 | 2, index: number) {
    if (!guestName.trim()) return
    const player: LivePlayer = { id: null, name: guestName.trim(), isGuest: true }
    const setter = team === 1 ? setTeam1 : setTeam2
    setter(prev => { const arr = [...prev]; arr[index] = player; return arr })
    setGuestInputActive(null)
    setGuestName('')
    setActiveSlot(null)
  }

  function removePlayer(team: 1 | 2, index: number) {
    const setter = team === 1 ? setTeam1 : setTeam2
    setter(prev => { const arr = [...prev]; arr[index] = undefined; return arr })
  }

  const streak = (() => {
    if (history.length === 0) return null
    const last = history[history.length - 1]
    let count = 0
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i] === last) count++
      else break
    }
    return { team: last, count }
  })()

  const streakNames = streak
    ? (streak.team === 1 ? team1 : team2).filter(Boolean).map((p) => (p as LivePlayer).name).join(', ')
    : ''

  const filledTeam1 = team1.filter(Boolean).length
  const filledTeam2 = team2.filter(Boolean).length
  const playersReady = filledTeam1 === maxPlayers && filledTeam2 === maxPlayers

  function renderSlot(team: 1 | 2, index: number) {
    const player = (team === 1 ? team1 : team2)[index]
    const key = `${team}_${index}`
    const query = slotQueries[key] ?? ''
    const isActive = activeSlot === key
    const isGuestInput = guestInputActive === key

    if (player) {
      return (
        <div key={key} className="flex items-center gap-1.5 px-2 py-2 rounded-lg border bg-blue-50 border-blue-200">
          <p className="flex-1 min-w-0 font-semibold text-gray-800 text-sm truncate">
            {player.name}
            {player.isGuest && <span className="ml-1 text-xs text-orange-400">(게스트)</span>}
          </p>
          <button onClick={() => removePlayer(team, index)} className="shrink-0 text-red-400 text-xs">✕</button>
        </div>
      )
    }

    return (
      <div key={key} className="relative">
        {isGuestInput ? (
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
            <button
              onMouseDown={() => addGuestPlayer(team, index)}
              className="bg-orange-400 text-white px-2 py-1 rounded-lg text-xs font-semibold"
            >추가</button>
            <button
              onMouseDown={() => { setGuestInputActive(null); setGuestName('') }}
              className="text-gray-400 text-xs px-1"
            >✕</button>
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
                {getFilteredMembers(team, index).map(m => (
                  <button
                    key={m.id}
                    onMouseDown={() => selectMember(team, index, m)}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-left border-b border-gray-100 last:border-0 hover:bg-blue-50 active:bg-blue-100 whitespace-nowrap"
                  >
                    <span className="font-medium text-gray-800 text-sm">{m.name}</span>
                    <span className="text-xs text-gray-400">{m.gender === 'M' ? '남' : '여'} · {m.birth_year}년생</span>
                  </button>
                ))}
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
      <div className={`bg-white border-b flex items-center gap-3 sticky top-0 z-10 ${isLandscape && step === 'game' ? 'px-3 py-1.5' : 'px-4 py-3'}`}>
        <button
          onClick={() => {
            if (step === 'type') router.push('/')
            else if (step === 'players') setStep('type')
            else if (step === 'game') setShowBackModal(true)
          }}
          className="text-gray-500 text-xl"
        >←</button>
        <h1 className={`font-bold flex-1 ${isLandscape && step === 'game' ? 'text-sm' : 'text-lg'}`}>라이브 스코어</h1>
        {step === 'game' && (
          <span className="text-xs text-green-500 font-semibold animate-pulse">● LIVE</span>
        )}
      </div>

      {/* 진행 단계 표시 */}
      {step !== 'game' && (
        <div className="flex bg-white border-b">
          {(['type', 'players'] as const).map((s, i) => (
            <div key={s} className={`flex-1 h-1 ${step === s ? 'bg-green-500' : i < (['type','players'] as const).indexOf(step) ? 'bg-green-200' : 'bg-gray-100'}`} />
          ))}
        </div>
      )}

      <div className={`flex flex-col gap-4 flex-1 ${isLandscape && step === 'game' ? 'p-0' : 'p-4'}`}>

        {/* STEP 1: 게임 방식 */}
        {step === 'type' && (
          <>
            <p className="text-gray-600 font-medium">게임 방식을 선택하세요</p>
            <div className="flex flex-col gap-3">
              {([
                { value: 'singles' as LiveGameType, label: '단식', desc: '1 : 1' },
                { value: 'doubles' as LiveGameType, label: '복식', desc: '2 : 2' },
              ]).map(t => (
                <button
                  key={t.value}
                  onClick={() => { setGameType(t.value); setTeam1([]); setTeam2([]); setStep('players') }}
                  className="bg-white border border-gray-200 rounded-xl p-4 text-left shadow-sm active:bg-green-50 active:border-green-300"
                >
                  <p className="font-semibold text-gray-800">{t.label}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 2: 선수 입력 */}
        {step === 'players' && (
          <>
            <div className="flex flex-col">
              <div className="bg-gray-200 border border-gray-300 rounded-t-xl py-3 text-center">
                <p className="text-sm font-semibold text-gray-500 tracking-widest">단 상</p>
              </div>
              <div className="flex border border-t-0 border-gray-200 rounded-b-xl overflow-visible bg-white shadow-sm">
                <div className="flex-1 p-3 flex flex-col gap-2 border-r border-gray-200 overflow-visible">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">팀 1</span>
                    <span className="text-xs text-gray-400">A면</span>
                  </div>
                  {Array.from({ length: maxPlayers }, (_, i) => renderSlot(1, i))}
                </div>
                <div className="flex-1 p-3 flex flex-col gap-2 overflow-visible">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-red-400 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">팀 2</span>
                    <span className="text-xs text-gray-400">B면</span>
                  </div>
                  {Array.from({ length: maxPlayers }, (_, i) => renderSlot(2, i))}
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">미등록 회원은 &quot;게스트로 직접 입력&quot;을 선택하세요</p>

            {playersReady && (
              <button
                onClick={startGame}
                className="mt-auto bg-green-500 text-white py-3 rounded-xl font-semibold text-base"
              >
                라이브 시작
              </button>
            )}
          </>
        )}

        {/* STEP 3: 라이브 스코어보드 */}
        {step === 'game' && !isLandscape && (
          <div className="flex flex-col flex-1 gap-3">
            {/* 점수 박스 (portrait) */}
            <div className="flex gap-2 flex-1">
              <button
                onClick={() => addPoint(1)}
                className={`flex-1 flex flex-col items-center justify-center rounded-2xl bg-blue-50 border-2 active:bg-blue-100 active:scale-95 transition-transform select-none ${score1 >= score2 ? 'border-blue-400' : 'border-blue-100'}`}
              >
                <span className={`font-black tabular-nums leading-none ${score1 >= score2 ? 'text-blue-500' : 'text-blue-300'}`} style={{ fontSize: 'min(22vw, 38vh)' }}>{score1}</span>
                <div className="mt-2 flex flex-col items-center gap-0.5">
                  {(team1.filter(Boolean) as LivePlayer[]).map((p, i) => (
                    <span key={i} className="text-sm text-blue-400 font-medium">{p.name}{p.isGuest && <span className="text-orange-400 text-xs ml-1">(게스트)</span>}</span>
                  ))}
                </div>
              </button>
              <button
                onClick={() => addPoint(2)}
                className={`flex-1 flex flex-col items-center justify-center rounded-2xl bg-red-50 border-2 active:bg-red-100 active:scale-95 transition-transform select-none ${score2 >= score1 ? 'border-red-400' : 'border-red-100'}`}
              >
                <span className={`font-black tabular-nums leading-none ${score2 >= score1 ? 'text-red-500' : 'text-red-300'}`} style={{ fontSize: 'min(22vw, 38vh)' }}>{score2}</span>
                <div className="mt-2 flex flex-col items-center gap-0.5">
                  {(team2.filter(Boolean) as LivePlayer[]).map((p, i) => (
                    <span key={i} className="text-sm text-red-400 font-medium">{p.name}{p.isGuest && <span className="text-orange-400 text-xs ml-1">(게스트)</span>}</span>
                  ))}
                </div>
              </button>
            </div>
            {/* 연속 득점 */}
            <div className="h-6 flex items-center justify-center">
              {streak && streak.count >= 2 ? (
                <span className={`text-sm font-bold ${streak.team === 1 ? 'text-blue-500' : 'text-red-500'}`}>🔥 {streakNames} {streak.count}연속 득점!</span>
              ) : history.length > 0 ? (
                <span className={`text-xs font-semibold ${history[history.length - 1] === 1 ? 'text-blue-500' : 'text-red-500'}`}>{(history[history.length - 1] === 1 ? team1 : team2).filter(Boolean).map(p => (p as LivePlayer).name).join(', ')} 득점!</span>
              ) : null}
            </div>
            {/* 버튼 */}
            <div className="flex gap-2">
              <button onClick={undoLast} disabled={history.length === 0} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm disabled:opacity-30 active:bg-gray-200"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
              <button onClick={handleEndWithoutSave} className="flex-1 bg-gray-500 text-white py-3 rounded-xl font-semibold text-sm active:bg-gray-600">종료</button>
              <button onClick={() => setShowEndConfirm(true)} className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-semibold text-sm active:bg-blue-600">저장</button>
            </div>
          </div>
        )}

        {/* LANDSCAPE: fixed 풀스크린 (max-w-md 제약 탈출) */}
        {step === 'game' && isLandscape && (
          <div className="fixed inset-0 bg-white flex flex-col z-40">
            {/* 미니 헤더 */}
            <div className="flex items-center gap-3 px-3 py-1.5 border-b border-gray-100 bg-white">
              <button onClick={() => setShowBackModal(true)} className="text-gray-500 text-xl">←</button>
              <h1 className="font-bold text-sm flex-1">라이브 스코어</h1>
              <span className="text-xs text-green-500 font-semibold animate-pulse">● LIVE</span>
            </div>
            {/* 점수 영역 */}
            <div className="flex flex-1 gap-2 p-2">
              <button
                onClick={() => addPoint(1)}
                className={`flex-1 flex flex-col items-center justify-center rounded-2xl bg-blue-50 border-2 active:bg-blue-100 active:scale-95 transition-transform select-none ${score1 >= score2 ? 'border-blue-400' : 'border-blue-100'}`}
              >
                <span className={`font-black tabular-nums leading-none ${score1 >= score2 ? 'text-blue-500' : 'text-blue-300'}`} style={{ fontSize: 'min(38vw, 50vh)' }}>{score1}</span>
                <div className="mt-1 flex flex-col items-center gap-0.5">
                  {(team1.filter(Boolean) as LivePlayer[]).map((p, i) => (
                    <span key={i} className="text-sm text-blue-400 font-semibold">{p.name}{p.isGuest && <span className="text-orange-400 text-xs ml-1">(게스트)</span>}</span>
                  ))}
                </div>
              </button>
              <button
                onClick={() => addPoint(2)}
                className={`flex-1 flex flex-col items-center justify-center rounded-2xl bg-red-50 border-2 active:bg-red-100 active:scale-95 transition-transform select-none ${score2 >= score1 ? 'border-red-400' : 'border-red-100'}`}
              >
                <span className={`font-black tabular-nums leading-none ${score2 >= score1 ? 'text-red-500' : 'text-red-300'}`} style={{ fontSize: 'min(38vw, 50vh)' }}>{score2}</span>
                <div className="mt-1 flex flex-col items-center gap-0.5">
                  {(team2.filter(Boolean) as LivePlayer[]).map((p, i) => (
                    <span key={i} className="text-sm text-red-400 font-semibold">{p.name}{p.isGuest && <span className="text-orange-400 text-xs ml-1">(게스트)</span>}</span>
                  ))}
                </div>
              </button>
            </div>
            {/* 하단 바 */}
            <div className="flex items-center gap-2 px-2 py-1.5 border-t border-gray-100 bg-white">
              <div className="flex-1 text-center">
                {streak && streak.count >= 2 ? (
                  <span className={`text-xs font-bold ${streak.team === 1 ? 'text-blue-500' : 'text-red-500'}`}>🔥 {streakNames} {streak.count}연속!</span>
                ) : history.length > 0 ? (
                  <span className={`text-xs font-semibold ${history[history.length - 1] === 1 ? 'text-blue-500' : 'text-red-500'}`}>{(history[history.length - 1] === 1 ? team1 : team2).filter(Boolean).map(p => (p as LivePlayer).name).join(', ')} 득점!</span>
                ) : <span className="text-xs text-gray-300">탭하면 득점</span>}
              </div>
              <button onClick={undoLast} disabled={history.length === 0} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-xl font-semibold text-xs disabled:opacity-30 active:bg-gray-200"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
              <button onClick={handleEndWithoutSave} className="bg-gray-500 text-white px-3 py-2 rounded-xl font-semibold text-xs active:bg-gray-600">종료</button>
              <button onClick={() => setShowEndConfirm(true)} className="bg-blue-500 text-white px-3 py-2 rounded-xl font-semibold text-xs active:bg-blue-600">저장</button>
            </div>
          </div>
        )}
      </div>

      {/* 저장 확인 모달 (저장 버튼) */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => !ending && setShowEndConfirm(false)}>
          <div className="bg-white w-full rounded-t-2xl p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg text-gray-800 text-center">경기 결과를 저장하시겠습니까?</h2>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  {(team1.filter(Boolean) as LivePlayer[]).map((p, i) => (
                    <p key={i} className="font-semibold text-gray-800 text-sm">{p.name}</p>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${score1 > score2 ? 'text-blue-500' : 'text-gray-500'}`}>{score1}</span>
                  <span className="text-gray-300">:</span>
                  <span className={`text-2xl font-bold ${score2 > score1 ? 'text-red-400' : 'text-gray-500'}`}>{score2}</span>
                </div>
                <div className="text-center">
                  {(team2.filter(Boolean) as LivePlayer[]).map((p, i) => (
                    <p key={i} className="font-semibold text-gray-800 text-sm">{p.name}</p>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                disabled={ending}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleEndGame}
                disabled={ending}
                className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                {ending ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 뒤로가기 모달 */}
      {showBackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => !ending && setShowBackModal(false)}>
          <div className="bg-white w-full rounded-t-2xl p-6 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg text-gray-800 text-center">저장하지 않고 뒤로가시겠습니까?</h2>
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setShowBackModal(false)}
                disabled={ending}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleEndWithoutSave}
                disabled={ending}
                className="flex-1 bg-red-400 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                뒤로가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
