import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen p-4">
      {/* 헤더 */}
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-gray-800">🏸 내정 클럽</h1>
        <p className="text-gray-500 mt-1 text-sm">경기 기록 & 통계</p>
      </div>

      {/* 메뉴 */}
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
        <Link
          href="/stats"
          className="bg-white text-gray-700 text-center py-4 rounded-xl text-lg font-semibold shadow border border-gray-200 active:bg-gray-50"
        >
          개인 통계
        </Link>
      </div>

      {/* 관리자 링크 */}
      <div className="mt-auto pt-8 text-center">
        <Link href="/admin" className="text-gray-400 text-xs underline">
          관리자
        </Link>
      </div>
    </main>
  );
}
