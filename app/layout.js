import './globals.css';
import NavLinks from './NavLinks';

export const metadata = {
  title: 'Daily Report Hub — Construct IQ',
  description: 'Daily manpower, assignment and progress tracking',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div className="sidebar-brand">
              <div className="eyebrow">Construct IQ</div>
              <div className="title">Daily report hub</div>
            </div>
            <NavLinks />
            <div className="sidebar-footer">
              Internal tool &middot; link-access only
            </div>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
