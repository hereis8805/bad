import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const { data } = await supabase.from('app_settings').select('key, value')

  const settings = { show_overall_stats: true, show_personal_stats: true }
  for (const row of data ?? []) {
    if (row.key === 'show_overall_stats') settings.show_overall_stats = row.value === 'true'
    if (row.key === 'show_personal_stats') settings.show_personal_stats = row.value === 'true'
  }

  return (
    <main className="flex flex-col min-h-screen p-4">
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-gray-800">슬기로운 내정 생활 🏸</h1>
        <p className="text-gray-500 mt-1 text-sm">경기 기록 & 통계</p>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <Link
          href="/record"
          className="bg-blue-500 text-white text-center py-4 rounded-xl text-lg font-semibold shadow active:bg-blue-600"
        >
          경기 결과 입력
        </Link>
        <Link
          href="/games"
          className="bg-white text-gray-700 text-center py-4 rounded-xl text-lg font-semibold shadow border border-gray-200 active:bg-gray-50"
        >
          오늘의 경기 목록
        </Link>
        {settings.show_personal_stats && (
          <Link
            href="/stats"
            className="bg-white text-gray-700 text-center py-4 rounded-xl text-lg font-semibold shadow border border-gray-200 active:bg-gray-50"
          >
            개인 통계
          </Link>
        )}
        {settings.show_overall_stats && (
          <Link
            href="/overall"
            className="bg-white text-gray-700 text-center py-4 rounded-xl text-lg font-semibold shadow border border-gray-200 active:bg-gray-50"
          >
            전체 통계
          </Link>
        )}
        <Link
          href="/request"
          className="bg-white text-gray-700 text-center py-4 rounded-xl text-lg font-semibold shadow border border-gray-200 active:bg-gray-50"
        >
          요청 · 건의
        </Link>
      </div>

      <div className="mt-auto pt-8 text-center">
        <Link href="/admin" className="text-gray-400 text-xs underline">
          관리자
        </Link>
      </div>
    </main>
  )
}
