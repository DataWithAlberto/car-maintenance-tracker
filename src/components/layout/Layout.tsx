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
            background: '#0f1013',
            color: '#d4d4d8',
            border: '1px solid #242629',
            borderRadius: '8px',
            fontSize: '13px',
            fontFamily: 'var(--font-mono)',
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#0f1013' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#0f1013' } },
        }}
      />
    </div>
  );
};
