'use client';

import { useEffect, useState } from 'react';
import StarRating from '@/app/components/StarRating';

type EditRequest = {
  id: string;
  status: string;
  reason: string | null;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  proposed: {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    attributes?: {
      machineCount?: number | null;
      dollTypes?: string;
      pricePerPlay?: number | null;
      winProbability?: string;
    };
  };
  spot: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    attributes: {
      machineCount?: number | null;
      dollTypes?: string;
      pricePerPlay?: number | null;
      winProbability?: string;
    };
  };
};

type Report = {
  id: string;
  targetType: string;
  reason: string;
  detail: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  spot: { id: string; name: string; address: string } | null;
  review: {
    id: string;
    rating: number;
    comment: string | null;
    attributes: { triesCount?: number | null; dollTypes?: string };
  } | null;
};

function DiffRow({ label, current, proposed }: { label: string; current: unknown; proposed: unknown }) {
  const changed = String(current ?? '') !== String(proposed ?? '');
  return (
    <tr className={changed ? 'bg-amber-50' : ''}>
      <td className="px-2 py-1 text-xs text-gray-500 font-medium w-24">{label}</td>
      <td className="px-2 py-1 text-xs text-gray-700">{String(current ?? '-')}</td>
      <td className="px-2 py-1 text-xs font-semibold text-amber-700">{changed ? String(proposed ?? '-') : <span className="text-gray-400">변경 없음</span>}</td>
    </tr>
  );
}

