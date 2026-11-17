'use client';

// Adapted from shadcn/ui's MIT-licensed Radix Sidebar. Keep only the used
// composition; QROTECT owns its styling, breakpoint and ephemeral state.
import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

const desktopQuery = '(min-width: 1024px)';
function subscribe(callback: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}
const SidebarContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isDesktop: boolean;
} | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('Sidebar requires SidebarProvider.');
  return context;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);
  const isDesktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(desktopQuery).matches,
    () => false,
  );
  useEffect(() => {
    const query = window.matchMedia(desktopQuery);
    const closeMobile = () => {
      if (query.matches) setOpenMobile(false);
    };
    query.addEventListener('change', closeMobile);
    return () => query.removeEventListener('change', closeMobile);
  }, []);
  return (
    <SidebarContext.Provider value={{ open, setOpen, openMobile, setOpenMobile, isDesktop }}>
      <Tooltip.Provider delayDuration={200}>
        <Dialog.Root open={openMobile && !isDesktop} onOpenChange={setOpenMobile}>
          <div className="admin-shell" data-state={open ? 'expanded' : 'collapsed'}>
            {children}
          </div>
        </Dialog.Root>
      </Tooltip.Provider>
    </SidebarContext.Provider>
  );
}

export function Sidebar({ children }: { children: ReactNode }) {
  const { isDesktop, open } = useSidebar();
  if (!isDesktop) {
    return (
      <Dialog.Portal>
        <Dialog.Overlay className="admin-sidebar-overlay" />
        <Dialog.Content className="admin-sidebar admin-sidebar-mobile" aria-describedby={undefined}>
          <Dialog.Title className="sr-only">Administrator menu</Dialog.Title>
          <Dialog.Close
            className="admin-sidebar-control admin-sidebar-close"
            aria-label="Close menu"
          >
            <X aria-hidden="true" size={20} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    );
  }
  return (
    <aside
      className="admin-sidebar admin-sidebar-desktop"
      data-state={open ? 'expanded' : 'collapsed'}
    >
      {children}
    </aside>
  );
}

export function SidebarTrigger({ mobile = false }: { mobile?: boolean }) {
  const { open, setOpen } = useSidebar();
  if (mobile) {
    return (
      <Dialog.Trigger className="admin-sidebar-control admin-menu-trigger">
        <Menu aria-hidden="true" size={20} />
        <span>Menu</span>
      </Dialog.Trigger>
    );
  }
  const Icon = open ? PanelLeftClose : PanelLeftOpen;
  return (
    <SidebarTooltip label={open ? 'Collapse navigation' : 'Expand navigation'}>
      <button
        type="button"
        className="admin-sidebar-control admin-sidebar-toggle"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Collapse navigation' : 'Expand navigation'}
        aria-expanded={open}
      >
        <Icon aria-hidden="true" size={20} />
        <span className="admin-sidebar-label">Collapse navigation</span>
      </button>
    </SidebarTooltip>
  );
}

export function SidebarTooltip({ label, children }: { label: string; children: ReactNode }) {
  const { isDesktop, open } = useSidebar();
  if (!isDesktop || open) return children;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="admin-sidebar-tooltip" side="right" sideOffset={12}>
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
