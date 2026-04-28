import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import type { AxiosError } from 'axios';
import {
    AlertCircle,
    ArrowRight,
    Bot,
    Calendar,
    CheckCircle,
    ClipboardList,
    Clock,
    ExternalLink,
    FileText,
    Gauge,
    Medal,
    MapPin,
    Newspaper,
    Plus,
    Trophy,
    Users,
    XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
    useAthletes,
    useCreateRegistration,
    useDepartments,
    useEvents,
    useAdminNews,
    useRegistrations,
    useRooneyLogs,
    useTryoutApplications,
    useUpdateRegistrationStatus,
} from '../../hooks/useAdminData';
import type { EventRegistration } from '../../hooks/useAdminData';
import { useMatchResults, useMedalTally, usePodiumResults, useSchedules } from '../../hooks/usePublicData';
import DepartmentLogo from '../../components/DepartmentLogo';

interface RegistrationErrorBody {
    schedule?: string[];
    roster_athlete_ids?: string[];
    detail?: string;
}

interface DashboardProps {
    mode?: 'admin' | 'department_rep';
}

export default function Dashboard({ mode }: DashboardProps) {
    const { user } = useAuth();
    const resolvedMode = mode ?? (user?.role === 'admin' ? 'admin' : 'department_rep');

    return (
        <div className="py-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-charcoal mb-2">
                        {resolvedMode === 'admin' ? 'Central Administration' : 'Department Representative Portal'}
                    </h1>
                    <p className="text-gray-600">
                        Welcome, <span className="font-semibold text-maroon">{user?.username}</span>
                        {user?.department_name && (
                            <>
                                {' '}from <span className="font-semibold text-charcoal">{user.department_name}</span>
                                {user.department_acronym && ` (${user.department_acronym})`}
                            </>
                        )}
                    </p>
                </div>
                <Link
                    to="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline border-maroon text-maroon hover:bg-maroon hover:text-white"
                >
                    View Public Site
                    <ExternalLink className="h-4 w-4" />
                </Link>
            </div>

            {resolvedMode === 'admin' ? <AdminView /> : <DeptRepView />}
        </div>
    );
}