function EditCard({ item, onAction }: { item: EditRequest; onAction: () => void }) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  async function act(action: 'approve' | 'reject') {
    setLoading(true);
    await fetch(`/api/admin/edit-requests/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, adminNote: note }),
    });
    onAction();
  }

  const isPending = item.status === 'pending';

  return (
    <div className={`border rounded-xl p-4 space-y-3 ${isPending ? 'bg-white' : 'bg-gray-50 opacity-70'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-gray-800">{item.spot.name}</p>
          <p className="text-xs text-gray-500">{item.spot.address}</p>
          {item.reason && <p className="text-xs text-amber-600 mt-0.5">사유: {item.reason}</p>}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
          item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
          item.status === 'approved' ? 'bg-green-100 text-green-700' :
          'bg-red-100 text-red-700'
        }`}>
          {item.status === 'pending' ? '대기중' : item.status === 'approved' ? '승인됨' : '거절됨'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-xs text-gray-400">
              <th className="px-2 py-1 text-left w-24">항목</th>
              <th className="px-2 py-1 text-left">현재</th>
              <th className="px-2 py-1 text-left text-amber-600">수정 요청</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <DiffRow label="상호명" current={item.spot.name} proposed={item.proposed.name} />
            <DiffRow label="주소" current={item.spot.address} proposed={item.proposed.address} />
            <DiffRow label="위도" current={item.spot.latitude?.toFixed(5)} proposed={item.proposed.latitude?.toFixed(5)} />
            <DiffRow label="경도" current={item.spot.longitude?.toFixed(5)} proposed={item.proposed.longitude?.toFixed(5)} />
            <DiffRow label="기계 대수" current={item.spot.attributes.machineCount} proposed={item.proposed.attributes?.machineCount} />
            <DiffRow label="인형 종류" current={item.spot.attributes.dollTypes} proposed={item.proposed.attributes?.dollTypes} />
            <DiffRow label="1판 가격" current={item.spot.attributes.pricePerPlay} proposed={item.proposed.attributes?.pricePerPlay} />
            <DiffRow label="뽑힐 확률" current={item.spot.attributes.winProbability} proposed={item.proposed.attributes?.winProbability} />
          </tbody>
        </table>
      </div>

      {isPending && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="관리자 메모 (선택)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <div className="flex gap-2">
            <button onClick={() => act('approve')} disabled={loading}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors">
              ✓ 승인
            </button>
            <button onClick={() => act('reject')} disabled={loading}
              className="flex-1 bg-red-400 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors">
              ✗ 거절
            </button>
          </div>
        </div>
      )}
      {!isPending && item.adminNote && (
        <p className="text-xs text-gray-500 italic">메모: {item.adminNote}</p>
      )}
      <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString('ko-KR')}</p>
    </div>
  );
}

function ReportCard({ item, onAction }: { item: Report; onAction: () => void }) {
  const [note, setNote] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(false);
  const [loading, setLoading] = useState(false);

  async function act(action: 'resolve' | 'dismiss') {
    setLoading(true);
    await fetch(`/api/admin/reports/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, adminNote: note, deleteTarget }),
    });
    onAction();
  }

  const isPending = item.status === 'pending';

  return (
    <div className={`border rounded-xl p-4 space-y-3 ${isPending ? 'bg-white' : 'bg-gray-50 opacity-70'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mr-2 ${
            item.targetType === 'spot' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          }`}>
            {item.targetType === 'spot' ? '매장' : '후기'}
          </span>
          <span className="font-bold text-gray-800">{item.spot?.name ?? '(삭제된 항목)'}</span>
          <p className="text-xs text-gray-500 mt-0.5">{item.spot?.address}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
          item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
          item.status === 'resolved' ? 'bg-green-100 text-green-700' :
          'bg-gray-100 text-gray-500'
        }`}>
          {item.status === 'pending' ? '대기중' : item.status === 'resolved' ? '처리됨' : '무시됨'}
        </span>
      </div>

      <div className="bg-red-50 rounded-lg px-3 py-2 text-sm">
        <p className="font-semibold text-red-700">신고 사유: {item.reason}</p>
        {item.detail && <p className="text-red-600 mt-1 text-xs">{item.detail}</p>}
      </div>

      {item.review && (
        <div className="bg-purple-50 rounded-lg px-3 py-2 text-sm space-y-1">
          <StarRating value={item.review.rating} readonly size="sm" />
          {item.review.attributes.triesCount != null && (
            <p className="text-xs text-gray-600">{item.review.attributes.triesCount}판 만에 뽑음</p>
          )}
          {item.review.comment && <p className="text-xs text-gray-700">"{item.review.comment}"</p>}
        </div>
      )}

      {isPending && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="관리자 메모 (선택)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <label className="flex items-center gap-2 text-sm text-red-600 cursor-pointer">
            <input type="checkbox" checked={deleteTarget} onChange={(e) => setDeleteTarget(e.target.checked)}
              className="accent-red-500" />
            처리 시 해당 {item.targetType === 'spot' ? '매장' : '후기'} 삭제
          </label>
          <div className="flex gap-2">
            <button onClick={() => act('resolve')} disabled={loading}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors">
              ✓ 처리 완료
            </button>
            <button onClick={() => act('dismiss')} disabled={loading}
              className="flex-1 bg-gray-400 hover:bg-gray-500 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors">
              무시
            </button>
          </div>
        </div>
      )}
      {!isPending && item.adminNote && (
        <p className="text-xs text-gray-500 italic">메모: {item.adminNote}</p>
      )}
      <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString('ko-KR')}</p>
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState<'edits' | 'reports'>('edits');
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
      loadData();
    } else {
      setLoginError('비밀번호가 틀렸습니다.');
    }
  }

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    setAuthed(false);
    setPassword('');
  }

  async function loadData() {
    const [editsRes, reportsRes] = await Promise.all([
      fetch('/api/admin/edit-requests'),
      fetch('/api/admin/reports'),
    ]);
    if (editsRes.ok) setEditRequests(await editsRes.json());
    if (reportsRes.ok) setReports(await reportsRes.json());
  }

  useEffect(() => {
    // Check if already authed
    fetch('/api/admin/edit-requests').then((r) => {
      if (r.ok) { setAuthed(true); r.json().then(setEditRequests); }
    });
    fetch('/api/admin/reports').then((r) => {
      if (r.ok) r.json().then(setReports);
    });
  }, []);

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <form onSubmit={login} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-gray-800 text-center">관리자 로그인</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoFocus
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
          <button type="submit"
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-2.5 rounded-lg transition-colors">
            로그인
          </button>
        </form>
      </div>
    );
  }

  const filteredEdits = filter === 'pending'
    ? editRequests.filter((r) => r.status === 'pending')
    : editRequests;
  const filteredReports = filter === 'pending'
    ? reports.filter((r) => r.status === 'pending')
    : reports;

  const pendingEdits = editRequests.filter((r) => r.status === 'pending').length;
  const pendingReports = reports.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-lg">관리자 대시보드</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">인형뽑기 성지</span>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-white transition-colors">
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-3xl font-black text-amber-500">{pendingEdits}</p>
            <p className="text-sm text-gray-500 mt-1">대기중 수정 요청</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-3xl font-black text-red-500">{pendingReports}</p>
            <p className="text-sm text-gray-500 mt-1">대기중 신고</p>
          </div>
        </div>

        {/* Tabs + Filter */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('edits')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                tab === 'edits' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              수정 요청 {pendingEdits > 0 && <span className="ml-1 bg-white/30 px-1.5 rounded-full">{pendingEdits}</span>}
            </button>
            <button
              onClick={() => setTab('reports')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                tab === 'reports' ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              신고 {pendingReports > 0 && <span className="ml-1 bg-white/30 px-1.5 rounded-full">{pendingReports}</span>}
            </button>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'pending' | 'all')}
            className="text-sm border rounded-lg px-2 py-1.5 bg-white focus:outline-none"
          >
            <option value="pending">대기중만</option>
            <option value="all">전체 보기</option>
          </select>
        </div>

        {/* Content */}
        {tab === 'edits' && (
          <div className="space-y-3">
            {filteredEdits.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">대기중인 수정 요청이 없습니다.</div>
            ) : (
              filteredEdits.map((item) => (
                <EditCard key={item.id} item={item} onAction={loadData} />
              ))
            )}
          </div>
        )}

        {tab === 'reports' && (
          <div className="space-y-3">
            {filteredReports.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">대기중인 신고가 없습니다.</div>
            ) : (
              filteredReports.map((item) => (
                <ReportCard key={item.id} item={item} onAction={loadData} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
