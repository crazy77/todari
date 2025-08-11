import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminDashboard } from './ui/admin/AdminDashboard';
import { GameCanvas } from './ui/GameCanvas';
import '@/styles/global.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');
const root = createRoot(container);

import { useBootstrapSession } from '@/stores/sessionSync';

function Bootstrap() {
  useBootstrapSession();
  const params = new URLSearchParams(window.location.search);
  const isAdmin = params.get('admin') === '1';
  return isAdmin ? <AdminDashboard /> : <GameCanvas />;
}

root.render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
);
