import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    Activity,
    Bell,
    Bot,
    CalendarDays,
    ClipboardCheck,
    FileText,
    Gauge,
    LayoutDashboard,
    LogOut,
    Medal,
    Newspaper,
    Search,
    Settings,
    ShieldCheck,
    Swords,
    Tags,
    Trophy,
    Users,
    MapPinned,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const adminItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/departments', label: 'Departments', icon: ShieldCheck },
    { to: '/admin/venues', label: 'Venues', icon: MapPinned },
    { to: '/admin/categories', label: 'Categories', icon: Tags },
    { to: '/admin/events', label: 'Events', icon: Trophy },
    { to: '/admin/schedules', label: 'Schedules', icon: CalendarDays },
    { to: '/admin/registrations', label: 'Registrations', icon: ClipboardCheck },
    { to: '/admin/participants', label: 'Participants', icon: Users },
    { to: '/admin/results-entry', label: 'Results Entry', icon: Swords },
    { to: '/admin/medal-tally', label: 'Medal Tally', icon: Medal },
    { to: '/admin/leaderboard', label: 'Leaderboard', icon: Gauge },
    { to: '/admin/news', label: 'News', icon: Newspaper },
    { to: '/admin/ai-recaps', label: 'AI Recaps', icon: FileText },
    { to: '/admin/rooney-logs', label: 'Rooney Logs', icon: Bot },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
];

const repItems = [
    { to: '/portal', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/portal/summary', label: 'Department Summary', icon: ShieldCheck },
    { to: '/portal/tryouts', label: 'Tryout Applications', icon: FileText },
    { to: '/portal/selected-applicants', label: 'Selected Applicants', icon: ClipboardCheck },
    { to: '/portal/masterlist', label: 'Participants', icon: Users },
    { to: '/portal/events', label: 'Available Events', icon: Trophy },
    { to: '/portal/registrations', label: 'Submit Registration', icon: ClipboardCheck },
    { to: '/portal/rosters', label: 'Roster Builder', icon: Users },
    { to: '/portal/registration-status', label: 'Registration Status', icon: ClipboardCheck },
    { to: '/portal/schedules', label: 'Schedule', icon: CalendarDays },
    { to: '/portal/results', label: 'Results', icon: Trophy },
    { to: '/portal/medals', label: 'Medal Summary', icon: Medal },
    { to: '/portal/news', label: 'Announcements', icon: Newspaper },
    { to: '/portal/rooney', label: 'Rooney', icon: Bot },
];

function pageTitle(pathname: string) {
    const item = [...adminItems, ...repItems].find(entry => entry.to === pathname);
    return item?.label || 'Operations';
}

export default function OperationsLayout({ mode }: { mode: 'admin' | 'department_rep' }) {
    const { user, logoutState } = useAuth();
    const location = useLocation();
    const items = mode === 'admin' ? adminItems : repItems;
    const title = pageTitle(location.pathname);
    const sidebarId = `${mode}-operations-drawer`;

    return (
        <div className="drawer lg:drawer-open min-h-screen bg-base-200 text-charcoal">
            <input id={sidebarId} type="checkbox" className="drawer-toggle" />
            <div className="drawer-content flex min-w-0 flex-col">
                <header className="sticky top-0 z-30 border-b border-base-300 bg-white/95 backdrop-blur">
                    <div className="flex min-h-16 items-center gap-3 px-4 lg:px-6">
                        <label htmlFor={sidebarId} className="btn btn-ghost btn-square lg:hidden" aria-label="Open navigation">
                            <Activity className="h-5 w-5" />
                        </label>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold uppercase text-maroon">
                                {mode === 'admin' ? 'Sports Operations' : 'Department Operations'}
                            </p>
                            <h1 className="truncate text-2xl font-black text-charcoal">{title}</h1>
                        </div>
                        <label className="input input-sm input-bordered hidden w-72 items-center gap-2 bg-base-100 md:flex">
                            <Search className="h-4 w-4 text-gray-500" />
                            <input type="search" className="grow" placeholder="Search operations" />
                        </label>
                        <button className="btn btn-ghost btn-square" aria-label="Notifications">
                            <Bell className="h-5 w-5" />
                        </button>
                        <div className="dropdown dropdown-end">
                            <button tabIndex={0} className="btn btn-ghost min-h-10 px-2">
                                <span className="grid h-8 w-8 place-items-center rounded-full bg-maroon text-sm font-black text-white">
                                    {user?.username?.slice(0, 1).toUpperCase()}
                                </span>
                                <span className="hidden text-left md:block">
                                    <span className="block text-sm font-bold">{user?.username}</span>
                                    <span className="block text-xs text-gray-500">
                                        {mode === 'admin' ? 'Admin / Sports Coordinator' : user?.department_acronym}
                                    </span>
                                </span>
                            </button>
                            <ul tabIndex={0} className="menu dropdown-content z-[1] mt-2 w-60 rounded-box bg-base-100 p-2 shadow">
                                <li className="menu-title">
                                    <span>{user?.department_name || 'Enverga Arena'}</span>
                                </li>
                                <li>
                                    <button onClick={logoutState} className="text-error">
                                        <LogOut className="h-4 w-4" />
                                        Logout
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </header>
                <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
            <div className="drawer-side z-40">
                <label htmlFor={sidebarId} aria-label="Close navigation" className="drawer-overlay"></label>
                <aside className="flex min-h-full w-72 flex-col border-r border-maroon/10 bg-maroon text-white">
                    <div className="border-b border-white/10 px-5 py-5">
                        <NavLink to={mode === 'admin' ? '/admin' : '/portal'} className="block">
                            <div className="text-xl font-black tracking-tight">Enverga Arena</div>
                            <div className="text-xs font-semibold uppercase text-white/70">
                                {mode === 'admin' ? 'Admin Console' : 'Representative Portal'}
                            </div>
                        </NavLink>
                    </div>
                    <nav className="flex-1 overflow-y-auto px-3 py-4">
                        <ul className="menu gap-1 p-0">
                            {items.map(({ to, label, icon: Icon }) => (
                                <li key={to}>
                                    <NavLink
                                        to={to}
                                        end={to === '/admin' || to === '/portal'}
                                        className={({ isActive }) =>
                                            `rounded-md text-sm font-semibold ${
                                                isActive
                                                    ? 'bg-white text-maroon'
                                                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                                            }`
                                        }
                                    >
                                        <Icon className="h-4 w-4" />
                                        {label}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <div className="border-t border-white/10 p-4 text-xs text-white/70">
                        MSEUF Intramurals Management
                    </div>
                </aside>
            </div>
        </div>
    );
}
