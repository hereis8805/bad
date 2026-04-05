'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase, type Member } from '@/lib/supabase'

const CATEGORIES = ['규칙 제안', '앱 기능', '시설·장비', '기록 수정', '회원 등록', '기타']

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

export default function RequestPage() {
  const [nameQuery, setNameQuery] = useState('')
  const [selectedName, setSelectedName] = useState<string | null>(null) // null = 익명
  const [nameChosen, setNameChosen] = useState(false) // 한 번이라도 선택했는지
  const [nameOpen, setNameOpen] = useState(false)
  const [allMembers, setAllMembers] = useState<Member[]>([])

  const [category, setCategory] = useState(CATEGORIES[0])
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.from('members').select('*').order('name').then(({ data }) => {
      setAllMembers(data ?? [])
    })
  }, [])

  const filteredMembers = allMembers.filter(m => matchesSearch(m.name, nameQuery))

  function selectName(name: string | null) {
    setSelectedName(name)
    setNameChosen(true)
    setNameQuery('')
    setNameOpen(false)
  }

  function resetName() {
    setNameChosen(false)
    setSelectedName(null)
    setNameOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)

    await supabase.from('requests').insert({
      name: selectedName,
      category,
      message: message.trim(),
    })

    setSubmitting(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-6 gap-4">
        <div className="text-4xl">✅</div>
        <p className="text-lg font-bold text-gray-800">요청이 접수됐습니다</p>
        <p className="text-sm text-gray-400 text-center">운영진이 확인 후 반영하겠습니다</p>
        <Link href="/" className="mt-4 bg-blue-500 text-white px-8 py-3 rounded-xl font-semibold text-sm">
          홈으로
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/" className="text-gray-500 text-xl">←</Link>
        <h1 className="font-bold text-lg">요청 · 건의</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4 flex-1">
        <p className="text-sm text-gray-500">운영진에게 건의사항이나 요청을 남겨주세요.</p>

        {/* 이름 선택 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500">이름</label>

          {/* 선택된 상태 */}
          {nameChosen ? (
            <div className="flex items-center gap-3 px-4 py-2.5 border border-blue-200 bg-blue-50 rounded-xl">
              <span className="flex-1 text-sm font-medium text-gray-800">
                {selectedName ?? '익명'}
              </span>
              <button type="button" onClick={resetName} className="text-red-400 text-xs">
                변경
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                placeholder="검색(초성가능) 또는 익명 선택"
                value={nameQuery}
                onFocus={() => setNameOpen(true)}
                onBlur={() => setTimeout(() => setNameOpen(false), 200)}
                onChange={e => { setNameQuery(e.target.value); setNameOpen(true) }}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 bg-white"
              />
              {nameOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto">
                  {/* 익명 옵션 (맨 위 고정) */}
                  <button
                    type="button"
                    onMouseDown={() => selectName(null)}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left border-b-2 border-gray-100 hover:bg-gray-50 active:bg-gray-100"
                  >
                    <span className="font-medium text-gray-400 text-sm">익명</span>
                    <span className="text-xs text-gray-300">이름을 남기지 않습니다</span>
                  </button>

                  {filteredMembers.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400 text-center">검색 결과 없음</p>
                  ) : filteredMembers.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onMouseDown={() => selectName(m.name)}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left border-b border-gray-100 last:border-0 hover:bg-blue-50 active:bg-blue-100"
                    >
                      <span className="font-medium text-gray-800 text-sm">{m.name}</span>
                      <span className="text-xs text-gray-400">{m.gender === 'M' ? '남' : '여'} · {m.birth_year}년생</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 분류 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500">분류</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  category === c
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* 내용 */}
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-medium text-gray-500">내용 <span className="text-red-400">*</span></label>
          <textarea
            placeholder="자유롭게 작성해 주세요"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={6}
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 bg-white resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={!message.trim() || submitting}
          className="bg-blue-500 text-white py-3 rounded-xl font-semibold text-base disabled:opacity-50 mt-auto"
        >
          {submitting ? '제출 중...' : '제출하기'}
        </button>
      </form>
    </div>
  )
}
