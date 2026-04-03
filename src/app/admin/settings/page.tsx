'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type SettingKey = 'show_overall_stats' | 'show_personal_stats'

const SETTINGS: { key: SettingKey; label: string; desc: string }[] = [
  { key: 'show_overall_stats', label: '전체 통계 공개', desc: '홈 화면에 전체 통계 메뉴를 표시합니다' },
  { key: 'show_personal_stats', label: '개인 통계 공개', desc: '홈 화면에 개인 통계 메뉴를 표시합니다' },
]

export default function AdminSettingsPage() {
  const router = useRouter()
  const [values, setValues] = useState<Record<SettingKey, boolean>>({
    show_overall_stats: true,
    show_personal_stats: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<SettingKey | null>(null)

  useEffect(() => {
    // 관리자 인증 확인
    if (typeof window !== 'undefined') {
      const isAuthed = localStorage.getItem('admin_authed') === 'true'
      if (!isAuthed) {
        router.push('/admin')
        return
      }
    }

    supabase
      .from('settings')
      .select('key, value')
      .then(({ data }) => {
        if (data) {
          const map: Partial<Record<SettingKey, boolean>> = {}
          for (const row of data) {
            map[row.key as SettingKey] = row.value === 'true'
          }
          setValues(prev => ({ ...prev, ...map }))
        }
        setLoading(false)
      })
  }, [])

  async function toggle(key: SettingKey) {
    const next = !values[key]
    setSaving(key)
    setValues(prev => ({ ...prev, [key]: next }))

    await supabase
      .from('settings')
      .upsert({ key, value: String(next) }, { onConflict: 'key' })

    setSaving(null)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin" className="text-gray-500 text-xl">←</Link>
        <h1 className="font-bold text-lg">통계 공개 설정</h1>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          <p className="text-center text-gray-400 py-8">불러오는 중...</p>
        ) : (
          SETTINGS.map(s => (
            <div
              key={s.key}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4"
            >
              <div className="flex-1">
                <p className="font-semibold text-gray-800 text-sm">{s.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
              </div>
              <button
                onClick={() => toggle(s.key)}
                disabled={saving === s.key}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                  values[s.key] ? 'bg-blue-500' : 'bg-gray-200'
                } ${saving === s.key ? 'opacity-50' : ''}`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    values[s.key] ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))
        )}

        <p className="text-xs text-gray-400 text-center mt-2">
          변경 즉시 홈 화면에 반영됩니다
        </p>
      </div>
    </div>
  )
}
