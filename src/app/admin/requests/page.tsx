'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Request = {
  id: string
  name: string | null
  category: string
  message: string
  status: 'pending' | 'done'
  created_at: string
}

const STATUS_LABEL: Record<string, string> = {
  pending: '미확인',
  done: '완료',
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    const { data } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false })
    setRequests(data ?? [])
    setLoading(false)
  }

  async function toggleStatus(req: Request) {
    const next = req.status === 'pending' ? 'done' : 'pending'
    await supabase.from('requests').update({ status: next }).eq('id', req.id)
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: next } : r))
  }

  async function deleteRequest(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('requests').delete().eq('id', id)
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)
  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin" className="text-gray-500 text-xl">←</Link>
        <h1 className="font-bold text-lg">요청 · 건의 목록</h1>
        {pendingCount > 0 && (
          <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {pendingCount}
          </span>
        )}
      </div>

      {/* 필터 탭 */}
      <div className="flex bg-white border-b">
        {(['all', 'pending', 'done'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              filter === f ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400'
            }`}
          >
            {f === 'all' ? '전체' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="p-4 flex flex-col gap-3">
        {loading && <p className="text-center text-gray-400 py-8">불러오는 중...</p>}

        {!loading && filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8">요청이 없습니다</p>
        )}

        {filtered.map(req => (
          <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{req.category}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  req.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                }`}>
                  {STATUS_LABEL[req.status]}
                </span>
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {new Date(req.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{req.message}</p>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">{req.name ?? '익명'}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleStatus(req)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                    req.status === 'pending'
                      ? 'border-green-300 text-green-600 active:bg-green-50'
                      : 'border-gray-200 text-gray-400 active:bg-gray-50'
                  }`}
                >
                  {req.status === 'pending' ? '완료 처리' : '미확인으로'}
                </button>
                <button
                  onClick={() => deleteRequest(req.id)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium border border-red-200 text-red-400 active:bg-red-50"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
