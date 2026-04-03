'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, type Member, type Gender, type SkillLevel } from '@/lib/supabase'

const SKILL_LEVELS: SkillLevel[] = ['A', 'B', 'C', 'D', '초심']
const SKILL_COLORS: Record<SkillLevel, string> = {
  A: 'bg-red-100 text-red-700',
  B: 'bg-orange-100 text-orange-700',
  C: 'bg-yellow-100 text-yellow-700',
  D: 'bg-green-100 text-green-700',
  '초심': 'bg-gray-100 text-gray-600',
}

const CURRENT_YEAR = new Date().getFullYear()

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({
    name: '',
    gender: 'M' as Gender,
    skill_level: '초심' as SkillLevel,
    birth_year: '',
  })

  useEffect(() => {
    fetchMembers()
  }, [])

  async function fetchMembers() {
    const { data } = await supabase
      .from('members')
      .select('*')
      .order('name')
    setMembers(data ?? [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.birth_year) return
    setSubmitting(true)
    await supabase.from('members').insert({
      name: form.name.trim(),
      gender: form.gender,
      skill_level: form.skill_level,
      birth_year: parseInt(form.birth_year),
    })
    setForm({ name: '', gender: 'M', skill_level: '초심', birth_year: '' })
    setShowForm(false)
    await fetchMembers()
    setSubmitting(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`${name} 회원을 삭제할까요?`)) return
    await supabase.from('members').delete().eq('id', id)
    await fetchMembers()
  }

  const filtered = members.filter(m =>
    m.name.includes(search)
  )

  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin" className="text-gray-500 text-xl">←</Link>
        <h1 className="font-bold text-lg flex-1">회원 관리</h1>
        <span className="text-sm text-gray-500">{members.length}명</span>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* 검색 */}
        <input
          type="text"
          placeholder="검색(초성가능)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm bg-white outline-none focus:border-blue-400"
        />

        {/* 회원 목록 */}
        {loading ? (
          <p className="text-center text-gray-400 py-8">불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8">
            {search ? '검색 결과 없음' : '등록된 회원이 없습니다'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(member => (
              <div key={member.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm border border-gray-100">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{member.name}</span>
                    <span className="text-xs text-gray-400">{member.gender === 'M' ? '남' : '여'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SKILL_COLORS[member.skill_level as SkillLevel]}`}>
                      {member.skill_level}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{member.birth_year}년생 · {CURRENT_YEAR - member.birth_year}세</p>
                </div>
                <button
                  onClick={() => handleDelete(member.id, member.name)}
                  className="text-red-400 text-sm px-2 py-1 rounded active:bg-red-50"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 회원 추가 폼 (슬라이드업) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-20 flex items-end" onClick={() => setShowForm(false)}>
          <form
            className="bg-white w-full max-w-md mx-auto rounded-t-2xl p-5 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2 className="font-bold text-base">회원 추가</h2>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">이름</label>
              <input
                type="text"
                placeholder="이름 입력"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                required
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">성별</label>
              <div className="flex gap-2">
                {(['M', 'F'] as Gender[]).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, gender: g }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.gender === g
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {g === 'M' ? '남' : '여'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">실력</label>
              <div className="flex gap-2">
                {SKILL_LEVELS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, skill_level: s }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.skill_level === s
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">출생년도</label>
              <input
                type="number"
                placeholder="예: 1990"
                value={form.birth_year}
                onChange={e => setForm(f => ({ ...f, birth_year: e.target.value }))}
                min={1940}
                max={CURRENT_YEAR}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-500 text-white py-3 rounded-xl font-semibold text-base disabled:opacity-50"
            >
              {submitting ? '저장 중...' : '추가하기'}
            </button>
          </form>
        </div>
      )}

      {/* 하단 추가 버튼 */}
      <div className="p-4 bg-white border-t sticky bottom-0">
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold text-base shadow active:bg-blue-600"
        >
          + 회원 추가
        </button>
      </div>
    </div>
  )
}
