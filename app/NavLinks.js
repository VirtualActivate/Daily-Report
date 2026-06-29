'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/entry', label: 'Daily entry' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/productivity', label: 'Productivity' },
  { href: '/overlaps', label: 'Overlaps' },
  { href: '/masters', label: 'Masters' },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <nav>
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-link ${pathname?.startsWith(item.href) ? 'active' : ''}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
