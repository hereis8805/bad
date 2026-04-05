'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Settings = {
  show_overall_stats: boolean
  show_personal_stats: boolean
}

export default function Home() {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    supabase
      .from('settings')
      .select('key, value')
      .then(({ data }) => {
        const result: Settings = { show_overall_stats: true, show_personal_stats: true }
        for (const row of data ?? []) {
          if (row.key === 'show_overall_stats') result.show_overall_stats = row.value === 'true'
          if (row.key === 'show_personal_stats') result.show_personal_stats = row.value === 'true'
        }
        setSettings(result)
      })
  }, [])

  return (
    <main className="flex flex-col min-h-screen">

      {/* 헤더 */}
      <div className="bg-blue-500 px-5 pt-12 pb-8 text-center">
        <p className="text-blue-100 text-xs font-semibold tracking-widest uppercase">Badminton Club</p>
        <h1 className="text-white text-2xl font-bold mt-1.5">슬기로운 내정 생활 🏸</h1>
        <p className="text-blue-200 text-sm mt-1">경기 기록 & 통계</p>
      </div>

      {/* 메뉴 */}
      <div className="flex flex-col gap-2.5 p-4">

        {/* 주요 액션 */}
        <Link
          href="/record"
          className="bg-blue-500 rounded-2xl p-4 flex items-center gap-3.5 shadow-md active:opacity-90"
        >
          <span className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-xl shrink-0">✏️</span>
          <div className="flex-1">
            <p className="text-white font-bold text-base">경기 결과 입력</p>
            <p className="text-blue-100 text-xs mt-0.5">경기 결과를 기록하세요</p>
          </div>
          <span className="text-white/50 text-xl">›</span>
        </Link>

        {/* 보조 메뉴 */}
        <Link
          href="/games"
          className="bg-white rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border border-gray-100 active:bg-gray-50"
        >
          <span className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-xl shrink-0">📋</span>
          <div className="flex-1">
            <p className="text-gray-800 font-semibold">오늘의 경기 목록</p>
            <p className="text-gray-400 text-xs mt-0.5">오늘 진행된 경기 확인</p>
          </div>
          <span className="text-gray-300 text-xl">›</span>
        </Link>

        {settings?.show_personal_stats && (
          <Link
            href="/stats"
            className="bg-white rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border border-gray-100 active:bg-gray-50"
          >
            <span className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-xl shrink-0">👤</span>
            <div className="flex-1">
              <p className="text-gray-800 font-semibold">개인 통계</p>
              <p className="text-gray-400 text-xs mt-0.5">나의 전적과 승률 분석</p>
            </div>
            <span className="text-gray-300 text-xl">›</span>
          </Link>
        )}

        {settings?.show_overall_stats && (
          <Link
            href="/overall"
            className="bg-white rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border border-gray-100 active:bg-gray-50"
          >
            <span className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-xl shrink-0">🏆</span>
            <div className="flex-1">
              <p className="text-gray-800 font-semibold">전체 통계</p>
              <p className="text-gray-400 text-xs mt-0.5">랭킹 및 전체 현황</p>
            </div>
            <span className="text-gray-300 text-xl">›</span>
          </Link>
        )}

        <Link
          href="/request"
          className="bg-white rounded-2xl p-4 flex items-center gap-3.5 shadow-sm border border-gray-100 active:bg-gray-50"
        >
          <span className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-xl shrink-0">💬</span>
          <div className="flex-1">
            <p className="text-gray-800 font-semibold">요청 · 건의</p>
            <p className="text-gray-400 text-xs mt-0.5">의견을 남겨주세요</p>
          </div>
          <span className="text-gray-300 text-xl">›</span>
        </Link>

        {/* 라이브 */}
        <div className="flex gap-2 mt-1">
          <Link
            href="/live"
            className="flex-1 bg-green-500 text-white py-3.5 rounded-2xl font-semibold shadow-sm active:bg-green-600 flex items-center justify-center gap-1.5"
          >
            <span>🎯</span> 라이브 등록
          </Link>
          <Link
            href="/live/watch"
            className="flex-1 bg-indigo-500 text-white py-3.5 rounded-2xl font-semibold shadow-sm active:bg-indigo-600 flex items-center justify-center gap-1.5"
          >
            <span>📡</span> 라이브 보기
          </Link>
        </div>
      </div>

      <div className="mt-auto pb-6 text-center">
        <Link href="/admin" className="text-gray-300 text-xs">관리자</Link>
      </div>
    </main>
  )
}
