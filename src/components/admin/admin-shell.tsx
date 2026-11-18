'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from 'react';
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

const AdminNavigation = createContext<((href: string) => void) | null>(null);

export function AdminLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, 'href' | 'onNavigate' | 'prefetch'> & { href: string }) {
  const navigate = useContext(AdminNavigation);
  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onNavigate={(event) => {
        if (!navigate) return;
        event.preventDefault();
        navigate(href);
      }}
    />
  );
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { openMobile, setOpenMobile } = useSidebar();
  const [navigating, startNavigation] = useTransition();
  const [showStatus, setShowStatus] = useState(false);
  const navigationStatus = navigating && showStatus ? 'Loading administrator content…' : null;

  useEffect(() => {
    if (!navigating) return;
    const timer = window.setTimeout(() => setShowStatus(true), 120);
    return () => {
      window.clearTimeout(timer);
      setShowStatus(false);
    };
  }, [navigating]);

  useEffect(() => {
    // Synchronize the modal with a committed route, never a possibly cancelled click.
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);
  const confirmSignOut = useConfirmSignOut();
  return (
    <AdminNavigation.Provider value={(href) => startNavigation(() => router.push(href))}>
      <Sidebar>
        <div className="admin-sidebar-header">
          <SidebarTooltip label="QROTECT Administration">
            <AdminLink
              href="/admin"
              className="admin-sidebar-brand"
              aria-label="QROTECT Administration"
            >
              <ShieldCheck aria-hidden="true" size={24} />
              <span className="admin-sidebar-label">
                <strong>QROTECT</strong>
                <span>Administration</span>
              </span>
            </AdminLink>
          </SidebarTooltip>
          <SidebarTrigger />
        </div>
        <nav className="admin-sidebar-content" aria-label="Administrator navigation">
          {sections.map(([href, label, Icon]) => (
            <SidebarTooltip key={href} label={label}>
              <AdminLink
                href={href}
                className="admin-sidebar-link"
                aria-current={pathname === href ? 'page' : undefined}
                aria-label={label}
              >
                <Icon aria-hidden="true" size={20} />
                <span className="admin-sidebar-label">{label}</span>
              </AdminLink>
            </SidebarTooltip>
          ))}
        </nav>
        <div role="status" className="admin-sidebar-navigation-status">
          {openMobile && navigationStatus}
        </div>
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
          <span role="status" className="admin-navigation-status">
            {!openMobile && navigationStatus}
          </span>
        </header>
        <main className="admin-main" aria-busy={navigating} inert={navigating}>
          {children}
        </main>
      </div>
    </AdminNavigation.Provider>
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
