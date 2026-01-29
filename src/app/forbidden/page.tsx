import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="text-sm font-semibold text-slate-500">403</div>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Access forbidden</h1>
        <p className="mt-2 text-slate-600">
          Your session is valid, but your account doesn’t have permission to open this page for the selected company.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Go to dashboard
          </Link>
          <Link
            href="/select-company"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Switch company
          </Link>
        </div>
      </div>
    </div>
  );
}

