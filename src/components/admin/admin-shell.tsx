'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import {
  BookOpen,
  ContactRound,
  ExternalLink,
  History,
  House,
  KeyRound,
  LogOut,
  Map,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { signOut } from '@/app/admin/auth-actions';
import {
  Sidebar,
  SidebarProvider,
  SidebarTooltip,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { UnpublishedEditsProvider, useConfirmSignOut } from './unpublished-edits';

const sections = [
  ['/admin', 'Overview', House],
  ['/admin/contacts', 'Contacts', ContactRound],
  ['/admin/quick-calls', 'Home quick calls', Phone],
  ['/admin/guidance', 'Guidance', BookOpen],
  ['/admin/map', 'Campus map', Map],
  ['/admin/history', 'History', History],
  ['/admin/password', 'Password', KeyRound],
] as const;

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  useEffect(() => {
    // Synchronize the modal with a committed route, never a possibly cancelled click.
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);
  const confirmSignOut = useConfirmSignOut();
  return (
    <>
      <Sidebar>
        <div className="admin-sidebar-header">
          <SidebarTooltip label="QROTECT Administration">
            <Link href="/admin" className="admin-sidebar-brand" aria-label="QROTECT Administration">
              <ShieldCheck aria-hidden="true" size={24} />
              <span className="admin-sidebar-label">
                <strong>QROTECT</strong>
                <span>Administration</span>
              </span>
            </Link>
          </SidebarTooltip>
          <SidebarTrigger />
        </div>
        <nav className="admin-sidebar-content" aria-label="Administrator navigation">
          {sections.map(([href, label, Icon]) => (
            <SidebarTooltip key={href} label={label}>
              <Link
                href={href}
                className="admin-sidebar-link"
                aria-current={pathname === href ? 'page' : undefined}
                aria-label={label}
              >
                <Icon aria-hidden="true" size={20} />
                <span className="admin-sidebar-label">{label}</span>
              </Link>
            </SidebarTooltip>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <SidebarTooltip label="Public directory">
            <Link href="/" className="admin-sidebar-link" aria-label="Public directory">
              <ExternalLink aria-hidden="true" size={20} />
              <span className="admin-sidebar-label">Public directory</span>
            </Link>
          </SidebarTooltip>
          <form
            action={signOut}
            onSubmit={(event) => {
              if (!confirmSignOut()) event.preventDefault();
            }}
          >
            <SidebarTooltip label="Sign out">
              <button type="submit" className="admin-sidebar-link" aria-label="Sign out">
                <LogOut aria-hidden="true" size={20} />
                <span className="admin-sidebar-label">Sign out</span>
              </button>
            </SidebarTooltip>
          </form>
        </div>
      </Sidebar>
      <div className="admin-shell-body">
        <header className="admin-shell-header">
          <SidebarTrigger mobile />
          <span>QROTECT / Administration</span>
        </header>
        <main className="admin-main">{children}</main>
      </div>
    </>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <UnpublishedEditsProvider>
      <SidebarProvider>
        <Shell>{children}</Shell>
      </SidebarProvider>
    </UnpublishedEditsProvider>
  );
}
