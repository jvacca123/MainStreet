import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { users as usersApi } from '../api/client.js';

export default function AccountSettings() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleExport() {
    setError(null);
    setBusy('export');
    try {
      const data = await usersApi.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mainstreet-export-${user.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) { setError(err.message); }
    finally { setBusy(null); }
  }

  async function handleDelete() {
    setError(null);
    setBusy('delete');
    try {
      await usersApi.deleteAccount();
      await logout();
      nav('/', { replace: true });
    } catch (err) { setError(err.message); setBusy(null); }
  }

  return (
    <div className="container-narrow py-12">
      <h1 className="font-display text-4xl text-brand-900 mb-2">Account settings</h1>
      <p className="text-brand-600 mb-8">{user?.email}</p>

      <section className="card card-pad mb-6">
        <h2 className="font-display text-2xl text-brand-900 mb-2">Your data</h2>
        <p className="text-brand-600 mb-4">Download everything we have on you as JSON.</p>
        <button onClick={handleExport} disabled={busy === 'export'} className="btn-outline">
          {busy === 'export' ? 'Preparing…' : 'Download my data'}
        </button>
      </section>

      <section className="card card-pad border border-red-100">
        <h2 className="font-display text-2xl text-red-700 mb-2">Delete account</h2>
        <p className="text-brand-600 mb-4">
          This is permanent. Your profile is anonymized, all sessions revoked, and you can't recover
          this account. You can register again with the same email later.
        </p>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="btn bg-red-600 text-white hover:bg-red-700">
            Delete my account
          </button>
        ) : (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-red-800 font-medium mb-3">Are you sure? This can't be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="btn-outline">Cancel</button>
              <button onClick={handleDelete} disabled={busy === 'delete'} className="btn bg-red-600 text-white hover:bg-red-700">
                {busy === 'delete' ? 'Deleting…' : 'Yes, delete permanently'}
              </button>
            </div>
          </div>
        )}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </section>
    </div>
  );
}
