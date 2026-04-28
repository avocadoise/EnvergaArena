import { useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
    ArrowRight,
    Bot,
    CheckCircle,
    ClipboardCheck,
    FileText,
    Newspaper,
    Search,
    Users,
    XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
    useAthletes,
    useConvertTryoutApplication,
    useRegistrations,
    useTryoutApplications,
    useUpdateRegistrationRoster,
    useUpdateTryoutApplication,
} from '../../hooks/useAdminData';
import type { EventRegistration, TryoutApplication, TryoutApplicationStatus } from '../../hooks/useAdminData';
import {
    useMatchResults,
    useMedalTally,
    usePodiumResults,
    usePublishedNews,
    useSchedules,
} from '../../hooks/usePublicData';
import type { EventSchedule } from '../../hooks/usePublicData';

const TRYOUT_STATUSES: TryoutApplicationStatus[] = [
    'submitted',
    'under_review',
    'selected',
    'waitlisted',
    'not_selected',
    'withdrawn',
];

function useDepartmentId() {
    const { user } = useAuth();
    return user?.department_id ?? null;
}

export function DepartmentSummaryPage() {
    const { user } = useAuth();
    const { data: applications } = useTryoutApplications();
    const { data: athletes } = useAthletes();
    const { data: registrations } = useRegistrations();
    const { data: tally } = useMedalTally();
    const { data: matches } = useMatchResults();
    const { data: podiums } = usePodiumResults();
    const departmentId = useDepartmentId();
    const row = tally?.find(item => item.department === departmentId);
    const rank = tally?.findIndex(item => item.department === departmentId);
    const recentPerformance = [
        ...(matches || []).filter(match => match.home_department === departmentId || match.away_department === departmentId),
        ...(podiums || []).filter(podium => podium.department === departmentId),
    ].slice(0, 5);

    return (
        <PageShell
            title="Department Summary"
            eyebrow="Representative Workspace"
            description="Read-only identity and performance summary for your assigned department."
        >
            <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase text-maroon">{user?.department_acronym}</p>
                        <h2 className="text-2xl font-black text-charcoal">{user?.department_name}</h2>
                        <p className="text-sm text-gray-600">Assigned representative: {user?.username}</p>
                    </div>
                    <div className="rounded-md bg-maroon px-4 py-3 text-white">
                        <p className="text-xs font-bold uppercase text-white/80">Official Rank</p>
                        <p className="text-3xl font-black">{rank === undefined || rank < 0 ? '-' : rank + 1}</p>
                    </div>
                </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Tryout applicants" value={applications?.length || 0} icon={<FileText />} />
                <Metric label="Selected applicants" value={applications?.filter(app => app.status === 'selected').length || 0} icon={<CheckCircle />} />
                <Metric label="Active participants" value={athletes?.length || 0} icon={<Users />} />
                <Metric label="Submitted registrations" value={registrations?.length || 0} icon={<ClipboardCheck />} />
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                    <h3 className="mb-4 text-lg font-black text-charcoal">Medal Summary</h3>
                    <div className="grid grid-cols-4 gap-2 text-center">
                        <MedalBox label="Gold" value={row?.gold || 0} className="bg-yellow-100 text-yellow-800" />
                        <MedalBox label="Silver" value={row?.silver || 0} className="bg-gray-100 text-gray-700" />
                        <MedalBox label="Bronze" value={row?.bronze || 0} className="bg-amber-100 text-amber-800" />
                        <MedalBox label="Total" value={row?.total_medals || 0} className="bg-maroon/10 text-maroon" />
                    </div>
                    <p className="mt-4 text-sm text-gray-600">
                        Ranking is medal-priority only: gold first, then silver, then bronze.
                    </p>
                </section>

                <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                    <h3 className="mb-4 text-lg font-black text-charcoal">Recent Performance</h3>
                    <div className="space-y-3">
                        {recentPerformance.length ? recentPerformance.map(item => (
                            <div key={`${item.id}-${item.event_name}`} className="rounded-md bg-base-200 p-3">
                                <div className="font-semibold">{item.event_name}</div>
                                {'home_score' in item ? (
                                    <p className="text-sm text-gray-600">
                                        {item.home_department_name} {item.home_score} - {item.away_score} {item.away_department_name}
                                    </p>
                                ) : (
                                    <p className="text-sm text-gray-600">Rank {item.rank} {item.medal !== 'none' ? `- ${item.medal}` : ''}</p>
                                )}
                            </div>
                        )) : (
                            <EmptyText>No department results recorded yet.</EmptyText>
                        )}
                    </div>
                </section>
            </div>
        </PageShell>
    );
}

