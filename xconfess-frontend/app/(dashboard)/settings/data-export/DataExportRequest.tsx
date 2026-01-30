'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Download, Clock, AlertCircle } from 'lucide-react';

export default function DataExportRequest() {
  const [exportReq, setExportReq] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Poll for updates if the status is PENDING or PROCESSING
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (exportReq?.status === 'PENDING' || exportReq?.status === 'PROCESSING') {
      interval = setInterval(checkStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [exportReq]);

  const checkStatus = async () => {
    const res = await fetch('/api/data-export/status');
    const data = await res.json();
    setExportReq(data);
  };

  const handleRequest = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data-export/request', { method: 'POST' });
      const data = await res.json();
      setExportReq(data);
    } catch (err) {
      console.error("Export request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl p-8 bg-white rounded-2xl border border-slate-200">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Export Your Data</h1>
        <p className="text-slate-500 mt-2">
          Request a download of all your personal information, confessions, and activity logs.
        </p>
      </header>

      {/* GDPR Info Box */}
      <div className="flex gap-4 p-4 mb-8 bg-slate-50 rounded-xl border border-slate-100">
        <ShieldCheck className="text-indigo-600 w-6 h-6 shrink-0" />
        <div>
          <h4 className="font-semibold text-slate-800 text-sm">Privacy & Portability</h4>
          <p className="text-xs text-slate-600 leading-relaxed mt-1">
            To comply with GDPR, we provide your data in JSON (for machines) and CSV (for humans) formats. 
            Once your file is ready, you have 24 hours to download it before the link expires.
          </p>
        </div>
      </div>

      {/* Main Action Area */}
      <div className="bg-white border rounded-xl p-6">
        {!exportReq || exportReq.status === 'EXPIRED' ? (
          <div className="text-center py-4">
            <button
              onClick={handleRequest}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition-all disabled:bg-slate-300"
            >
              {loading ? 'Initiating...' : 'Generate New Archive'}
            </button>
            <p className="text-[11px] text-slate-400 mt-3 italic">
              You can request an export once every 7 days.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${exportReq.status === 'READY' ? 'bg-green-100' : 'bg-amber-100'}`}>
                {exportReq.status === 'READY' ? <Download className="text-green-600" /> : <Clock className="text-amber-600 animate-pulse" />}
              </div>
              <div>
                <h4 className="font-medium text-slate-900">
                  {exportReq.status === 'READY' ? 'Your data is ready' : 'Preparing your data...'}
                </h4>
                <p className="text-sm text-slate-500">
                  Requested on {new Date(exportReq.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {exportReq.status === 'READY' && (
              <a
                href={`/api/data-export/download/${exportReq.id}?userId=${exportReq.userId}&token=...`} // Use the signed logic here
                className="bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition"
              >
                Download (.zip)
              </a>
            )}
          </div>
        )}
      </div>

      {/* Error State */}
      {exportReq?.status === 'FAILED' && (
        <div className="mt-4 flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle size={16} />
          <span>Something went wrong. Please try again in a few minutes.</span>
        </div>
      )}
    </div>
  );
}