function AdminView() {
    const { data: registrations, isLoading } = useRegistrations();
    const { data: departments } = useDepartments();
    const { data: events } = useEvents();
    const { data: schedules } = useSchedules();
    const { data: tally } = useMedalTally();
    const { data: matches } = useMatchResults();
    const { data: podiums } = usePodiumResults();
    const { data: rooneyLogs } = useRooneyLogs();
    const { data: newsArticles } = useAdminNews();
    const updateStatus = useUpdateRegistrationStatus();

    if (isLoading) return <div className="loading loading-spinner text-maroon" />;

    const pending = registrations?.filter(r => ['submitted', 'pending'].includes(r.status)) || [];
    const today = new Date().toISOString().slice(0, 10);
    const todaysSchedules = (schedules || []).filter(schedule => schedule.scheduled_start?.slice(0, 10) === today);
    const awaitingFinalization = [
        ...(matches || []).filter(match => !match.is_final),
        ...(podiums || []).filter(podium => !podium.is_final),
    ].length;
    const kpis = [
        { label: 'Departments', value: departments?.length || 0, icon: Users },
        { label: 'Active Events', value: events?.filter(event => event.status !== 'cancelled').length || 0, icon: Trophy },
        { label: 'Ongoing Events', value: events?.filter(event => event.status === 'live').length || 0, icon: Clock },
        { label: 'Pending Registrations', value: pending.length, icon: ClipboardList },
        { label: 'Awaiting Finalization', value: awaitingFinalization, icon: Medal },
        { label: 'Published News', value: newsArticles?.filter(article => article.status === 'published').length || 0, icon: Newspaper },
    ];

    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                {kpis.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
                                <p className="mt-1 text-3xl font-black text-charcoal">{value}</p>
                            </div>
                            <div className="grid h-10 w-10 place-items-center rounded-md bg-maroon/10 text-maroon">
                                <Icon className="h-5 w-5" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]">
                <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-black text-charcoal">Registration Approvals</h2>
                        <Link to="/admin/registrations" className="btn btn-sm btn-ghost text-maroon">
                            Open queue <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

            {pending.length === 0 ? (
                <p className="text-gray-600 italic">No pending registrations.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pending.map(reg => (
                        <div key={reg.id} className="card bg-base-100 shadow-md border-l-4 border-yellow-400">
                            <div className="card-body p-5">
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between gap-4">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <DepartmentLogo
                                                acronym={reg.department_acronym}
                                                name={reg.department_name}
                                                className="h-12 w-12"
                                            />
                                            <div className="min-w-0">
                                            <div className="badge badge-warning mb-2 h-auto min-h-6 whitespace-nowrap px-3 py-1 text-xs capitalize leading-tight">{labelize(reg.status)}</div>
                                            <h3 className="font-bold text-lg text-charcoal">
                                                {reg.department_name}
                                            </h3>
                                            <p className="text-xs font-semibold text-maroon">
                                                {reg.department_acronym}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {reg.schedule_event_name || `Schedule #${reg.schedule}`}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                                {formatScheduleDate(reg.schedule_start)}{reg.venue_name ? ` at ${reg.venue_name}` : ''}
                                            </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            <button
                                                onClick={() => updateStatus.mutate({ id: reg.id!, status: 'approved' })}
                                                className="btn btn-sm btn-success text-white"
                                                disabled={updateStatus.isPending}
                                            >
                                                <CheckCircle className="w-4 h-4"/> Approve
                                            </button>
                                            <button
                                                onClick={() => updateStatus.mutate({
                                                    id: reg.id!,
                                                    status: 'needs_revision',
                                                    admin_notes: 'Please update medical clearances.',
                                                })}
                                                className="btn btn-sm btn-error text-white"
                                                disabled={updateStatus.isPending}
                                            >
                                                <XCircle className="w-4 h-4"/> Revise
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-base-200 p-3 text-xs rounded border border-base-300 text-gray-700">
                                        <div className="font-bold text-charcoal mb-2">
                                            Athletes registered: {reg.roster?.length || 0}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {reg.roster?.length ? reg.roster.map(entry => (
                                                <span key={entry.id || entry.athlete} className="badge h-auto min-h-6 whitespace-nowrap px-3 py-1 text-xs badge-outline">
                                                    {entry.athlete_name || entry.student_number || `Athlete #${entry.athlete}`}
                                                </span>
                                            )) : (
                                                <span className="text-gray-600 italic">No roster attached</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
                </section>

                <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                        <Gauge className="h-5 w-5 text-maroon" />
                        <h2 className="text-xl font-black text-charcoal">Leaderboard Snapshot</h2>
                    </div>
                    <div className="space-y-3">
                        {tally?.slice(0, 5).map((row, index) => (
                            <div key={row.id} className="flex items-center justify-between gap-3 rounded-md bg-base-200 p-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <DepartmentLogo acronym={row.department_acronym} name={row.department_name} className="h-10 w-10" />
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-maroon">Rank {index + 1}</div>
                                        <div className="font-semibold">{row.department_name}</div>
                                    </div>
                                </div>
                                <div className="flex gap-3 text-sm font-bold">
                                    <span>G {row.gold}</span>
                                    <span>S {row.silver}</span>
                                    <span>B {row.bronze}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
                <DashboardPanel title="Today's Schedule" icon={<Calendar className="h-5 w-5" />}>
                    {todaysSchedules.length ? todaysSchedules.map(schedule => (
                        <div key={schedule.id} className="rounded-md border border-base-300 p-3">
                            <div className="font-semibold">{schedule.event_name}</div>
                            <div className="text-xs text-gray-600">{formatScheduleDate(schedule.scheduled_start)} at {schedule.venue_name}</div>
                        </div>
                    )) : <p className="text-sm text-gray-600">No events scheduled today.</p>}
                </DashboardPanel>

                <DashboardPanel title="Latest Rooney Logs" icon={<Bot className="h-5 w-5" />}>
                    {rooneyLogs?.length ? (
                        rooneyLogs.slice(0, 4).map(log => (
                            <div key={log.id} className="rounded-md border border-base-300 p-3">
                                <div className="line-clamp-2 text-sm font-semibold">{log.question_text}</div>
                                <div className="mt-1 text-xs text-gray-600">{log.grounded ? 'Grounded' : 'Refused'} - {log.normalized_intent}</div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-600">No Rooney logs yet.</p>
                    )}
                </DashboardPanel>

                <DashboardPanel title="Quick Actions" icon={<Plus className="h-5 w-5" />}>
                    <div className="grid gap-2">
                        <Link to="/admin/events" className="btn btn-sm justify-start">Manage Events</Link>
                        <Link to="/admin/schedules" className="btn btn-sm justify-start">View Schedules</Link>
                        <Link to="/admin/registrations" className="btn btn-sm justify-start">Review Registrations</Link>
                        <Link to="/admin/results-entry" className="btn btn-sm justify-start">Review Results Entry</Link>
                        <Link to="/admin/news" className="btn btn-sm justify-start">Post Announcement</Link>
                    </div>
                </DashboardPanel>
            </div>
        </div>
    );
}

function DashboardPanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
    return (
        <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-maroon">
                {icon}
                <h2 className="text-lg font-black text-charcoal">{title}</h2>
            </div>
            <div className="space-y-3">{children}</div>
        </section>
    );
}

function DeptRepView() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { user } = useAuth();
    const { data: registrations, isLoading } = useRegistrations();
    const { data: tryouts } = useTryoutApplications();
    const { data: athletes } = useAthletes();
    const { data: schedules } = useSchedules();
    const { data: tally } = useMedalTally();

    if (isLoading) return <div className="loading loading-spinner text-maroon" />;

    const awaitingReview = tryouts?.filter(app => ['submitted', 'under_review'].includes(app.status)).length || 0;
    const conversionQueue = tryouts?.filter(app => app.status === 'selected' && !app.converted_athlete).length || 0;
    const needsRevision = registrations?.filter(reg => reg.status === 'needs_revision').length || 0;
    const approved = registrations?.filter(reg => reg.status === 'approved').length || 0;
    const departmentTally = tally?.find(row => row.department === user?.department_id);
    const rank = tally?.findIndex(row => row.department === user?.department_id);
    const upcoming = (schedules || [])
        .filter(schedule => schedule.participants.some(participant => participant.department === user?.department_id))
        .filter(schedule => !schedule.scheduled_start || new Date(schedule.scheduled_start) >= new Date())
        .slice(0, 4);

    return (
        <div className="space-y-6">
            <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <DepartmentLogo
                            acronym={user?.department_acronym}
                            name={user?.department_name}
                            className="h-16 w-16"
                        />
                        <div>
                            <p className="text-xs font-bold uppercase text-maroon">{user?.department_acronym}</p>
                            <h2 className="text-2xl font-black text-charcoal">{user?.department_name}</h2>
                            <p className="text-sm text-gray-600">Selection, roster building, registration status, and department performance.</p>
                        </div>
                    </div>
                    <div className="rounded-md bg-maroon px-4 py-3 text-white">
                        <p className="text-xs font-bold uppercase text-white/80">Current Rank</p>
                        <p className="text-3xl font-black">{rank === undefined || rank < 0 ? '-' : rank + 1}</p>
                    </div>
                </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <RepMetric label="Awaiting Review" value={awaitingReview} icon={<FileText className="h-5 w-5" />} />
                <RepMetric label="To Convert" value={conversionQueue} icon={<CheckCircle className="h-5 w-5" />} />
                <RepMetric label="Participants" value={athletes?.length || 0} icon={<Users className="h-5 w-5" />} />
                <RepMetric label="Needs Revision" value={needsRevision} icon={<AlertCircle className="h-5 w-5" />} />
                <RepMetric label="Approved" value={approved} icon={<ClipboardList className="h-5 w-5" />} />
                <RepMetric label="Medals" value={departmentTally?.total_medals || 0} icon={<Medal className="h-5 w-5" />} />
            </div>

            <div className="flex flex-wrap gap-3">
                <Link to="/portal/tryouts" className="btn bg-maroon hover:bg-maroon-dark text-white border-none">
                    <FileText className="w-4 h-4 mr-2"/> Review Tryouts
                </Link>
                <Link to="/portal/masterlist" className="btn btn-outline border-maroon text-maroon hover:bg-maroon hover:text-white">
                    <Users className="w-4 h-4 mr-2"/> Manage Participants
                </Link>
                <Link to="/portal/rosters" className="btn btn-outline border-maroon text-maroon hover:bg-maroon hover:text-white">
                    <ClipboardList className="w-4 h-4 mr-2"/> Build Roster
                </Link>
                <button
                    onClick={() => setIsFormOpen(open => !open)}
                    className="btn btn-outline border-maroon text-maroon hover:bg-maroon hover:text-white"
                >
                    <ClipboardList className="w-4 h-4 mr-2"/>
                    {isFormOpen ? 'Close Registration' : 'Submit Registration'}
                </button>
                <Link to="/portal/schedules" className="btn btn-ghost">
                    <Calendar className="w-4 h-4 mr-2"/> View Schedule
                </Link>
                <Link to="/portal/results" className="btn btn-ghost">
                    <Trophy className="w-4 h-4 mr-2"/> View Results
                </Link>
            </div>

            {isFormOpen && (
                <RegistrationForm
                    existingRegistrations={registrations || []}
                    onDone={() => setIsFormOpen(false)}
                />
            )}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <section>
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-charcoal">
                        <Clock className="w-5 h-5"/> My Submissions
                    </h2>

                    {registrations?.length === 0 ? (
                        <p className="text-gray-600 italic">You haven't submitted any event registrations yet.</p>
                    ) : (
                        <div className="overflow-x-auto bg-base-100 rounded-xl shadow-sm border border-base-200">
                            <table className="table table-zebra w-full">
                                <thead>
                                    <tr>
                                        <th>Event</th>
                                        <th>Status</th>
                                        <th>Athletes</th>
                                        <th>Admin Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registrations?.map(reg => (
                                        <tr key={reg.id}>
                                            <td>
                                                <div className="font-bold">{reg.schedule_event_name || `Schedule #${reg.schedule}`}</div>
                                                <div className="text-xs text-gray-600">
                                                    {formatScheduleDate(reg.schedule_start)}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge h-auto min-h-6 whitespace-nowrap px-3 py-1 text-xs capitalize leading-tight ${statusBadgeClass(reg.status)}`}>
                                                    {labelize(reg.status)}
                                                </span>
                                            </td>
                                            <td>{reg.roster?.length || 0} enrolled</td>
                                            <td className="text-xs text-error max-w-xs">{reg.admin_notes || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                    <h2 className="mb-4 text-lg font-black text-charcoal">Upcoming Department Events</h2>
                    <div className="space-y-3">
                        {upcoming.length ? upcoming.map(schedule => (
                            <div key={schedule.id} className="rounded-md bg-base-200 p-3">
                                <div className="font-semibold">{schedule.event_name}</div>
                                <div className="text-xs text-gray-600">{formatScheduleDate(schedule.scheduled_start)}</div>
                            </div>
                        )) : (
                            <p className="text-sm text-gray-600">No department-specific upcoming schedules yet.</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

function RepMetric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
    return (
        <div className="rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
                    <p className="mt-1 text-3xl font-black text-charcoal">{value}</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-md bg-maroon/10 text-maroon">
                    {icon}
                </div>
            </div>
        </div>
    );
}

function RegistrationForm({
    existingRegistrations,
    onDone,
}: {
    existingRegistrations: EventRegistration[];
    onDone: () => void;
}) {
    const { user } = useAuth();
    const { data: schedules, isLoading: schedulesLoading } = useSchedules();
    const { data: athletes, isLoading: athletesLoading } = useAthletes();
    const createRegistration = useCreateRegistration();
    const [selectedScheduleId, setSelectedScheduleId] = useState('');
    const [selectedAthleteIds, setSelectedAthleteIds] = useState<number[]>([]);

    const registeredScheduleIds = new Set(existingRegistrations.map(reg => reg.schedule));
    const availableSchedules = (schedules || []).filter(schedule =>
        !registeredScheduleIds.has(schedule.id)
        && !schedule.is_program_event
        && schedule.event_status === 'scheduled'
    );
    const eligibleAthletes = (athletes || []).filter(athlete => athlete.is_enrolled && athlete.medical_cleared);
    const selectedSchedule = availableSchedules.find(schedule => String(schedule.id) === selectedScheduleId);

    const toggleAthlete = (athleteId: number) => {
        setSelectedAthleteIds(current =>
            current.includes(athleteId)
                ? current.filter(id => id !== athleteId)
                : [...current, athleteId]
        );
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!user?.department_id || !selectedScheduleId || selectedAthleteIds.length === 0) return;

        createRegistration.mutate(
            {
                schedule: Number(selectedScheduleId),
                department: user.department_id,
                roster_athlete_ids: selectedAthleteIds,
            },
            {
                onSuccess: () => {
                    setSelectedScheduleId('');
                    setSelectedAthleteIds([]);
                    onDone();
                },
            }
        );
    };

    const mutationError = createRegistration.error as AxiosError<RegistrationErrorBody> | null;
    const errorText =
        mutationError?.response?.data?.schedule?.[0]
        || mutationError?.response?.data?.roster_athlete_ids?.[0]
        || mutationError?.response?.data?.detail
        || 'Unable to submit registration.';

    return (
        <div className="card bg-base-100 shadow-md border border-base-300">
            <div className="card-body">
                <h2 className="card-title text-maroon flex items-center gap-2">
                    <Plus className="w-5 h-5"/> New Event Registration
                </h2>

                {createRegistration.isError && (
                    <div className="alert alert-error text-sm">
                        <AlertCircle className="w-4 h-4"/>
                        <span>{errorText}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="form-control">
                        <label className="label"><span className="label-text font-semibold">Event Schedule</span></label>
                        <select
                            className="select select-bordered w-full"
                            value={selectedScheduleId}
                            onChange={event => setSelectedScheduleId(event.target.value)}
                            disabled={schedulesLoading || availableSchedules.length === 0}
                            required
                        >
                            <option value="">Select an event schedule</option>
                            {availableSchedules.map(schedule => (
                                <option key={schedule.id} value={schedule.id}>
                                    {schedule.event_name} - {formatScheduleDate(schedule.scheduled_start)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedSchedule && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm bg-ivory rounded-lg border border-maroon/10 p-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-maroon"/>
                                <span>{formatScheduleDate(selectedSchedule.scheduled_start)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-maroon"/>
                                <span>{selectedSchedule.venue_name || 'Venue TBA'}</span>
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="label"><span className="label-text font-semibold">Roster</span></div>
                        {athletesLoading ? (
                            <div className="py-6"><span className="loading loading-spinner text-maroon"></span></div>
                        ) : eligibleAthletes.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-base-300 p-6 text-center text-gray-600">
                                No eligible athletes available.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {eligibleAthletes.map(athlete => {
                                    const checked = selectedAthleteIds.includes(athlete.id!);
                                    return (
                                        <label
                                            key={athlete.id}
                                            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                                                checked ? 'border-maroon bg-maroon/5' : 'border-base-300 hover:border-maroon/40'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-primary mt-1"
                                                checked={checked}
                                                onChange={() => toggleAthlete(athlete.id!)}
                                            />
                                            <span>
                                                <span className="block font-bold text-charcoal">{athlete.full_name}</span>
                                                <span className="block text-xs text-gray-600">
                                                    {athlete.student_number} - {athlete.program_course}, {athlete.year_level}
                                                </span>
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                        <button type="button" className="btn btn-ghost" onClick={onDone}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn bg-maroon hover:bg-maroon-dark text-white border-none"
                            disabled={
                                createRegistration.isPending
                                || !selectedScheduleId
                                || selectedAthleteIds.length === 0
                                || !user?.department_id
                            }
                        >
                            {createRegistration.isPending ? 'Submitting...' : 'Submit Registration'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function statusBadgeClass(status: EventRegistration['status']) {
    if (status === 'approved') return 'badge-success text-white';
    if (status === 'rejected' || status === 'needs_revision') return 'badge-error text-white';
    return 'badge-warning';
}

function labelize(value: string) {
    return value.replaceAll('_', ' ');
}

function formatScheduleDate(value?: string | null) {
    if (!value) return 'TBA';

    try {
        return format(parseISO(value), 'MMM d, yyyy h:mm a');
    } catch {
        return 'TBA';
    }
}