export function TryoutApplicationsPage() {
    const { data: applications, isLoading } = useTryoutApplications();
    const updateApplication = useUpdateTryoutApplication();
    const convertApplication = useConvertTryoutApplication();
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<TryoutApplication | null>(null);
    const [reviewNotes, setReviewNotes] = useState('');

    const filtered = useMemo(() => {
        return (applications || []).filter(app => {
            const haystack = `${app.full_name} ${app.student_number} ${app.school_email} ${app.schedule_event_name}`.toLowerCase();
            const matchesSearch = haystack.includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [applications, search, statusFilter]);

    const selectApplication = (application: TryoutApplication) => {
        setSelected(application);
        setReviewNotes(application.review_notes || '');
    };

    const updateStatus = (status: TryoutApplicationStatus) => {
        if (!selected) return;
        updateApplication.mutate(
            { id: selected.id, status, review_notes: reviewNotes },
            { onSuccess: updated => setSelected(updated as TryoutApplication) }
        );
    };

    const convertSelected = () => {
        if (!selected) return;
        convertApplication.mutate(selected.id);
    };

    return (
        <PageShell
            title="Tryout Applications"
            eyebrow="Verified Public Submissions"
            description="Review school-email verified applicants for your department only."
        >
            <div className="flex flex-col gap-3 rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm lg:flex-row lg:items-center">
                <label className="input input-bordered flex flex-1 items-center gap-2 bg-base-100">
                    <Search className="h-4 w-4 text-gray-500" />
                    <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, student number, or email" />
                </label>
                <select className="select select-bordered lg:w-56" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                    <option value="all">All statuses</option>
                    {TRYOUT_STATUSES.map(status => (
                        <option key={status} value={status}>{labelize(status)}</option>
                    ))}
                </select>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                <section className="overflow-x-auto rounded-lg border border-base-300 bg-base-100 shadow-sm">
                    <table className="table table-zebra">
                        <thead className="bg-base-200 text-charcoal">
                            <tr>
                                <th>Applicant</th>
                                <th>Event</th>
                                <th>Program / Year</th>
                                <th>Verified</th>
                                <th>Status</th>
                                <th>Converted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <LoadingRow colSpan={6} />
                            ) : filtered.length ? filtered.map(application => (
                                <tr key={application.id} className="cursor-pointer hover" onClick={() => selectApplication(application)}>
                                    <td>
                                        <div className="font-bold">{application.full_name}</div>
                                        <div className="text-xs text-gray-600">{application.student_number} - {application.school_email}</div>
                                    </td>
                                    <td>
                                        <div className="font-semibold">{application.schedule_event_name}</div>
                                        <div className="text-xs text-gray-600">{formatScheduleDate(application.schedule_start)}</div>
                                    </td>
                                    <td>{application.program_course}<br /><span className="text-xs text-gray-600">{application.year_level}</span></td>
                                    <td>{application.email_verified ? <CheckIcon /> : <XIcon />}</td>
                                    <td><StatusBadge status={application.status} /></td>
                                    <td>{application.converted_athlete ? <CheckIcon /> : <span className="text-xs text-gray-500">No</span>}</td>
                                </tr>
                            )) : (
                                <EmptyRow colSpan={6} text="No verified applications match the current filters." />
                            )}
                        </tbody>
                    </table>
                </section>

                <aside className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                    {selected ? (
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-bold uppercase text-maroon">{selected.department_name}</p>
                                <h3 className="text-xl font-black text-charcoal">{selected.full_name}</h3>
                                <p className="text-sm text-gray-600">{selected.school_email}</p>
                            </div>
                            <DetailGrid rows={[
                                ['Student number', selected.student_number],
                                ['Event', selected.schedule_event_name],
                                ['Program', selected.program_course],
                                ['Year level', selected.year_level],
                                ['Contact', selected.contact_number || '-'],
                                ['Submitted', formatScheduleDate(selected.created_at)],
                                ['Verified', selected.email_verified ? 'Yes' : 'No'],
                            ]} />
                            <div>
                                <h4 className="mb-1 font-bold text-charcoal">Applicant Notes</h4>
                                <p className="rounded-md bg-base-200 p-3 text-sm text-gray-700">{selected.prior_experience || selected.notes || 'No notes submitted.'}</p>
                            </div>
                            <label className="form-control">
                                <span className="label-text mb-1 font-semibold">Internal review notes</span>
                                <textarea className="textarea textarea-bordered min-h-24" value={reviewNotes} onChange={event => setReviewNotes(event.target.value)} />
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button className="btn btn-sm" onClick={() => updateStatus('under_review')}>Under review</button>
                                <button className="btn btn-sm btn-success text-white" onClick={() => updateStatus('selected')}>Select</button>
                                <button className="btn btn-sm btn-warning" onClick={() => updateStatus('waitlisted')}>Waitlist</button>
                                <button className="btn btn-sm btn-error text-white" onClick={() => updateStatus('not_selected')}>Not selected</button>
                            </div>
                            <button
                                className="btn w-full bg-maroon text-white hover:bg-maroon-dark"
                                disabled={selected.status !== 'selected' || !!selected.converted_athlete || convertApplication.isPending}
                                onClick={convertSelected}
                            >
                                {selected.converted_athlete ? 'Already Converted' : 'Convert to Athlete'}
                            </button>
                        </div>
                    ) : (
                        <EmptyText>Select an application to review applicant details, notes, status actions, and conversion.</EmptyText>
                    )}
                </aside>
            </div>
        </PageShell>
    );
}

export function SelectedApplicantsPage() {
    const { data: applications, isLoading } = useTryoutApplications();
    const convertApplication = useConvertTryoutApplication();
    const selected = (applications || []).filter(app => app.status === 'selected' && !app.converted_athlete);

    return (
        <PageShell
            title="Selected Applicants"
            eyebrow="Conversion Queue"
            description="Convert selected tryout applicants into official athlete records before roster building."
        >
            <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                <div className="grid gap-3">
                    {isLoading ? (
                        <span className="loading loading-spinner text-maroon" />
                    ) : selected.length ? selected.map(application => (
                        <div key={application.id} className="flex flex-col gap-3 rounded-md border border-base-300 p-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <div className="font-black text-charcoal">{application.full_name}</div>
                                <div className="text-sm text-gray-600">
                                    {application.student_number} - {application.schedule_event_name} - {application.program_course}
                                </div>
                            </div>
                            <button
                                className="btn bg-maroon text-white hover:bg-maroon-dark"
                                disabled={convertApplication.isPending}
                                onClick={() => convertApplication.mutate(application.id)}
                            >
                                Convert
                            </button>
                        </div>
                    )) : (
                        <EmptyText>No selected applicants are waiting for conversion.</EmptyText>
                    )}
                </div>
            </section>
        </PageShell>
    );
}

export function AvailableEventsPage() {
    const { data: schedules, isLoading } = useSchedules();
    const { data: registrations } = useRegistrations();
    const registeredScheduleIds = new Set((registrations || []).map(registration => registration.schedule));
    const events = (schedules || []).filter(schedule => !schedule.is_program_event);

    return (
        <PageShell
            title="Available Events"
            eyebrow="Registration Preparation"
            description="Review events your department can prepare rosters for. Existing registrations stay tied to your department."
        >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {isLoading ? (
                    <span className="loading loading-spinner text-maroon" />
                ) : events.map(schedule => {
                    const alreadyRegistered = registeredScheduleIds.has(schedule.id);
                    return (
                        <section key={schedule.id} className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-lg font-black text-charcoal">{schedule.event_name}</h3>
                                    <p className="text-sm text-gray-600">{schedule.event_category} - {schedule.result_family === 'match_based' ? 'Match-based' : 'Rank-based'}</p>
                                </div>
                                <span className={`badge ${alreadyRegistered ? 'badge-success text-white' : 'badge-outline'}`}>
                                    {alreadyRegistered ? 'Registered' : schedule.event_status}
                                </span>
                            </div>
                            <DetailGrid rows={[
                                ['Schedule', formatScheduleDate(schedule.scheduled_start)],
                                ['Venue', schedule.venue_area_name ? `${schedule.venue_name} (${schedule.venue_area_name})` : schedule.venue_name || 'TBA'],
                                ['Roster status', alreadyRegistered ? 'View registration status' : 'Available for submission'],
                            ]} />
                            <Link to={alreadyRegistered ? '/portal/registration-status' : '/portal/registrations'} className="btn btn-sm mt-4 w-full bg-maroon text-white hover:bg-maroon-dark">
                                {alreadyRegistered ? 'View Registration' : 'Start Registration'}
                            </Link>
                        </section>
                    );
                })}
            </div>
        </PageShell>
    );
}

export function RosterBuilderPage() {
    const { data: registrations, isLoading } = useRegistrations();
    const { data: athletes } = useAthletes();
    const updateRoster = useUpdateRegistrationRoster();
    const editableRegistrations = (registrations || []).filter(registration => registration.status !== 'approved');
    const [registrationId, setRegistrationId] = useState<number | null>(null);
    const activeRegistration = editableRegistrations.find(registration => registration.id === registrationId) || editableRegistrations[0];
    const [rosterSelections, setRosterSelections] = useState<Record<number, number[]>>({});
    const selectedAthletes = activeRegistration?.id
        ? rosterSelections[activeRegistration.id] ?? activeRegistration.roster.map(entry => entry.athlete)
        : [];

    const toggleAthlete = (athleteId: number) => {
        if (!activeRegistration?.id) return;
        setRosterSelections(current => {
            const existing = current[activeRegistration.id!] ?? activeRegistration.roster.map(entry => entry.athlete);
            return {
                ...current,
                [activeRegistration.id!]: existing.includes(athleteId)
                    ? existing.filter(id => id !== athleteId)
                    : [...existing, athleteId],
            };
        });
    };

    const saveRoster = () => {
        if (!activeRegistration?.id) return;
        updateRoster.mutate({ id: activeRegistration.id, roster_athlete_ids: selectedAthletes });
    };

    return (
        <PageShell
            title="Roster Builder"
            eyebrow="Department Team Entry"
            description="Assign only your department participants to rosters before final submission or resubmission."
        >
            {isLoading ? (
                <span className="loading loading-spinner text-maroon" />
            ) : !activeRegistration ? (
                <section className="rounded-lg border border-base-300 bg-base-100 p-8 text-center shadow-sm">
                    <EmptyText>No editable registrations yet. Start an event registration first.</EmptyText>
                    <Link to="/portal/registrations" className="btn mt-4 bg-maroon text-white hover:bg-maroon-dark">Submit Registration</Link>
                </section>
            ) : (
                <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                    <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                        <h3 className="mb-3 text-lg font-black text-charcoal">Event Registration</h3>
                        <select className="select select-bordered w-full" value={activeRegistration.id} onChange={event => setRegistrationId(Number(event.target.value))}>
                            {editableRegistrations.map(registration => (
                                <option key={registration.id} value={registration.id}>{registration.schedule_event_name}</option>
                            ))}
                        </select>
                        <div className="mt-4 rounded-md bg-base-200 p-3 text-sm">
                            <div className="font-bold">{activeRegistration.schedule_event_name}</div>
                            <div>{formatScheduleDate(activeRegistration.schedule_start)}</div>
                            <div className="mt-2"><RegistrationStatusBadge status={activeRegistration.status} /></div>
                        </div>
                    </section>
                    <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-black text-charcoal">Eligible Department Participants</h3>
                                <p className="text-sm text-gray-600">{selectedAthletes.length} selected for this roster</p>
                            </div>
                            <button className="btn bg-maroon text-white hover:bg-maroon-dark" onClick={saveRoster} disabled={updateRoster.isPending}>
                                Save Roster
                            </button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            {(athletes || []).map(athlete => {
                                const checked = selectedAthletes.includes(athlete.id!);
                                return (
                                    <label key={athlete.id} className={`rounded-md border p-3 ${checked ? 'border-maroon bg-maroon/5' : 'border-base-300'}`}>
                                        <div className="flex items-start gap-3">
                                            <input type="checkbox" className="checkbox checkbox-primary mt-1" checked={checked} onChange={() => toggleAthlete(athlete.id!)} />
                                            <div>
                                                <div className="font-bold">{athlete.full_name}</div>
                                                <div className="text-xs text-gray-600">{athlete.student_number} - {athlete.program_course}</div>
                                                <div className="mt-1 flex gap-1">
                                                    <span className={`badge badge-xs ${athlete.is_enrolled ? 'badge-success text-white' : 'badge-error text-white'}`}>Enrolled</span>
                                                    <span className={`badge badge-xs ${athlete.medical_cleared ? 'badge-success text-white' : 'badge-warning'}`}>Medical</span>
                                                </div>
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </section>
                </div>
            )}
        </PageShell>
    );
}

export function RegistrationStatusPage() {
    const { data: registrations, isLoading } = useRegistrations();
    const [selected, setSelected] = useState<EventRegistration | null>(null);

    return (
        <PageShell
            title="Registration Status"
            eyebrow="Admin Review Tracking"
            description="Track official submissions, revision notes, and approved rosters for your department."
        >
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                <section className="overflow-x-auto rounded-lg border border-base-300 bg-base-100 shadow-sm">
                    <table className="table table-zebra">
                        <thead className="bg-base-200 text-charcoal">
                            <tr>
                                <th>Event</th>
                                <th>Submitted</th>
                                <th>Status</th>
                                <th>Roster</th>
                                <th>Reviewer Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? <LoadingRow colSpan={5} /> : registrations?.length ? registrations.map(registration => (
                                <tr key={registration.id} className="cursor-pointer hover" onClick={() => setSelected(registration)}>
                                    <td className="font-bold">{registration.schedule_event_name}</td>
                                    <td>{formatScheduleDate(registration.created_at)}</td>
                                    <td><RegistrationStatusBadge status={registration.status} /></td>
                                    <td>{registration.roster.length}</td>
                                    <td className="max-w-xs truncate text-sm text-gray-600">{registration.admin_notes || '-'}</td>
                                </tr>
                            )) : <EmptyRow colSpan={5} text="No official registrations submitted yet." />}
                        </tbody>
                    </table>
                </section>

                <aside className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                    {selected ? (
                        <div className="space-y-4">
                            <h3 className="text-xl font-black text-charcoal">{selected.schedule_event_name}</h3>
                            <RegistrationStatusBadge status={selected.status} />
                            <DetailGrid rows={[
                                ['Schedule', formatScheduleDate(selected.schedule_start)],
                                ['Venue', selected.venue_name || 'TBA'],
                                ['Submitted', formatScheduleDate(selected.created_at)],
                                ['Updated', formatScheduleDate(selected.updated_at)],
                            ]} />
                            <div>
                                <h4 className="mb-2 font-bold text-charcoal">Submitted Roster</h4>
                                <div className="space-y-2">
                                    {selected.roster.map(entry => (
                                        <div key={entry.id || entry.athlete} className="rounded-md bg-base-200 p-2 text-sm">
                                            {entry.athlete_name || entry.student_number}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {selected.admin_notes && (
                                <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-charcoal">
                                    {selected.admin_notes}
                                </div>
                            )}
                            {selected.status === 'needs_revision' && (
                                <Link to="/portal/rosters" className="btn w-full bg-maroon text-white hover:bg-maroon-dark">
                                    Edit Roster for Resubmission
                                </Link>
                            )}
                        </div>
                    ) : (
                        <EmptyText>Select a registration to inspect roster and admin review notes.</EmptyText>
                    )}
                </aside>
            </div>
        </PageShell>
    );
}

export function DepartmentSchedulePage() {
    const departmentId = useDepartmentId();
    const { data: schedules, isLoading } = useSchedules();
    const [showAll, setShowAll] = useState(false);
    const departmentSchedules = (schedules || []).filter(schedule => scheduleHasDepartment(schedule, departmentId));
    const visible = showAll ? (schedules || []) : departmentSchedules;

    return (
        <PageShell
            title="Department Schedule"
            eyebrow="Read-only"
            description="Defaults to schedules where your department has a submitted, pending, or approved registration."
        >
            <div className="flex justify-end">
                <label className="label cursor-pointer gap-2">
                    <span className="label-text">Show full public schedule</span>
                    <input type="checkbox" className="toggle toggle-primary" checked={showAll} onChange={event => setShowAll(event.target.checked)} />
                </label>
            </div>
            <ScheduleGrid schedules={visible} isLoading={isLoading} />
        </PageShell>
    );
}

export function DepartmentResultsPage() {
    const departmentId = useDepartmentId();
    const { data: matches, isLoading: matchesLoading } = useMatchResults();
    const { data: podiums, isLoading: podiumsLoading } = usePodiumResults();
    const departmentMatches = (matches || []).filter(match => match.home_department === departmentId || match.away_department === departmentId);
    const departmentPodiums = (podiums || []).filter(podium => podium.department === departmentId);

    return (
        <PageShell
            title="Department Results"
            eyebrow="Read-only"
            description="Official results involving your department. Representatives cannot enter or edit results."
        >
            {matchesLoading || podiumsLoading ? (
                <span className="loading loading-spinner text-maroon" />
            ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                    <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                        <h3 className="mb-4 text-lg font-black text-charcoal">Match Results</h3>
                        <div className="space-y-3">
                            {departmentMatches.length ? departmentMatches.map(match => (
                                <div key={match.id} className="rounded-md bg-base-200 p-3">
                                    <div className="font-bold text-maroon">{match.event_name}</div>
                                    <div className="text-lg font-black">{match.home_department_name} {match.home_score} - {match.away_score} {match.away_department_name}</div>
                                    <div className="text-xs text-gray-600">{match.is_final ? 'Final result' : 'Live or provisional'}</div>
                                </div>
                            )) : <EmptyText>No match results for your department yet.</EmptyText>}
                        </div>
                    </section>
                    <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                        <h3 className="mb-4 text-lg font-black text-charcoal">Ranked Results</h3>
                        <div className="space-y-3">
                            {departmentPodiums.length ? departmentPodiums.map(podium => (
                                <div key={podium.id} className="rounded-md bg-base-200 p-3">
                                    <div className="font-bold text-maroon">{podium.event_name}</div>
                                    <div className="text-lg font-black">Rank {podium.rank}</div>
                                    <div className="text-xs capitalize text-gray-600">{podium.medal !== 'none' ? `${podium.medal} medal` : 'No medal'}</div>
                                </div>
                            )) : <EmptyText>No ranked results for your department yet.</EmptyText>}
                        </div>
                    </section>
                </div>
            )}
        </PageShell>
    );
}

export function DepartmentMedalsPage() {
    const departmentId = useDepartmentId();
    const { data: tally, isLoading } = useMedalTally();
    const { data: medals } = usePodiumResults();
    const row = tally?.find(item => item.department === departmentId);
    const rank = tally?.findIndex(item => item.department === departmentId);
    const recentMedals = (medals || []).filter(podium => podium.department === departmentId && podium.medal !== 'none');

    return (
        <PageShell
            title="Medal Summary"
            eyebrow="Official Department Rank"
            description="Rank uses PRISAA/Olympic medal priority: gold, then silver, then bronze. There is no points system."
        >
            {isLoading ? (
                <span className="loading loading-spinner text-maroon" />
            ) : (
                <>
                    <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase text-maroon">Current Official Rank</p>
                                <p className="text-5xl font-black text-charcoal">{rank === undefined || rank < 0 ? '-' : rank + 1}</p>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                <MedalBox label="Gold" value={row?.gold || 0} className="bg-yellow-100 text-yellow-800" />
                                <MedalBox label="Silver" value={row?.silver || 0} className="bg-gray-100 text-gray-700" />
                                <MedalBox label="Bronze" value={row?.bronze || 0} className="bg-amber-100 text-amber-800" />
                                <MedalBox label="Total" value={row?.total_medals || 0} className="bg-maroon/10 text-maroon" />
                            </div>
                        </div>
                    </section>
                    <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                        <h3 className="mb-4 text-lg font-black text-charcoal">Recent Medal Wins</h3>
                        <div className="space-y-2">
                            {recentMedals.length ? recentMedals.map(podium => (
                                <div key={podium.id} className="flex items-center justify-between rounded-md bg-base-200 p-3">
                                    <span className="font-semibold">{podium.event_name}</span>
                                    <span className="badge badge-warning capitalize">{podium.medal}</span>
                                </div>
                            )) : <EmptyText>No recent medal wins recorded from ranked events.</EmptyText>}
                        </div>
                    </section>
                </>
            )}
        </PageShell>
    );
}

export function RepresentativeNewsPage() {
    const { user } = useAuth();
    const { data: articles, isLoading } = usePublishedNews();
    const scopedArticles = (articles || []).filter(article =>
        !user?.department_id || article.department === null || article.department === user.department_id
    );

    return (
        <PageShell
            title="Announcements"
            eyebrow="Read-only"
            description="Official news publishing is admin-owned in v1. Department representatives can read announcements here."
        >
            {isLoading ? (
                <span className="loading loading-spinner text-maroon" />
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {scopedArticles.length ? scopedArticles.map(article => (
                        <Link key={article.id} to={`/news/${article.slug}`} className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm transition hover:border-maroon/30">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span className="badge border-maroon/30 bg-maroon/10 capitalize text-maroon">{article.article_type.replaceAll('_', ' ')}</span>
                                {article.ai_generated && <span className="badge badge-outline border-maroon/30 text-maroon">AI-assisted</span>}
                            </div>
                            <h3 className="font-black text-charcoal">{article.title}</h3>
                            <p className="mt-2 text-sm text-gray-600">{article.summary}</p>
                            <div className="mt-4 text-xs text-gray-500">
                                {article.department_name ? `${article.department_name} · ` : ''}{article.event_name || 'Campus-wide update'}
                            </div>
                        </Link>
                    )) : (
                        <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                            <div className="flex items-start gap-3">
                                <Newspaper className="mt-1 h-5 w-5 text-maroon" />
                                <div>
                                    <h3 className="font-black text-charcoal">No published announcements yet</h3>
                                    <p className="mt-1 text-sm text-gray-600">
                                        Published announcements, schedule updates, highlights, and recaps will appear here for your department.
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            )}
        </PageShell>
    );
}

export function RepresentativeRooneyPage() {
    const { user } = useAuth();

    return (
        <PageShell
            title="Rooney AI"
            eyebrow="Grounded Assistant"
            description="Use Rooney for public schedules, results, standings, and safe department-relevant questions."
        >
            <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-md bg-maroon text-white">
                        <Bot className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-charcoal">Suggested prompts for {user?.department_acronym}</h3>
                        <p className="text-sm text-gray-600">Rooney must stay grounded in system data and avoid private admin-only details.</p>
                    </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                    {[
                        'What is our current rank?',
                        'What events are scheduled for our department tomorrow?',
                        'How many gold medals does our department have?',
                        'What is the status of the volleyball finals?',
                    ].map(prompt => (
                        <div key={prompt} className="rounded-md bg-base-200 p-3 text-sm font-semibold">{prompt}</div>
                    ))}
                </div>
                <Link to="/rooney" className="btn mt-5 bg-maroon text-white hover:bg-maroon-dark">
                    Open Rooney <ArrowRight className="h-4 w-4" />
                </Link>
            </section>
        </PageShell>
    );
}

function ScheduleGrid({ schedules, isLoading }: { schedules: EventSchedule[]; isLoading: boolean }) {
    if (isLoading) return <span className="loading loading-spinner text-maroon" />;
    if (!schedules.length) return <EmptyText>No schedules found for this view.</EmptyText>;

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {schedules.map(schedule => (
                <section key={schedule.id} className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                    <div className="mb-3 flex items-start justify-between gap-3">
                        <h3 className="text-lg font-black text-charcoal">{schedule.event_name}</h3>
                        <span className="badge badge-outline capitalize">{schedule.event_status}</span>
                    </div>
                    <DetailGrid rows={[
                        ['Category', schedule.event_category],
                        ['Date', formatScheduleDate(schedule.scheduled_start)],
                        ['Venue', schedule.venue_area_name ? `${schedule.venue_name} (${schedule.venue_area_name})` : schedule.venue_name || 'TBA'],
                    ]} />
                    <div className="mt-3 flex flex-wrap gap-1">
                        {schedule.participants.map(participant => (
                            <span key={participant.id} className="badge badge-sm badge-outline">{participant.department_acronym}</span>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

function PageShell({ title, eyebrow, description, children }: { title: string; eyebrow: string; description: string; children: ReactNode }) {
    return (
        <div className="space-y-5">
            <div>
                <p className="text-xs font-bold uppercase text-maroon">{eyebrow}</p>
                <h1 className="text-3xl font-black text-charcoal">{title}</h1>
                <p className="mt-1 text-sm text-gray-600">{description}</p>
            </div>
            {children}
        </div>
    );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: ReactElement }) {
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

function MedalBox({ label, value, className }: { label: string; value: number; className: string }) {
    return (
        <div className={`min-w-20 rounded-md p-3 ${className}`}>
            <div className="text-xs font-bold uppercase">{label}</div>
            <div className="text-2xl font-black">{value}</div>
        </div>
    );
}

function DetailGrid({ rows }: { rows: Array<[string, string | number]> }) {
    return (
        <div className="grid gap-2 text-sm">
            {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 rounded-md bg-base-200 px-3 py-2">
                    <span className="text-gray-600">{label}</span>
                    <span className="text-right font-semibold text-charcoal">{value}</span>
                </div>
            ))}
        </div>
    );
}

function StatusBadge({ status }: { status: TryoutApplicationStatus }) {
    const classes: Record<TryoutApplicationStatus, string> = {
        submitted: 'badge-info text-white',
        under_review: 'badge-warning',
        selected: 'badge-success text-white',
        not_selected: 'badge-error text-white',
        waitlisted: 'badge-neutral text-white',
        withdrawn: 'badge-outline',
    };
    return <span className={`badge h-auto min-h-6 whitespace-nowrap px-3 py-1 text-xs capitalize leading-tight ${classes[status]}`}>{labelize(status)}</span>;
}

function RegistrationStatusBadge({ status }: { status: EventRegistration['status'] }) {
    const classes: Record<EventRegistration['status'], string> = {
        submitted: 'badge-info text-white',
        pending: 'badge-warning',
        needs_revision: 'badge-error text-white',
        approved: 'badge-success text-white',
        rejected: 'badge-neutral text-white',
    };
    return <span className={`badge h-auto min-h-6 whitespace-nowrap px-3 py-1 text-xs capitalize leading-tight ${classes[status]}`}>{labelize(status)}</span>;
}

function CheckIcon() {
    return <CheckCircle className="h-5 w-5 text-success" />;
}

function XIcon() {
    return <XCircle className="h-5 w-5 text-error" />;
}

function EmptyText({ children }: { children: ReactNode }) {
    return <p className="rounded-md border border-dashed border-base-300 p-5 text-center text-sm text-gray-600">{children}</p>;
}

function LoadingRow({ colSpan }: { colSpan: number }) {
    return (
        <tr>
            <td colSpan={colSpan} className="py-10 text-center">
                <span className="loading loading-spinner text-maroon" />
            </td>
        </tr>
    );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
    return (
        <tr>
            <td colSpan={colSpan} className="py-10 text-center text-gray-600">{text}</td>
        </tr>
    );
}

function scheduleHasDepartment(schedule: EventSchedule, departmentId: number | null) {
    if (!departmentId) return false;
    return schedule.participants.some(participant => participant.department === departmentId);
}

function labelize(value: string) {
    return value.replace('_', ' ');
}

function formatScheduleDate(value?: string | null) {
    if (!value) return 'TBA';

    try {
        return format(parseISO(value), 'MMM d, yyyy h:mm a');
    } catch {
        return 'TBA';
    }
}
