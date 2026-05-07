import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Toaster } from 'react-hot-toast';
import { PageTransition } from '../ui/PageTransition';

export const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden pb-24 md:pb-0">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
      <BottomNav />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(15, 19, 32, 0.92)',
            color: '#f9fafb',
            border: '1px solid #232a40',
            backdropFilter: 'blur(12px)',
            borderRadius: '12px',
            fontSize: '14px',
            padding: '12px 16px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#0f1320' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#0f1320' } },
        }}
      />
    </div>
  );
};
