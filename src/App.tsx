import {
  Bell,
  ChartColumnIncreasing,
  ChevronDown,
  ChevronRight,
  Database,
  LayoutDashboard,
  LockKeyhole,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import type { ComponentType, CSSProperties, FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import ProcurementModule from './ProcurementModule';

interface Branding {
  appName: string;
  brandName: string;
  organization: string;
  accent: string;
  lifeosUrl: string;
  tenantId: string;
  appId: string;
  spEntityId: string;
  acsUrl: string;
  sloUrl: string;
  idpMetadataUrl: string;
}

interface AppSession {
  authenticated: boolean;
  user: {
    name: string;
    email: string;
    initials: string;
    roles: string[];
    appEntitlements: string[];
    department?: string;
  } | null;
  tenant: {
    id: string;
    name: string;
    appId: string;
  } | null;
  auth?: {
    provider: string;
  } | null;
}

interface NavigationSection {
  label: string;
  items: NavigationItem[];
}

interface NavigationItem {
  label: string;
  path: string;
  icon: keyof typeof icons;
}

interface DashboardPayload {
  summary: Array<{ label: string; value: string; detail: string }>;
  activity: Array<{ title: string; detail: string }>;
}

const icons = {
  Bell,
  ChartColumnIncreasing,
  Database,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  Workflow,
};

const fallbackBranding: Branding = {
  appName: 'Procurement Module',
  brandName: 'Procurement Module',
  organization: 'Life College, Inc.',
  accent: '#9e1d20',
  lifeosUrl: 'http://127.0.0.1:5174',
  tenantId: 'tenant-boilerplate',
  appId: 'tenant-boilerplate',
  spEntityId: 'urn:lifeos:tenant-boilerplate:sp',
  acsUrl: 'http://127.0.0.1:8002/saml/acs',
  sloUrl: 'http://127.0.0.1:8002/saml/slo',
  idpMetadataUrl: 'http://127.0.0.1:5174/saml/idp/metadata?tenant_id=tenant-boilerplate',
};

const signedOutSession: AppSession = {
  authenticated: false,
  user: null,
  tenant: null,
};

const publicDemo = true;
const demoSession: AppSession = { authenticated: true, user: { name: 'Angela Mendoza', email: 'angela.mendoza@life.edu.ph', initials: 'AM', roles: ['tenant-admin'], appEntitlements: ['procurement'], department: 'Academic Affairs' }, tenant: { id: 'life-college', name: 'Life College, Inc.', appId: 'procurement' } };
const demoNavigation: NavigationSection[] = [
  { label: 'Procurement', items: [
    { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' }, { label: 'Notifications', path: '/notifications', icon: 'Bell' }, { label: 'Purchase Requests', path: '/requests', icon: 'Database' }, { label: 'Approvals', path: '/approvals', icon: 'Workflow' }, { label: 'RFQ & Sourcing', path: '/sourcing', icon: 'Workflow' }, { label: 'Purchase Orders', path: '/purchase-orders', icon: 'Database' }, { label: 'Receiving', path: '/receiving', icon: 'Workflow' },
  ] },
  { label: 'Directory & Insights', items: [
    { label: 'Vendors', path: '/vendors', icon: 'Users' }, { label: 'Products', path: '/products', icon: 'Database' }, { label: 'Reports', path: '/reports', icon: 'ChartColumnIncreasing' }, { label: 'User Administration', path: '/administration', icon: 'Users' },
  ] },
];

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/notifications': 'Notifications',
  '/requests': 'Purchase Requests',
  '/requests/new': 'Purchase Request',
  '/approvals': 'Approvals',
  '/sourcing': 'RFQ & Sourcing',
  '/purchase-orders': 'Purchase Orders',
  '/receiving': 'Receiving',
  '/vendors': 'Vendors',
  '/products': 'Products',
  '/reports': 'Reports',
  '/saml-setup': 'SAML Setup',
  '/administration': 'User Administration',
  '/settings': 'Settings',
};

function roleFromSession(roles: string[]): string {
  const normalized = roles.map((role) => role.toLowerCase().replaceAll('_', '-'));
  if (normalized.includes('tenant-admin') || normalized.includes('super-admin')) return 'Super Admin';
  if (normalized.includes('dt-department')) return 'DT Department';
  if (normalized.includes('department-head')) return 'Department Head';
  if (normalized.includes('finance-manager')) return 'Finance Manager';
  if (normalized.includes('coo')) return 'COO';
  if (normalized.includes('president')) return 'President';
  return 'Requester';
}

type ProcurementWorkItem = { status: string; id?: string; title?: string; department?: string; amount?: number; requester?: string; createdAt?: string };

const procurementDataVersion = 'full-pr-po-lifecycle-seed-2026-08-28-v12';

function loadProcurementWorkItems(): ProcurementWorkItem[] {
  try {
    const saved = window.localStorage.getItem('procurement-requests');
    if (!saved) return [];
    const records = JSON.parse(saved) as ProcurementWorkItem[];
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

function executiveRoleForAmount(amount: number) {
  if (amount <= 100000) return 'Finance Manager';
  if (amount <= 999999) return 'COO';
  return 'President';
}

const purchaseOrderStatuses = new Set(['PO Draft', 'For Department Approval', 'For Finance Approval', 'For COO Approval', 'For President Approval', 'PO Approved', 'PO Awaiting Acknowledgement', 'PO Acknowledged', 'Partially Received', 'Received', 'Paid', 'Filed']);

function purchaseOrderApprovalRole(status: string) {
  if (status === 'For Department Approval') return 'Department Head';
  if (status === 'For Finance Approval') return 'Finance Manager';
  if (status === 'For COO Approval') return 'COO';
  if (status === 'For President Approval') return 'President';
  return null;
}

export default function App() {
  const [branding, setBranding] = useState<Branding>(fallbackBranding);
  const [session, setSession] = useState<AppSession>(publicDemo ? demoSession : signedOutSession);
  const [navigation, setNavigation] = useState<NavigationSection[]>(publicDemo ? demoNavigation : []);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [activePath, setActivePath] = useState(() => normalizePath(window.location.pathname));
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [procurementPreviewRole, setProcurementPreviewRole] = useState('Super Admin');
  const [procurementWorkItems, setProcurementWorkItems] = useState<ProcurementWorkItem[]>(loadProcurementWorkItems);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const isProcurementSuperAdmin = Boolean(session.user?.roles.some((role) => ['tenant-admin', 'super-admin'].includes(role)));
  const activeProcurementRole = isProcurementSuperAdmin ? procurementPreviewRole : roleFromSession(session.user?.roles ?? []);

  const displayedNavigation = useMemo(() => {
    const isSuperAdmin = Boolean(session.user?.roles.some((role) => ['tenant-admin', 'super-admin'].includes(role)));
    if (!isSuperAdmin || procurementPreviewRole === 'Super Admin') return navigation;
    const allowedByRole: Record<string, string[]> = {
      Requester: ['/dashboard', '/requests', '/products'],
      'DT Department': ['/dashboard', '/approvals', '/requests', '/products'],
      'Department Head': ['/dashboard', '/notifications', '/approvals', '/requests', '/reports'],
      'Finance Manager': ['/dashboard', '/notifications', '/approvals', '/purchase-orders', '/receiving', '/reports'],
      COO: ['/dashboard', '/notifications', '/approvals', '/purchase-orders', '/reports'],
      President: ['/dashboard', '/notifications', '/approvals', '/purchase-orders', '/reports'],
      'Procurement Officer': ['/dashboard', '/requests', '/sourcing', '/purchase-orders', '/receiving', '/vendors', '/products', '/reports'],
    };
    const allowed = new Set(allowedByRole[procurementPreviewRole] ?? ['/dashboard']);
    return navigation.map((section) => ({ ...section, items: section.items.filter((item) => allowed.has(item.path)) })).filter((section) => section.items.length > 0);
  }, [navigation, procurementPreviewRole, session.user?.roles]);

  const activeItem = useMemo(
    () => displayedNavigation.flatMap((section) => section.items).find((item) => activePath === item.path || (item.path !== '/dashboard' && activePath.startsWith(`${item.path}/`))),
    [activePath, displayedNavigation],
  );

  const approvalBadgeCount = useMemo(() => {
    const role = isProcurementSuperAdmin ? procurementPreviewRole : roleFromSession(session.user?.roles ?? []);
    if (role === 'DT Department') return procurementWorkItems.filter((request) => request.status === 'For DT Approval').length;
    if (role === 'Department Head') return procurementWorkItems.filter((request) => request.status === 'For Department Approval').length;
    if (role === 'Finance Manager') return procurementWorkItems.filter((request) => request.status === 'For Finance Approval').length;
    if (role === 'COO') return procurementWorkItems.filter((request) => request.status === 'For COO Approval').length;
    if (role === 'President') return procurementWorkItems.filter((request) => request.status === 'For President Approval').length;
    if (role === 'Super Admin') return procurementWorkItems.filter((request) => ['For DT Approval', 'For Department Approval', 'For Finance Approval', 'For COO Approval', 'For President Approval'].includes(request.status)).length;
    return 0;
  }, [isProcurementSuperAdmin, procurementPreviewRole, procurementWorkItems, session.user?.roles]);

  const sourcingBadgeCount = useMemo(() => {
    const role = isProcurementSuperAdmin ? procurementPreviewRole : roleFromSession(session.user?.roles ?? []);
    if (!['Super Admin', 'Procurement Officer'].includes(role)) return 0;
    return procurementWorkItems.filter((request) => ['For Procurement Review', 'RFQ Draft', 'RFQ Sent'].includes(request.status)).length;
  }, [isProcurementSuperAdmin, procurementPreviewRole, procurementWorkItems, session.user?.roles]);

  const submissionNotifications = useMemo(() => {
    if (!['Department Head', 'Finance Manager', 'COO', 'President'].includes(activeProcurementRole)) return [];
    return procurementWorkItems
      .filter((item) => {
        if (!item.id || typeof item.amount !== 'number') return false;
        const poApprovalRole = purchaseOrderApprovalRole(item.status);
        if (poApprovalRole) return poApprovalRole === activeProcurementRole;
        if (purchaseOrderStatuses.has(item.status) || item.status === 'Draft') return false;
        return activeProcurementRole === 'Department Head' || executiveRoleForAmount(item.amount) === activeProcurementRole;
      })
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }, [activeProcurementRole, procurementWorkItems]);

  const unreadNotificationCount = submissionNotifications.filter((item) => item.id && !readNotificationIds.includes(item.id)).length;

  useEffect(() => {
    const storageKey = `procurement-read-notifications:${activeProcurementRole}`;
    try {
      setReadNotificationIds(JSON.parse(window.localStorage.getItem(storageKey) ?? '[]'));
    } catch {
      setReadNotificationIds([]);
    }
    setNotificationsOpen(false);
  }, [activeProcurementRole]);

  function markNotificationsRead(ids: string[]) {
    const next = [...new Set([...readNotificationIds, ...ids])];
    setReadNotificationIds(next);
    window.localStorage.setItem(`procurement-read-notifications:${activeProcurementRole}`, JSON.stringify(next));
  }

  useEffect(() => {
    const onPopState = () => setActivePath(normalizePath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  async function handleDevLogin() {
    setSession(demoSession);
    navigate('/dashboard');
  }

  async function handlePasswordLogin(_credentials: { email: string; password: string; remember: boolean }) {
    setSession(demoSession);
    navigate('/dashboard');
  }

  async function handleLogout() {
    setSession(demoSession);
    navigate('/dashboard');
  }

  function navigate(path: string) {
    const nextPath = normalizePath(path);
    const browserPath = publicDemo ? `${import.meta.env.BASE_URL.replace(/\/$/, '')}${nextPath}` : nextPath;
    window.history.pushState({}, '', browserPath);
    setActivePath(nextPath);
    setMobileMenuOpen(false);
  }

  function previewProcurementRole(role: string) {
    setProcurementPreviewRole(role);
    const allowedByRole: Record<string, string[]> = {
      Requester: ['/dashboard', '/requests', '/requests/new', '/products'],
      'DT Department': ['/dashboard', '/approvals', '/requests', '/requests/new', '/products'],
      'Department Head': ['/dashboard', '/notifications', '/approvals', '/requests', '/reports'],
      'Finance Manager': ['/dashboard', '/notifications', '/approvals', '/purchase-orders', '/receiving', '/reports'],
      COO: ['/dashboard', '/notifications', '/approvals', '/purchase-orders', '/reports'],
      President: ['/dashboard', '/notifications', '/approvals', '/purchase-orders', '/reports'],
      'Procurement Officer': ['/dashboard', '/requests', '/sourcing', '/purchase-orders', '/receiving', '/vendors', '/products', '/reports'],
    };
    if (role !== 'Super Admin' && !(allowedByRole[role] ?? ['/dashboard']).includes(activePath)) navigate('/dashboard');
  }

  if (!session.authenticated) {
    return (
      <LoginScreen
        branding={branding}
        onPasswordLogin={handlePasswordLogin}
        onDevLogin={handleDevLogin}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((current) => !current)}
      />
    );
  }

  if (activePath.startsWith('/vendor-quotation/') || activePath.startsWith('/vendor-information/')) {
    return <div className={`vendor-public-shell ${darkMode ? 'dark' : ''}`} style={{ '--brand-accent': branding.accent } as CSSProperties}><ProcurementModule key={procurementDataVersion} activePath={activePath} sessionUser={session.user} onNavigate={navigate} previewRole={procurementPreviewRole} onWorkItemsChange={setProcurementWorkItems} /></div>;
  }

  return (
    <div className={`app shell ${darkMode ? 'dark' : ''}`} style={{ '--brand-accent': branding.accent } as CSSProperties}>
      <Sidebar branding={branding} navigation={displayedNavigation} activePath={activePath} approvalCount={approvalBadgeCount} sourcingCount={sourcingBadgeCount} onNavigate={navigate} />

      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-only" type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <div className="topbar-heading">
            <h1>{activeItem?.label ?? routeTitles[activePath] ?? 'Workspace'}</h1>
          </div>
          <div className="topbar-actions">
            {isProcurementSuperAdmin ? (
              <label className="topbar-role-switcher">
                <span>View as</span>
                <select aria-label="View as role" value={procurementPreviewRole} onChange={(event) => previewProcurementRole(event.target.value)}>
                  <option>Super Admin</option><option>Requester</option><option>DT Department</option><option>Department Head</option><option>Finance Manager</option><option>COO</option><option>President</option><option>Procurement Officer</option>
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </label>
            ) : null}
            <label className="search-box">
              <Search size={17} aria-hidden="true" />
              <input type="search" aria-label="Search tenant app" placeholder="Search" />
            </label>
            <div className="topbar-notifications">
              <button className={`icon-button notification-trigger ${unreadNotificationCount ? 'has-unread' : ''}`} type="button" aria-label="Notifications" title="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}>
                <Bell size={19} />
                {unreadNotificationCount ? <span>{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</span> : null}
              </button>
              {notificationsOpen ? <section className="notification-popover" aria-label="Procurement notifications">
                <header><div><b>Procurement notifications</b><small>{['Department Head', 'Finance Manager', 'COO', 'President'].includes(activeProcurementRole) ? `${activeProcurementRole} visibility and approvals` : 'No notification scope'}</small></div>{unreadNotificationCount ? <button type="button" onClick={() => markNotificationsRead(submissionNotifications.flatMap((item) => item.id ? [item.id] : []))}>Mark all read</button> : null}</header>
                <div className="notification-list">{submissionNotifications.length ? submissionNotifications.slice(0, 8).map((item) => {
                  const unread = Boolean(item.id && !readNotificationIds.includes(item.id));
                  const poApproval = purchaseOrderApprovalRole(item.status) === activeProcurementRole;
                  return <button className={unread ? 'unread' : ''} type="button" key={item.id} onClick={() => item.id && markNotificationsRead([item.id])}><span className="notification-dot" /><span><b>{poApproval ? 'Purchase Order approval required' : 'New Purchase Request submitted'}</b><strong>{item.title}</strong><small>{poApproval ? item.id?.replace('PR-', 'PO-') : item.id} · {item.department} · {item.requester}</small><small>{typeof item.amount === 'number' ? `₱${item.amount.toLocaleString()}` : ''}{item.createdAt ? ` · ${new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(item.createdAt))}` : ''}</small></span></button>;
                }) : <p>No procurement notifications for this role.</p>}</div>
                {submissionNotifications.length ? <footer><span>PO decisions are completed in Approvals</span><button type="button" onClick={() => { setNotificationsOpen(false); navigate('/notifications'); }}>View all notifications</button></footer> : null}
              </section> : null}
            </div>
            <button className="icon-button" type="button" onClick={() => setDarkMode((current) => !current)} aria-label="Toggle dark mode">
              {darkMode ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <UserChip name={session.user?.name ?? 'LifeOS User'} initials={session.user?.initials ?? 'LO'} />
            <button className="icon-button" type="button" onClick={handleLogout} aria-label="Log out">
              <LogOut size={19} />
            </button>
          </div>
        </header>

        <main className="content">
          {activePath === '/notifications' ? (
            <NotificationsPage role={activeProcurementRole} notifications={submissionNotifications} readIds={readNotificationIds} onRead={(id) => markNotificationsRead([id])} onReadAll={() => markNotificationsRead(submissionNotifications.flatMap((item) => item.id ? [item.id] : []))} />
          ) : activePath === '/saml-setup' ? (
            <SamlSetupView branding={branding} />
          ) : activePath === '/settings' ? (
            <SettingsView branding={branding} />
          ) : (
            <ProcurementModule key={procurementDataVersion} activePath={activePath} sessionUser={session.user} onNavigate={navigate} previewRole={procurementPreviewRole} onWorkItemsChange={setProcurementWorkItems} />
          )}
        </main>
      </div>

      {mobileMenuOpen ? (
        <div className="mobile-drawer" role="dialog" aria-modal="true">
          <div className="mobile-drawer-header">
            <BrandLockup branding={branding} compact />
            <button className="icon-button" type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation">
              <X size={20} />
            </button>
          </div>
          <Sidebar branding={branding} navigation={displayedNavigation} activePath={activePath} approvalCount={approvalBadgeCount} sourcingCount={sourcingBadgeCount} onNavigate={navigate} compact />
        </div>
      ) : null}
    </div>
  );
}

function NotificationsPage({ role, notifications, readIds, onRead, onReadAll }: { role: string; notifications: ProcurementWorkItem[]; readIds: string[]; onRead: (id: string) => void; onReadAll: () => void }) {
  const supportedRole = ['Department Head', 'Finance Manager', 'COO', 'President'].includes(role);
  const unreadCount = notifications.filter((item) => item.id && !readIds.includes(item.id)).length;
  const approvalCount = notifications.filter((item) => purchaseOrderApprovalRole(item.status) === role).length;
  return <div className="notifications-page">
    <section className="notifications-page-heading">
      <div><span>Role-based visibility</span><h2>Procurement Notifications</h2><p>{supportedRole ? `Purchase Request notices and Purchase Orders requiring ${role} approval.` : 'This role does not receive approval or submission notifications.'}</p></div>
      <button type="button" disabled={!unreadCount} onClick={onReadAll}><Bell size={16} />Mark all read</button>
    </section>
    <section className="notification-page-list">
      <header><div><Bell size={17} /><b>Role notifications</b></div><span>{approvalCount} approvals · {unreadCount} unread · {notifications.length} total</span></header>
      {notifications.length ? notifications.map((item) => {
        const unread = Boolean(item.id && !readIds.includes(item.id));
        const poApproval = purchaseOrderApprovalRole(item.status) === role;
        return <button className={unread ? 'unread' : ''} type="button" key={item.id} onClick={() => item.id && onRead(item.id)}>
          <span className="notification-page-icon"><Bell size={17} /></span>
          <span className="notification-page-copy"><b>{poApproval ? 'Purchase Order approval required' : 'New Purchase Request submitted'}</b><strong>{item.title}</strong><small>{poApproval ? item.id?.replace('PR-', 'PO-') : item.id} · {item.department} · Requested by {item.requester}</small></span>
          <span className="notification-page-meta"><b>{typeof item.amount === 'number' ? `₱${item.amount.toLocaleString()}` : ''}</b><small>{poApproval ? item.status : formatNotificationTime(item.createdAt)}</small><em>{unread ? 'Unread' : 'Read'}</em></span>
        </button>;
      }) : <div className="notification-page-empty"><Bell size={24} /><b>No procurement notifications</b><p>No Purchase Requests or Purchase Orders are currently assigned to this role.</p></div>}
    </section>
  </div>;
}

function formatNotificationTime(value?: string) {
  if (!value) return 'Submission time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(date);
}

function Sidebar({
  branding,
  navigation,
  activePath,
  approvalCount,
  sourcingCount,
  compact = false,
  onNavigate,
}: {
  branding: Branding;
  navigation: NavigationSection[];
  activePath: string;
  approvalCount: number;
  sourcingCount: number;
  compact?: boolean;
  onNavigate: (path: string) => void;
}) {
  return (
    <aside className={`sidebar ${compact ? 'compact' : ''}`} aria-label="Tenant navigation">
      {!compact ? (
        <div className="sidebar-header">
          <BrandLockup branding={branding} />
        </div>
      ) : null}
      <nav className="nav-list">
        {navigation.map((section) => (
          <div className="nav-section" key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            {section.items.map((item) => (
              <button
                className={`nav-item ${activePath === item.path || (item.path !== '/dashboard' && activePath.startsWith(`${item.path}/`)) ? 'active' : ''}`}
                key={item.path}
                type="button"
                onClick={() => onNavigate(item.path)}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
                <span className="nav-tail">{item.path === '/approvals' && approvalCount > 0 ? <span className="nav-count" aria-label={`${approvalCount} remaining approvals`}>{approvalCount}</span> : item.path === '/sourcing' && sourcingCount > 0 ? <span className="nav-count" aria-label={`${sourcingCount} sourcing items requiring attention`}>{sourcingCount}</span> : null}<ChevronRight className="nav-chevron" size={15} /></span>
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <ShieldCheck size={17} />
        <span>Tenant access enabled</span>
      </div>
    </aside>
  );
}

function BrandLockup({ branding, compact = false }: { branding: Branding; compact?: boolean }) {
  return (
    <div className="brand-lockup">
      <span className="brand-mark">
        <img src={`${import.meta.env.BASE_URL}lifeos-platform-crest.svg`} alt="" />
      </span>
      <span>
        <strong>{branding.brandName}</strong>
        <span>{compact ? 'Navigation' : branding.organization}</span>
        <small className="brand-prototype-marker">Frontend prototype</small>
      </span>
    </div>
  );
}

function LoginScreen({
  branding,
  darkMode,
  onToggleDarkMode,
  onPasswordLogin,
  onDevLogin,
}: {
  branding: Branding;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onPasswordLogin: (credentials: { email: string; password: string; remember: boolean }) => Promise<void>;
  onDevLogin: () => void;
}) {
  const [email, setEmail] = useState('admin@tenant.local');
  const [password, setPassword] = useState('password');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState(() => new URLSearchParams(window.location.search).get('sso_error') ?? '');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await onPasswordLogin({ email, password, remember });
    } catch {
      setError('Unable to sign in with those credentials.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={`signed-out ${darkMode ? 'dark' : ''}`} style={{ '--brand-accent': branding.accent } as CSSProperties}>
      <section className="login-panel" aria-label="Tenant sign in">
        <div className="login-intro">
          <BrandLockup branding={branding} />
          <button className="icon-button" type="button" onClick={onToggleDarkMode} aria-label="Toggle dark mode">
            {darkMode ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
        <div className="login-copy">
          <span className="eyebrow">Tenant application</span>
          <h1>{branding.appName}</h1>
          <p>Sign in to continue.</p>
        </div>
        <form className="login-form" onSubmit={submit}>
          <label>
            Email
            <input value={email} type="email" autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input value={password} type="password" autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label className="check-row">
            <input checked={remember} type="checkbox" onChange={(event) => setRemember(event.target.checked)} />
            Keep me signed in
          </label>
          {error ? <div className="login-error">{error}</div> : null}
          <button className="primary-button" type="submit" disabled={submitting}>
            <LogIn size={18} />
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="login-divider">
          <span>or</span>
        </div>
        <div className="login-actions">
          <button className="secondary-button" type="button" onClick={onDevLogin}>
            <LockKeyhole size={18} />
            Preview LifeOS access
          </button>
          <button className="text-button" type="button" onClick={onDevLogin}>
            <LogIn size={18} />
            Local dev sign in
          </button>
        </div>
      </section>
    </main>
  );
}

function DashboardView({ branding, session, dashboard }: { branding: Branding; session: AppSession; dashboard: DashboardPayload | null }) {
  return (
    <div className="dashboard-grid">
      <section className="report-hero">
        <div>
          <span className="eyebrow">Tenant starter</span>
          <h2>{branding.brandName}</h2>
          <p>This is a clone-ready LifeOS tenant shell. Replace the sample metrics, placeholder routes, and API handlers with the tenant product surface.</p>
        </div>
        <div className="report-status">
          <span>Signed in as</span>
          <strong>{session.user?.name}</strong>
          <small>{session.user?.email}</small>
        </div>
      </section>

      {(dashboard?.summary ?? []).map((metric) => (
        <section className="metric-card" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.detail}</small>
        </section>
      ))}

      <Panel title="Recent Activity" icon={Workflow}>
        <div className="activity-list">
          {(dashboard?.activity ?? []).map((item) => (
            <div className="activity-row" key={item.title}>
              <span />
              <div>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Prototype Data" icon={Database}>
        <div className="notes-grid">
          <code>Mock purchase requests</code>
          <code>Browser-local vendors</code>
          <code>Browser-local products</code>
          <code>Role preview controls</code>
          <code>In-memory approvals</code>
        </div>
      </Panel>
    </div>
  );
}

function PlaceholderView({ title, path }: { title: string; path: string }) {
  return (
    <section className="placeholder-panel">
      <span className="eyebrow">{path}</span>
      <h2>{title}</h2>
      <p>Replace this placeholder with tenant-specific screens, data loading, and permissions. The shell, authentication, and branding hooks are already wired.</p>
      <div className="placeholder-actions">
        <button className="secondary-button" type="button">
          Configure Module
        </button>
        <button className="primary-button" type="button">
          Add Workflow
        </button>
      </div>
    </section>
  );
}

function SamlSetupView({ branding }: { branding: Branding }) {
  const registrationRows = [
    { label: 'App ID', value: branding.appId },
    { label: 'Tenant ID', value: branding.tenantId },
    { label: 'SP Entity ID', value: branding.spEntityId },
    { label: 'ACS URL', value: branding.acsUrl },
    { label: 'SLO URL', value: branding.sloUrl },
  ];
  const lifeosRows = [
    { label: 'LifeOS URL', value: branding.lifeosUrl },
    { label: 'IdP Metadata', value: branding.idpMetadataUrl },
    { label: 'IdP SSO URL', value: `${branding.lifeosUrl}/saml/sso` },
    { label: 'IdP SLO URL', value: `${branding.lifeosUrl}/saml/slo` },
  ];

  return (
    <div className="saml-setup">
      <section className="setup-hero">
        <div>
          <span className="eyebrow">LifeOS tenant SSO</span>
          <h2>SAML Setup</h2>
          <p>Use this service-provider profile when registering the tenant app in LifeOS. Password sign-in remains available; LifeOS SSO is an additional authentication option.</p>
        </div>
        <a className="primary-button" href="/saml/metadata" target="_blank" rel="noreferrer">
          <ShieldCheck size={18} />
          View SP Metadata
        </a>
      </section>

      <div className="setup-grid">
        <Panel title="Register This App In LifeOS" icon={ShieldCheck}>
          <div className="definition-stack">
            {registrationRows.map((row) => (
              <Definition key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </Panel>

        <Panel title="LifeOS Identity Provider" icon={LockKeyhole}>
          <div className="definition-stack">
            {lifeosRows.map((row) => (
              <Definition key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </Panel>

        <Panel title="Expected Claims" icon={Users}>
          <div className="claim-grid">
            <Definition label="email" value="User email address" />
            <Definition label="name" value="Display name" />
            <Definition label="tenant_id" value="LifeOS tenant identifier" />
            <Definition label="roles" value="Comma-separated tenant roles" />
            <Definition label="app_entitlements" value="Includes this app ID" />
          </div>
        </Panel>

        <Panel title="Local Rehearsal Checklist" icon={Workflow}>
          <ol className="setup-list">
            <li>Clone the boilerplate and configure `.env` from `.env.example`.</li>
            <li>Run `docker compose up --build` and open the tenant app.</li>
            <li>Register the app in LifeOS using the service-provider values above.</li>
            <li>Use password sign-in for local access or Continue with LifeOS for SSO.</li>
          </ol>
        </Panel>
      </div>
    </div>
  );
}

function SettingsView({ branding }: { branding: Branding }) {
  return (
    <div className="settings-grid">
      <Panel title="Branding" icon={Settings}>
        <Definition label="App Name" value={branding.appName} />
        <Definition label="Brand" value={branding.brandName} />
        <Definition label="Organization" value={branding.organization} />
        <Definition label="Accent" value={branding.accent} />
      </Panel>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: ComponentType<{ size?: number }>; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <Icon size={18} />
          <h3>{title}</h3>
        </div>
      </div>
      {children}
    </section>
  );
}

function Definition({ label, value }: { label: string; value: string }) {
  return (
    <div className="definition-row">
      <span>{label}</span>
      <code>{value}</code>
    </div>
  );
}

function UserChip({ name, initials }: { name: string; initials: string }) {
  return (
    <div className="user-chip" aria-label="Current user">
      <span className="user-chip-avatar">{initials}</span>
      <span className="user-chip-name">{name}</span>
    </div>
  );
}

function NavIcon({ name }: { name: keyof typeof icons }) {
  const Icon = icons[name] ?? LayoutDashboard;
  return <Icon size={18} />;
}

function normalizePath(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (base && path.startsWith(base)) path = path.slice(base.length) || '/';
  if (!path || path === '/' || path === '/login') return '/dashboard';
  return path.startsWith('/') ? path : `/${path}`;
}
