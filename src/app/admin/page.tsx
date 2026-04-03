'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [pw, setPw] = useState('')
  const [authed, setAuthed] = useState(false)
  const [error, setError] = useState(false)
  const router = useRouter()

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (pw === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAuthed(true)
      setError(false)
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_authed', 'true')
      }
    } else {
      setError(true)
    }
  }

  useEffect(() => {
    // 페이지 로드 시 기존 인증 상태 복구
    if (typeof window !== 'undefined') {
      const isAuthed = localStorage.getItem('admin_authed') === 'true'
      if (isAuthed) {
        setAuthed(true)
      }
    }
  }, [])

  if (!authed) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-6">
        <h1 className="text-xl font-bold mb-6 text-gray-700">관리자 로그인</h1>
        <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
          <input
            type="password"
            placeholder="비밀번호"
            value={pw}
            onChange={e => setPw(e.target.value)}
            className="border border-gray-200 rounded-lg px-4 py-3 text-base outline-none focus:border-blue-400"
          />
          {error && <p className="text-red-500 text-sm text-center">비밀번호가 틀렸습니다</p>}
          <button
            type="submit"
            className="bg-blue-500 text-white py-3 rounded-xl font-semibold"
          >
            확인
          </button>
          <Link href="/" className="text-center text-gray-400 text-sm mt-2">← 홈으로</Link>
        </form>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen p-4">
      <div className="flex items-center gap-3 py-3 mb-4">
        <Link href="/" className="text-gray-500 text-xl">←</Link>
        <h1 className="font-bold text-lg">관리자</h1>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/admin/games"
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between"
        >
          <div>
            <p className="font-semibold text-gray-800">게임 관리</p>
            <p className="text-xs text-gray-400 mt-0.5">게임 목록 · 삭제</p>
          </div>
          <span className="text-gray-400 text-lg">→</span>
        </Link>

        <Link
          href="/admin/members"
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between"
        >
          <div>
            <p className="font-semibold text-gray-800">회원 관리</p>
            <p className="text-xs text-gray-400 mt-0.5">회원 추가 · 삭제</p>
          </div>
          <span className="text-gray-400 text-lg">→</span>
        </Link>

        <Link
          href="/admin/requests"
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between"
        >
          <div>
            <p className="font-semibold text-gray-800">요청 · 건의 관리</p>
            <p className="text-xs text-gray-400 mt-0.5">회원 건의사항 확인</p>
          </div>
          <span className="text-gray-400 text-lg">→</span>
        </Link>

        <Link
          href="/admin/settings"
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between"
        >
          <div>
            <p className="font-semibold text-gray-800">통계 공개 설정</p>
            <p className="text-xs text-gray-400 mt-0.5">전체·개인 통계 메뉴 공개 여부</p>
          </div>
          <span className="text-gray-400 text-lg">→</span>
        </Link>
      </div>
    </div>
  )
}
