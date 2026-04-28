import { useState } from 'react';
import type { ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import {
    AlertTriangle,
    CheckCircle,
    Eye,
    Medal,
    Plus,
    RefreshCcw,
    Search,
    Sparkles,
    Swords,
    XCircle,
} from 'lucide-react';
import {
    useAIRecaps,
    useAdminNews,
    useAthletes,
    useApproveAIRecap,
    useCreateAdminNews,
    useDepartments,
    useDiscardAIRecap,
    useEventCategories,
    useEvents,
    useGenerateAIRecap,
    usePublishAIRecap,
    useRegistrations,
    useRooneyLogs,
    useUpdateAIRecap,
    useUpdateAdminNews,
    useUpdateRegistrationStatus,
    useVenues,
} from '../../hooks/useAdminData';
import type { AIRecap, EventRegistration, NewsArticle } from '../../hooks/useAdminData';
import { useMatchResults, useMedalTally, usePodiumResults, useSchedules } from '../../hooks/usePublicData';

export function DepartmentsPage() {
    const { data: departments, isLoading } = useDepartments();
    const { data: registrations } = useRegistrations();
    const [query, setQuery] = useState('');
    const rows = (departments || []).filter(dept =>
        `${dept.name} ${dept.acronym} ${dept.representative_name || ''} ${dept.representative_username || ''}`.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <SectionShell
            title="Departments"
            actionLabel="Add Department"
            searchValue={query}
            onSearch={setQuery}
        >
            <TableState isLoading={isLoading} isEmpty={rows.length === 0}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Full Department Name</th>
                            <th>Representative</th>
                            <th>Registered Events</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(dept => (
                            <tr key={dept.id}>
                                <td className="font-black text-maroon">{dept.acronym}</td>
                                <td className="font-semibold">{dept.name}</td>
                                <td>
                                    <div className="font-semibold text-charcoal">{dept.representative_name || 'Unassigned'}</div>
                                    {dept.representative_username && <div className="text-xs text-gray-600">{dept.representative_username}</div>}
                                </td>
                                <td>{registrations?.filter(reg => reg.department === dept.id).length || 0}</td>
                                <td><StatusChip status={dept.operational_status || 'needs_representative'} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableState>
        </SectionShell>
    );
}

export function VenuesPage() {
    const { data: venues, isLoading } = useVenues();
    const [query, setQuery] = useState('');
    const rows = (venues || []).filter(venue =>
        `${venue.name} ${venue.location}`.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <SectionShell title="Venues" actionLabel="Add Venue" searchValue={query} onSearch={setQuery}>
            <TableState isLoading={isLoading} isEmpty={rows.length === 0}>
                <div className="grid gap-4 lg:grid-cols-2">
                    {rows.map(venue => (
                        <article key={venue.id} className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-black text-charcoal">{venue.name}</h2>
                                    <p className="text-sm text-gray-600">{venue.location || 'Location TBA'}</p>
                                </div>
                                <StatusChip status="active" />
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {venue.areas?.map(area => (
                                    <span key={area.id} className="badge badge-outline border-maroon/30 text-maroon">
                                        {area.name}
                                    </span>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            </TableState>
        </SectionShell>
    );
}

export function CategoriesPage() {
    const { data: categories, isLoading } = useEventCategories();

    return (
        <SectionShell title="Event Categories" actionLabel="Add Category">
            <TableState isLoading={isLoading} isEmpty={!categories?.length}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Label</th>
                            <th>Sort Order</th>
                            <th>Medal Bearing</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories?.map((category, index) => (
                            <tr key={category.id}>
                                <td className="font-mono text-xs">{category.name.toUpperCase().replaceAll(' ', '_')}</td>
                                <td className="font-semibold">{category.name}</td>
                                <td>{index + 1}</td>
                                <td>{category.is_medal_bearing ? 'Yes' : 'No'}</td>
                                <td><StatusChip status="active" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableState>
        </SectionShell>
    );
}

export function EventsPage() {
    const { data: events, isLoading } = useEvents();
    const [status, setStatus] = useState('all');
    const rows = (events || []).filter(event => status === 'all' || event.status === status);

    return (
        <SectionShell title="Events" actionLabel="Create Event">
            <FilterRow>
                <select className="select select-bordered select-sm" value={status} onChange={event => setStatus(event.target.value)}>
                    <option value="all">All statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                    <option value="postponed">Postponed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </FilterRow>
            <TableState isLoading={isLoading} isEmpty={rows.length === 0}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Division</th>
                            <th>Result Mode</th>
                            <th>Medal Bearing</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(event => (
                            <tr key={event.id}>
                                <td className="font-semibold">{event.name}</td>
                                <td>{event.category_name}</td>
                                <td>{event.name.includes("Men") ? "Men's" : event.name.includes("Women") ? "Women's" : 'Open'}</td>
                                <td><StatusChip status={event.result_family} /></td>
                                <td>{event.is_program_event ? 'No' : 'Yes'}</td>
                                <td><StatusChip status={event.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableState>
        </SectionShell>
    );
}

export function SchedulesAdminPage() {
    const { data: schedules, isLoading } = useSchedules();
    const [status, setStatus] = useState('all');
    const rows = (schedules || []).filter(schedule => status === 'all' || schedule.event_status === status);

    return (
        <SectionShell title="Schedules" actionLabel="Add Schedule">
            <FilterRow>
                <select className="select select-bordered select-sm" value={status} onChange={event => setStatus(event.target.value)}>
                    <option value="all">All statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                    <option value="postponed">Postponed</option>
                </select>
            </FilterRow>
            <TableState isLoading={isLoading} isEmpty={rows.length === 0}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Event</th>
                            <th>Category</th>
                            <th>Start</th>
                            <th>End</th>
                            <th>Venue Area</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(schedule => (
                            <tr key={schedule.id}>
                                <td className="font-semibold">{schedule.event_name}</td>
                                <td>{schedule.event_category}</td>
                                <td>{formatDate(schedule.scheduled_start)}</td>
                                <td>{formatDate(schedule.scheduled_end)}</td>
                                <td>{schedule.venue_name} {schedule.venue_area_name && `- ${schedule.venue_area_name}`}</td>
                                <td><StatusChip status={schedule.event_status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableState>
        </SectionShell>
    );
}

export function RegistrationsAdminPage() {
    const { data: registrations, isLoading } = useRegistrations();
    const [selected, setSelected] = useState<EventRegistration | null>(null);
    const [status, setStatus] = useState('all');
    const updateStatus = useUpdateRegistrationStatus();
    const rows = (registrations || []).filter(reg => status === 'all' || reg.status === status);

    return (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <SectionShell title="Registration Review">
                <FilterRow>
                    <select className="select select-bordered select-sm" value={status} onChange={event => setStatus(event.target.value)}>
                        <option value="all">All statuses</option>
                        <option value="submitted">Submitted</option>
                        <option value="pending">Pending</option>
                        <option value="needs_revision">Needs revision</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </FilterRow>
                <TableState isLoading={isLoading} isEmpty={rows.length === 0}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Event</th>
                                <th>Department</th>
                                <th>Submission Date</th>
                                <th>Status</th>
                                <th>Roster</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(reg => (
                                <tr key={reg.id} className="cursor-pointer hover" onClick={() => setSelected(reg)}>
                                    <td className="font-semibold">{reg.schedule_event_name}</td>
                                    <td>{reg.department_name}</td>
                                    <td>{formatDate(reg.created_at)}</td>
                                    <td><StatusChip status={reg.status} /></td>
                                    <td>{reg.roster?.length || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TableState>
            </SectionShell>
            <aside className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                {selected ? (
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-bold uppercase text-maroon">Review Panel</p>
                            <h2 className="text-xl font-black">{selected.department_name}</h2>
                            <p className="text-sm text-gray-600">{selected.schedule_event_name}</p>
                        </div>
                        <StatusChip status={selected.status} />
                        <div>
                            <h3 className="font-bold">Roster submission</h3>
                            <div className="mt-2 space-y-2">
                                {selected.roster?.map(entry => (
                                    <div key={entry.id || entry.athlete} className="rounded-md border border-base-300 p-3">
                                        <div className="font-semibold">{entry.athlete_name}</div>
                                        <div className="text-xs text-gray-600">{entry.student_number}</div>
                                        <div className="mt-1 text-xs">
                                            Eligibility: {entry.is_eligible ? 'Verified' : 'Needs review'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <textarea className="textarea textarea-bordered w-full" placeholder="Review notes" defaultValue={selected.admin_notes} />
                        <div className="flex flex-wrap gap-2">
                            <button className="btn btn-success btn-sm text-white" onClick={() => updateStatus.mutate({ id: selected.id!, status: 'approved' })}>
                                <CheckCircle className="h-4 w-4" /> Approve
                            </button>
                            <button className="btn btn-warning btn-sm" onClick={() => updateStatus.mutate({ id: selected.id!, status: 'needs_revision', admin_notes: 'Please revise roster eligibility documents.' })}>
                                <AlertTriangle className="h-4 w-4" /> Request Revision
                            </button>
                            <button className="btn btn-error btn-sm text-white" onClick={() => updateStatus.mutate({ id: selected.id!, status: 'rejected', admin_notes: 'Registration rejected after review.' })}>
                                <XCircle className="h-4 w-4" /> Reject
                            </button>
                        </div>
                    </div>
                ) : (
                    <EmptyPanel title="Select a registration" text="Choose a row to review roster details and take action." />
                )}
            </aside>
        </div>
    );
}

export function ParticipantsAdminPage() {
    const { data: athletes, isLoading } = useAthletes();
    const { data: departments } = useDepartments();
    const [department, setDepartment] = useState('all');
    const rows = (athletes || []).filter(athlete => department === 'all' || String(athlete.department) === department);

    return (
        <SectionShell title="Participants" actionLabel="Add Participant">
            <FilterRow>
                <select className="select select-bordered select-sm" value={department} onChange={event => setDepartment(event.target.value)}>
                    <option value="all">All departments</option>
                    {departments?.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                </select>
            </FilterRow>
            <TableState isLoading={isLoading} isEmpty={rows.length === 0}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Student Number</th>
                            <th>Full Name</th>
                            <th>Department</th>
                            <th>Program</th>
                            <th>Year</th>
                            <th>Medical</th>
                            <th>Eligibility</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(athlete => {
                            const dept = departments?.find(item => item.id === athlete.department);
                            return (
                                <tr key={athlete.id}>
                                    <td className="font-mono text-xs">{athlete.student_number}</td>
                                    <td className="font-semibold">{athlete.full_name}</td>
                                    <td>{dept?.name || athlete.department}</td>
                                    <td>{athlete.program_course}</td>
                                    <td>{athlete.year_level}</td>
                                    <td><StatusChip status={athlete.medical_cleared ? 'cleared' : 'pending'} /></td>
                                    <td><StatusChip status={athlete.is_enrolled ? 'verified' : 'needs_review'} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </TableState>
        </SectionShell>
    );
}

export function ResultsEntryPage() {
    const { data: schedules } = useSchedules();
    const { data: matches } = useMatchResults();
    const { data: podiums } = usePodiumResults();
    const competitiveSchedules = schedules?.filter(schedule => !schedule.is_program_event) || [];

    return (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <SectionShell title="Results Entry" actionLabel="Finalize Result">
                <div className="grid gap-4 lg:grid-cols-2">
                    <FormCard title="Match-Based Result" icon={<Swords className="h-5 w-5" />}>
                        <select className="select select-bordered w-full">
                            <option>Select match schedule</option>
                            {competitiveSchedules.filter(item => item.result_family === 'match_based').map(schedule => (
                                <option key={schedule.id}>{schedule.event_name}</option>
                            ))}
                        </select>
                        <div className="grid grid-cols-2 gap-3">
                            <input className="input input-bordered" placeholder="Score A" type="number" />
                            <input className="input input-bordered" placeholder="Score B" type="number" />
                        </div>
                        <select className="select select-bordered w-full">
                            <option>normal</option>
                            <option>forfeit</option>
                            <option>walkover</option>
                            <option>disqualification</option>
                        </select>
                    </FormCard>
                    <FormCard title="Rank-Based Result" icon={<Medal className="h-5 w-5" />}>
                        <select className="select select-bordered w-full">
                            <option>Select ranking schedule</option>
                            {competitiveSchedules.filter(item => item.result_family === 'rank_based').map(schedule => (
                                <option key={schedule.id}>{schedule.event_name}</option>
                            ))}
                        </select>
                        <input className="input input-bordered" placeholder="Gold department" />
                        <input className="input input-bordered" placeholder="Silver department" />
                        <input className="input input-bordered" placeholder="Bronze department" />
                    </FormCard>
                </div>
            </SectionShell>
            <aside className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                <h2 className="mb-3 text-lg font-black">Recent Results</h2>
                <div className="space-y-3 text-sm">
                    {matches?.slice(0, 3).map(match => (
                        <div key={match.id} className="rounded-md bg-base-200 p-3">
                            <div className="font-semibold">{match.event_name}</div>
                            <div>{match.home_score} - {match.away_score}</div>
                        </div>
                    ))}
                    {podiums?.slice(0, 3).map(podium => (
                        <div key={`podium-${podium.id}`} className="rounded-md bg-base-200 p-3">
                            <div className="font-semibold">{podium.event_name}</div>
                            <div>Rank {podium.rank}: {podium.department_name}</div>
                        </div>
                    ))}
                </div>
            </aside>
        </div>
    );
}

export function MedalTallyAdminPage() {
    return <MedalTable title="Medal Tally Verification" showCards={false} />;
}

export function LeaderboardAdminPage() {
    return <MedalTable title="Leaderboard" showCards />;
}

export function RooneyLogsPage() {
    const { data: logs, isLoading, isError } = useRooneyLogs();

    return (
        <SectionShell title="Rooney Logs">
            {isError ? (
                <div className="alert alert-warning">Rooney logs are available to admin accounts only.</div>
            ) : (
                <TableState isLoading={isLoading} isEmpty={!logs?.length}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Question</th>
                                <th>Intent</th>
                                <th>Grounded</th>
                                <th>Sources</th>
                                <th>Responded</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs?.map(log => (
                                <tr key={log.id}>
                                    <td className="max-w-md">
                                        <div className="font-semibold">{log.question_text}</div>
                                        {log.refusal_reason && <div className="text-xs text-error">{log.refusal_reason}</div>}
                                    </td>
                                    <td>{log.normalized_intent}</td>
                                    <td><StatusChip status={log.grounded ? 'grounded' : 'refused'} /></td>
                                    <td>{log.source_labels.join(', ') || '-'}</td>
                                    <td>{formatDate(log.responded_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TableState>
            )}
        </SectionShell>
    );
}

export function NewsPage() {
    const { data: articles, isLoading, isError } = useAdminNews();
    const createNews = useCreateAdminNews();
    const updateNews = useUpdateAdminNews();
    const { data: departments } = useDepartments();
    const { data: events } = useEvents();
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<'all' | NewsArticle['status']>('all');
    const [articleType, setArticleType] = useState<'all' | NewsArticle['article_type']>('all');
    const [departmentFilter, setDepartmentFilter] = useState<'all' | string>('all');
    const [eventFilter, setEventFilter] = useState<'all' | string>('all');
    const [selectedId, setSelectedId] = useState<number>(0);
    const [draft, setDraft] = useState<Partial<NewsArticle>>({
        title: '',
        slug: '',
        summary: '',
        body_md: '',
        source_label: 'OSCR Sports Desk',
        status: 'draft',
        article_type: 'announcement',
        event: null,
        department: null,
        ai_generated: false,
    });
    const [editor, setEditor] = useState<Partial<NewsArticle> | null>(null);
    const selected = articles?.find(article => article.id === selectedId) || articles?.[0];
    const activeEditor = editor && selected && editor.id === selected.id ? editor : selected ? toNewsEditor(selected) : null;

    const rows = (articles || []).filter(article => {
        const matchesStatus = status === 'all' || article.status === status;
        const matchesType = articleType === 'all' || article.article_type === articleType;
        const matchesDepartment = departmentFilter === 'all' || String(article.department ?? '') === departmentFilter;
        const matchesEvent = eventFilter === 'all' || String(article.event ?? '') === eventFilter;
        const matchesQuery = `${article.title} ${article.summary} ${article.article_type} ${article.source_label}`.toLowerCase().includes(query.toLowerCase());
        return matchesStatus && matchesType && matchesDepartment && matchesEvent && matchesQuery;
    });

    const addDraft = () => {
        if (!draft.title?.trim() || !draft.summary?.trim() || !draft.body_md?.trim()) return;
        createNews.mutate(
            {
                title: draft.title,
                slug: draft.slug || slugify(draft.title),
                summary: draft.summary,
                body_md: draft.body_md,
                source_label: draft.source_label || 'OSCR Sports Desk',
                article_type: draft.article_type || 'announcement',
                event: draft.event || null,
                department: draft.department || null,
                status: draft.status || 'draft',
                ai_generated: draft.ai_generated || false,
            },
            {
                onSuccess: created => {
                    setSelectedId(created.id);
                    setEditor(toNewsEditor(created));
                    setDraft({
                        title: '',
                        slug: '',
                        summary: '',
                        body_md: '',
                        source_label: 'OSCR Sports Desk',
                        status: 'draft',
                        article_type: 'announcement',
                        event: null,
                        department: null,
                        ai_generated: false,
                    });
                },
            }
        );
    };

    const saveSelected = () => {
        if (!selected || !activeEditor) return;
        updateNews.mutate({
            id: selected.id,
            title: activeEditor.title,
            slug: activeEditor.slug,
            summary: activeEditor.summary,
            body_md: activeEditor.body_md,
            source_label: activeEditor.source_label,
            article_type: activeEditor.article_type,
            event: activeEditor.event ?? null,
            department: activeEditor.department ?? null,
            status: activeEditor.status,
            ai_generated: activeEditor.ai_generated,
        });
    };

    const updateSelectedStatus = (nextStatus: NewsArticle['status']) => {
        if (!selected) return;
        updateNews.mutate({ id: selected.id, status: nextStatus });
        setEditor(current => current ? { ...current, status: nextStatus } : current);
    };

    return (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
            <SectionShell title="News Management" actionLabel="Create Article" searchValue={query} onSearch={setQuery}>
                {isError && <div className="alert alert-warning mb-4">Unable to load official news articles right now.</div>}
                <FilterRow>
                    <select className="select select-sm select-bordered" value={status} onChange={event => setStatus(event.target.value as 'all' | NewsArticle['status'])}>
                        <option value="all">All statuses</option>
                        <option value="draft">Draft</option>
                        <option value="review">Review</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                    </select>
                    <select className="select select-sm select-bordered" value={articleType} onChange={event => setArticleType(event.target.value as 'all' | NewsArticle['article_type'])}>
                        <option value="all">All article types</option>
                        <option value="announcement">Announcement</option>
                        <option value="schedule_update">Schedule Update</option>
                        <option value="highlight">Highlight</option>
                        <option value="result_recap">Result Recap</option>
                        <option value="general_news">General News</option>
                    </select>
                    <select className="select select-sm select-bordered" value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)}>
                        <option value="all">All departments</option>
                        {departments?.map(dept => <option key={dept.id} value={String(dept.id)}>{dept.name}</option>)}
                    </select>
                    <select className="select select-sm select-bordered" value={eventFilter} onChange={event => setEventFilter(event.target.value)}>
                        <option value="all">All linked events</option>
                        {events?.filter(item => !item.is_program_event).map(item => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
                    </select>
                </FilterRow>

                <TableState isLoading={isLoading} isEmpty={rows.length === 0}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>AI</th>
                                <th>Linked Event</th>
                                <th>Linked Department</th>
                                <th>Published</th>
                                <th>Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(article => (
                                <tr key={article.id} className="cursor-pointer hover" onClick={() => { setSelectedId(article.id); setEditor(toNewsEditor(article)); }}>
                                    <td>
                                        <div className="font-bold text-charcoal">{article.title}</div>
                                        <div className="line-clamp-1 text-xs text-gray-600">{article.summary}</div>
                                    </td>
                                    <td><span className="badge badge-outline capitalize">{labelize(article.article_type)}</span></td>
                                    <td><NewsStatusChip status={article.status} /></td>
                                    <td>{article.ai_generated ? <StatusChip status="verified" /> : '-'}</td>
                                    <td className="text-sm">{article.event_name || '-'}</td>
                                    <td className="text-sm">{article.department_name || '-'}</td>
                                    <td>{formatDate(article.published_at)}</td>
                                    <td>{formatDate(article.updated_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TableState>

                <div className="mt-5 rounded-lg border border-base-300 bg-base-100 p-4">
                    <div className="mb-3 flex items-center gap-2 text-maroon">
                        <Plus className="h-5 w-5" />
                        <h3 className="text-lg font-black text-charcoal">New Draft</h3>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <input className="input input-bordered" placeholder="Title" value={draft.title || ''} onChange={event => setDraft({ ...draft, title: event.target.value })} />
                        <input className="input input-bordered" placeholder="Slug" value={draft.slug || ''} onChange={event => setDraft({ ...draft, slug: event.target.value })} />
                        <select className="select select-bordered" value={draft.article_type || 'announcement'} onChange={event => setDraft({ ...draft, article_type: event.target.value as NewsArticle['article_type'] })}>
                            <option value="announcement">Announcement</option>
                            <option value="schedule_update">Schedule Update</option>
                            <option value="highlight">Highlight</option>
                            <option value="result_recap">Result Recap</option>
                            <option value="general_news">General News</option>
                        </select>
                        <select className="select select-bordered" value={draft.department || ''} onChange={event => setDraft({ ...draft, department: event.target.value ? Number(event.target.value) : null })}>
                            <option value="">Linked department</option>
                            {departments?.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                        </select>
                        <select className="select select-bordered" value={draft.status || 'draft'} onChange={event => setDraft({ ...draft, status: event.target.value as NewsArticle['status'] })}>
                            <option value="draft">Draft</option>
                            <option value="review">Review</option>
                            <option value="published">Published</option>
                            <option value="archived">Archived</option>
                        </select>
                        <select className="select select-bordered md:col-span-2" value={draft.event || ''} onChange={event => setDraft({ ...draft, event: event.target.value ? Number(event.target.value) : null })}>
                            <option value="">Linked event</option>
                            {events?.filter(item => !item.is_program_event).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                        <input className="input input-bordered md:col-span-2" placeholder="Source label" value={draft.source_label || ''} onChange={event => setDraft({ ...draft, source_label: event.target.value })} />
                        <label className="label cursor-pointer justify-start gap-3 md:col-span-2 rounded-md bg-base-200 px-4 py-3">
                            <input
                                type="checkbox"
                                className="checkbox checkbox-sm border-maroon [--chkbg:theme(colors.maroon)] [--chkfg:white]"
                                checked={Boolean(draft.ai_generated)}
                                onChange={event => setDraft({ ...draft, ai_generated: event.target.checked })}
                            />
                            <span className="label-text text-sm font-semibold text-charcoal">Mark as AI-assisted article</span>
                        </label>
                        <textarea className="textarea textarea-bordered md:col-span-2" placeholder="Summary" value={draft.summary || ''} onChange={event => setDraft({ ...draft, summary: event.target.value })} />
                        <textarea className="textarea textarea-bordered min-h-28 md:col-span-2" placeholder="Body markdown" value={draft.body_md || ''} onChange={event => setDraft({ ...draft, body_md: event.target.value })} />
                    </div>
                    <button className="btn mt-3 bg-maroon text-white hover:bg-maroon-dark" onClick={addDraft} disabled={createNews.isPending}>
                        {createNews.isPending ? 'Saving...' : 'Save Draft'}
                    </button>
                </div>
            </SectionShell>

            <aside className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                {selected && activeEditor ? (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-md bg-maroon/10 text-maroon">
                                <Eye className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase text-maroon">Editor Preview</p>
                                <h2 className="text-xl font-black text-charcoal">{selected.title}</h2>
                            </div>
                        </div>
                        <NewsStatusChip status={selected.status} />
                        <div className="grid gap-3">
                            <input className="input input-bordered" value={activeEditor.title || ''} onChange={event => setEditor({ ...activeEditor, title: event.target.value })} />
                            <input className="input input-bordered" value={activeEditor.slug || ''} onChange={event => setEditor({ ...activeEditor, slug: event.target.value })} />
                            <select className="select select-bordered" value={activeEditor.article_type || 'announcement'} onChange={event => setEditor({ ...activeEditor, article_type: event.target.value as NewsArticle['article_type'] })}>
                                <option value="announcement">Announcement</option>
                                <option value="schedule_update">Schedule Update</option>
                                <option value="highlight">Highlight</option>
                                <option value="result_recap">Result Recap</option>
                                <option value="general_news">General News</option>
                            </select>
                            <select className="select select-bordered" value={activeEditor.status || 'draft'} onChange={event => setEditor({ ...activeEditor, status: event.target.value as NewsArticle['status'] })}>
                                <option value="draft">Draft</option>
                                <option value="review">Review</option>
                                <option value="published">Published</option>
                                <option value="archived">Archived</option>
                            </select>
                            <select className="select select-bordered" value={activeEditor.department || ''} onChange={event => setEditor({ ...activeEditor, department: event.target.value ? Number(event.target.value) : null })}>
                                <option value="">Linked department</option>
                                {departments?.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                            </select>
                            <select className="select select-bordered" value={activeEditor.event || ''} onChange={event => setEditor({ ...activeEditor, event: event.target.value ? Number(event.target.value) : null })}>
                                <option value="">Linked event</option>
                                {events?.filter(item => !item.is_program_event).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                            <textarea className="textarea textarea-bordered" value={activeEditor.summary || ''} onChange={event => setEditor({ ...activeEditor, summary: event.target.value })} />
                            <textarea className="textarea textarea-bordered min-h-40" value={activeEditor.body_md || ''} onChange={event => setEditor({ ...activeEditor, body_md: event.target.value })} />
                            <input className="input input-bordered" value={activeEditor.source_label || ''} onChange={event => setEditor({ ...activeEditor, source_label: event.target.value })} />
                            <label className="label cursor-pointer justify-start gap-3 rounded-md bg-base-200 px-4 py-3">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-sm border-maroon [--chkbg:theme(colors.maroon)] [--chkfg:white]"
                                    checked={Boolean(activeEditor.ai_generated)}
                                    onChange={event => setEditor({ ...activeEditor, ai_generated: event.target.checked })}
                                />
                                <span className="label-text text-sm font-semibold text-charcoal">AI-assisted article</span>
                            </label>
                        </div>
                        <div className="grid gap-2 text-sm">
                            <InfoRow label="Slug" value={selected.slug} />
                            <InfoRow label="Type" value={labelize(selected.article_type)} />
                            <InfoRow label="Linked event" value={selected.event_name || 'None'} />
                            <InfoRow label="Linked department" value={selected.department_name || 'None'} />
                            <InfoRow label="AI generated" value={selected.ai_generated ? 'Yes' : 'No'} />
                            <InfoRow label="Published" value={selected.published_at ? formatDate(selected.published_at) : 'Not published'} />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            <button className="btn btn-sm" onClick={saveSelected} disabled={updateNews.isPending}>Save Changes</button>
                            <button className="btn btn-sm btn-warning" onClick={() => updateSelectedStatus('review')}>Send to Review</button>
                            <button className="btn btn-sm btn-success text-white" onClick={() => updateSelectedStatus('published')}>Publish</button>
                            <button className="btn btn-sm btn-error text-white" onClick={() => updateSelectedStatus('archived')}>Archive</button>
                        </div>
                    </div>
                ) : (
                    <EmptyPanel title="No article selected" text="Choose an article to preview and edit it." />
                )}
            </aside>
        </div>
    );
}

export function AiRecapsPage() {
    const { data: recaps, isLoading, isError } = useAIRecaps();
    const { data: events } = useEvents();
    const generateRecap = useGenerateAIRecap();
    const updateRecap = useUpdateAIRecap();
    const approveRecap = useApproveAIRecap();
    const discardRecap = useDiscardAIRecap();
    const publishRecap = usePublishAIRecap();
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<'all' | AIRecap['status']>('all');
    const [triggerType, setTriggerType] = useState<'all' | AIRecap['trigger_type']>('all');
    const [eventFilter, setEventFilter] = useState<'all' | string>('all');
    const [generatedWindow, setGeneratedWindow] = useState<'all' | 'day' | 'week'>('all');
    const [selectedId, setSelectedId] = useState<number>(0);
    const [editor, setEditor] = useState<Partial<AIRecap> | null>(null);

    const rows = (recaps || []).filter(recap => {
        const matchesStatus = status === 'all' || recap.status === status;
        const matchesTrigger = triggerType === 'all' || recap.trigger_type === triggerType;
        const matchesEvent = eventFilter === 'all' || String(recap.event ?? '') === eventFilter;
        const matchesWindow = isDateInWindow(recap.generated_at, generatedWindow);
        const matchesQuery = `${recap.generated_title} ${recap.scope_key} ${recap.trigger_type}`.toLowerCase().includes(query.toLowerCase());
        return matchesStatus && matchesTrigger && matchesEvent && matchesWindow && matchesQuery;
    });
    const selected = recaps?.find(recap => recap.id === selectedId) || recaps?.[0];
    const activeEditor = editor && selected && editor.id === selected.id ? editor : selected ? toRecapEditor(selected) : null;

    const saveSelected = () => {
        if (!selected || !activeEditor) return;
        updateRecap.mutate({
            id: selected.id,
            generated_title: activeEditor.generated_title,
            generated_summary: activeEditor.generated_summary,
            generated_body: activeEditor.generated_body,
            status: activeEditor.status,
        });
    };

    return (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
            <SectionShell title="AI Recap Review" actionLabel="Generate Draft" searchValue={query} onSearch={setQuery}>
                {isError && <div className="alert alert-warning mb-4">Unable to load AI recap drafts right now.</div>}
                <FilterRow>
                    <select className="select select-sm select-bordered" value={status} onChange={event => setStatus(event.target.value as 'all' | AIRecap['status'])}>
                        <option value="all">All statuses</option>
                        <option value="generated">Generated</option>
                        <option value="under_review">Under Review</option>
                        <option value="approved">Approved</option>
                        <option value="published">Published</option>
                        <option value="discarded">Discarded</option>
                    </select>
                    <select className="select select-sm select-bordered" value={triggerType} onChange={event => setTriggerType(event.target.value as 'all' | AIRecap['trigger_type'])}>
                        <option value="all">All triggers</option>
                        <option value="manual">Manual</option>
                        <option value="event_completion">Event Completion</option>
                        <option value="medal_update">Medal Update</option>
                        <option value="schedule_highlight">Schedule Highlight</option>
                        <option value="rooney_summary">Rooney Summary</option>
                    </select>
                    <select className="select select-sm select-bordered" value={eventFilter} onChange={event => setEventFilter(event.target.value)}>
                        <option value="all">All events</option>
                        {events?.filter(item => !item.is_program_event).map(item => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
                    </select>
                    <select className="select select-sm select-bordered" value={generatedWindow} onChange={event => setGeneratedWindow(event.target.value as 'all' | 'day' | 'week')}>
                        <option value="all">Any generated date</option>
                        <option value="day">Last 24 hours</option>
                        <option value="week">Last 7 days</option>
                    </select>
                    <button
                        className="btn btn-sm btn-outline border-maroon text-maroon hover:bg-maroon hover:text-white"
                        onClick={() => generateRecap.mutate({}, { onSuccess: recap => setSelectedId(recap.id) })}
                        disabled={generateRecap.isPending}
                    >
                        <RefreshCcw className="h-4 w-4" />
                        {generateRecap.isPending ? 'Generating...' : 'Generate Draft'}
                    </button>
                </FilterRow>

                <TableState isLoading={isLoading} isEmpty={rows.length === 0}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Generated Title</th>
                                <th>Trigger Type</th>
                                <th>Linked Event</th>
                                <th>Status</th>
                                <th>Generated</th>
                                <th>Reviewed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(recap => (
                                <tr key={recap.id} className="cursor-pointer hover" onClick={() => { setSelectedId(recap.id); setEditor(toRecapEditor(recap)); }}>
                                    <td>
                                        <div className="font-bold text-charcoal">{recap.generated_title}</div>
                                        <div className="line-clamp-1 text-xs text-gray-600">{recap.generated_summary}</div>
                                    </td>
                                    <td>{labelize(recap.trigger_type)}</td>
                                    <td>{recap.event_name || recap.department_name || 'Campus-wide'}</td>
                                    <td><RecapStatusChip status={recap.status} /></td>
                                    <td>{formatDate(recap.generated_at)}</td>
                                    <td>{formatDate(recap.reviewed_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TableState>
            </SectionShell>

            <aside className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                {selected && activeEditor ? (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-md bg-maroon/10 text-maroon">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase text-maroon">Editorial Review Desk</p>
                                <h2 className="text-xl font-black text-charcoal">{selected.generated_title}</h2>
                            </div>
                        </div>
                        <RecapStatusChip status={selected.status} />
                        <div className="grid gap-2 text-sm">
                            <InfoRow label="Trigger" value={labelize(selected.trigger_type)} />
                            <InfoRow label="Scope Type" value={labelize(selected.scope_type)} />
                            <InfoRow label="Scope Key" value={selected.scope_key} />
                            <InfoRow label="Linked event" value={selected.event_name || 'None'} />
                            <InfoRow label="Linked department" value={selected.department_name || 'None'} />
                            <InfoRow label="Model" value={selected.model_name} />
                        </div>

                        <div>
                            <h3 className="mb-2 text-sm font-bold uppercase text-maroon">Input Snapshot</h3>
                            <pre className="overflow-auto rounded-md bg-base-200 p-3 text-xs text-gray-700">{JSON.stringify(selected.input_snapshot_json, null, 2)}</pre>
                        </div>

                        <div className="grid gap-3">
                            <input className="input input-bordered" value={activeEditor.generated_title || ''} onChange={event => setEditor({ ...activeEditor, generated_title: event.target.value })} />
                            <textarea className="textarea textarea-bordered" value={activeEditor.generated_summary || ''} onChange={event => setEditor({ ...activeEditor, generated_summary: event.target.value })} />
                            <textarea className="textarea textarea-bordered min-h-40" value={activeEditor.generated_body || ''} onChange={event => setEditor({ ...activeEditor, generated_body: event.target.value })} />
                        </div>

                        <div>
                            <h3 className="mb-2 text-sm font-bold uppercase text-maroon">Citations</h3>
                            <div className="space-y-2">
                                {getCitationSources(selected.citation_map_json).length > 0 ? (
                                    getCitationSources(selected.citation_map_json).map(source => (
                                        <div key={String(source)} className="rounded-md border border-base-300 bg-base-100 px-3 py-2 text-sm text-gray-700">
                                            {String(source)}
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-md bg-base-200 p-3 text-sm text-gray-700">No citation map available.</div>
                                )}
                            </div>
                        </div>

                        {selected.linked_news_article_title && (
                            <div className="rounded-md border border-success/30 bg-success/10 p-3 text-sm text-charcoal">
                                Published news link: <span className="font-semibold">{selected.linked_news_article_title}</span>
                            </div>
                        )}

                        <div className="grid gap-2 sm:grid-cols-2">
                            <button className="btn btn-sm" onClick={saveSelected} disabled={updateRecap.isPending}>Save Edits</button>
                            <button className="btn btn-sm btn-warning" onClick={() => updateRecap.mutate({ id: selected.id, status: 'under_review' })}>Mark Under Review</button>
                            <button className="btn btn-sm btn-success text-white" onClick={() => approveRecap.mutate(selected.id)} disabled={approveRecap.isPending}>Approve</button>
                            <button className="btn btn-sm btn-error text-white" onClick={() => discardRecap.mutate(selected.id)} disabled={discardRecap.isPending}>Discard</button>
                        </div>

                        <button className="btn w-full bg-maroon text-white hover:bg-maroon-dark" onClick={() => publishRecap.mutate(selected.id)} disabled={publishRecap.isPending}>
                            {publishRecap.isPending ? 'Publishing...' : 'Publish as News'}
                        </button>
                    </div>
                ) : (
                    <EmptyPanel title="No recap selected" text="Choose a recap draft to review the generated output and citations." />
                )}
            </aside>
        </div>
    );
}

export function SettingsPage() {
    const { data: departments } = useDepartments();
    const { data: events } = useEvents();
    const { data: news } = useAdminNews();
    const { data: recaps } = useAIRecaps();
    const configuredDepartments = departments?.filter(dept => dept.operational_status === 'ready').length || 0;
    const medalEvents = events?.filter(event => !event.is_program_event).length || 0;
    const publishedNews = news?.filter(article => article.status === 'published').length || 0;
    const pendingRecaps = recaps?.filter(recap => ['generated', 'under_review', 'approved'].includes(recap.status)).length || 0;

    return (
        <div className="space-y-5">
            <SectionShell title="Settings">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <SettingsMetric label="Representative Scope" value={`${configuredDepartments}/${departments?.length || 0}`} help="One department representative account per department." />
                    <SettingsMetric label="Medal Events" value={medalEvents} help="Program events are excluded from medal workflows." />
                    <SettingsMetric label="Published News" value={publishedNews} help="Only published articles appear on public pages and Rooney grounding." />
                    <SettingsMetric label="Recap Queue" value={pendingRecaps} help="Generated, under-review, and approved drafts waiting for admin action." />
                </div>

                <div className="mt-6 grid gap-5 xl:grid-cols-3">
                    <SettingsPanel title="Medal Ranking Rule" status="Locked">
                        <p>Official rankings use gold first, then silver, then bronze. Total medals are shown only for context and no points are computed.</p>
                    </SettingsPanel>
                    <SettingsPanel title="AI Model Fallback" status="Configured">
                        <p>Backend env controls `GEMINI_PRIMARY_MODEL` and `GEMINI_BACKUP_MODELS`, so Rooney and AI Recaps can fail over during model traffic spikes.</p>
                    </SettingsPanel>
                    <SettingsPanel title="Tryout Security" status="Enabled">
                        <p>Public tryout submissions require student email domain validation, OTP verification, Turnstile validation, and duplicate protection.</p>
                    </SettingsPanel>
                </div>

                <div className="mt-6 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-charcoal">
                    Rotate real API keys before any live demo if they were ever pasted into chat, screenshots, commits, or shared archives. Keep live values in `backend/.env` only and use `.env.example` for documentation.
                </div>
            </SectionShell>
        </div>
    );
}

function MedalTable({ title, showCards }: { title: string; showCards: boolean }) {
    const { data: tally, isLoading } = useMedalTally();
    const top3 = tally?.slice(0, 3) || [];

    return (
        <SectionShell title={title} actionLabel="Recompute Standings">
            <div className="alert mb-4 border-maroon/20 bg-maroon/5 text-charcoal">
                Official rank follows gold medals first, then silver, then bronze. Department name is only a final stable sort.
            </div>
            {showCards && (
                <div className="mb-5 grid gap-4 md:grid-cols-3">
                    {top3.map((row, index) => (
                        <div key={row.id} className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                            <div className="text-sm font-bold text-maroon">Rank {index + 1}</div>
                            <div className="mt-1 text-lg font-black">{row.department_name}</div>
                            <div className="mt-3 flex gap-4 text-sm">
                                <span>G {row.gold}</span>
                                <span>S {row.silver}</span>
                                <span>B {row.bronze}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <TableState isLoading={isLoading} isEmpty={!tally?.length}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Department</th>
                            <th>Gold</th>
                            <th>Silver</th>
                            <th>Bronze</th>
                            <th>Total Medals</th>
                            <th>Last Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tally?.map((row, index) => (
                            <tr key={row.id}>
                                <td className="font-black">{index + 1}</td>
                                <td className="font-semibold">{row.department_name}</td>
                                <td className="font-bold text-gold">{row.gold}</td>
                                <td>{row.silver}</td>
                                <td>{row.bronze}</td>
                                <td>{row.total_medals}</td>
                                <td>{formatDate(row.last_updated)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableState>
        </SectionShell>
    );
}

function SectionShell({
    title,
    actionLabel,
    searchValue,
    onSearch,
    children,
}: {
    title: string;
    actionLabel?: string;
    searchValue?: string;
    onSearch?: (value: string) => void;
    children: ReactNode;
}) {
    return (
        <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-black text-charcoal">{title}</h2>
                    <p className="text-sm text-gray-600">Manage operational records for Enverga Arena.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {onSearch && (
                        <label className="input input-sm input-bordered flex items-center gap-2 bg-base-100">
                            <Search className="h-4 w-4 text-gray-500" />
                            <input value={searchValue} onChange={event => onSearch(event.target.value)} placeholder="Search" />
                        </label>
                    )}
                    {actionLabel && <button className="btn btn-sm bg-maroon text-white hover:bg-maroon-dark">{actionLabel}</button>}
                </div>
            </div>
            {children}
        </section>
    );
}

function FilterRow({ children }: { children: ReactNode }) {
    return <div className="mb-4 flex flex-wrap gap-2">{children}</div>;
}

function TableState({ isLoading, isEmpty, children }: { isLoading?: boolean; isEmpty?: boolean; children: ReactNode }) {
    if (isLoading) return <div className="grid min-h-48 place-items-center"><span className="loading loading-spinner text-maroon"></span></div>;
    if (isEmpty) return <EmptyPanel title="No records found" text="Try changing filters or adding a new record." />;
    return <div className="overflow-x-auto rounded-lg border border-base-300">{children}</div>;
}

function SettingsMetric({ label, value, help }: { label: string; value: string | number; help: string }) {
    return (
        <div className="rounded-lg border border-base-300 bg-base-100 p-4">
            <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
            <p className="mt-1 text-3xl font-black text-charcoal">{value}</p>
            <p className="mt-2 text-sm text-gray-600">{help}</p>
        </div>
    );
}

function SettingsPanel({ title, status, children }: { title: string; status: string; children: ReactNode }) {
    return (
        <section className="rounded-lg border border-base-300 bg-base-100 p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="font-black text-charcoal">{title}</h3>
                <span className="badge h-auto min-h-6 whitespace-nowrap bg-maroon px-3 py-1 text-xs text-white">{status}</span>
            </div>
            <div className="text-sm leading-6 text-gray-600">{children}</div>
        </section>
    );
}

function StatusChip({ status }: { status: string }) {
    const normalized = status.replace('_', ' ');
    const className =
        ['approved', 'active', 'ready', 'completed', 'live', 'cleared', 'verified', 'grounded'].includes(status)
            ? 'badge-success text-white'
            : ['rejected', 'cancelled', 'refused', 'needs_review', 'needs_representative'].includes(status)
                ? 'badge-error text-white'
                : ['pending', 'submitted', 'needs_revision', 'scheduled', 'postponed'].includes(status)
                    ? 'badge-warning'
                    : 'badge-outline';

    return <span className={`badge h-auto min-h-6 whitespace-nowrap px-3 py-1 text-xs capitalize leading-tight ${className}`}>{normalized}</span>;
}

function NewsStatusChip({ status }: { status: NewsArticle['status'] }) {
    const classes: Record<NewsArticle['status'], string> = {
        draft: 'badge-neutral text-white',
        review: 'badge-warning',
        published: 'badge-success text-white',
        archived: 'badge-outline border-base-300 text-gray-700',
    };
    return <span className={`badge h-auto min-h-6 whitespace-nowrap px-3 py-1 text-xs capitalize ${classes[status]}`}>{labelize(status)}</span>;
}

function RecapStatusChip({ status }: { status: AIRecap['status'] }) {
    const classes: Record<AIRecap['status'], string> = {
        generated: 'badge-neutral text-white',
        under_review: 'badge-warning',
        approved: 'badge-info text-white',
        published: 'badge-success text-white',
        discarded: 'badge-error text-white',
    };
    return <span className={`badge h-auto min-h-6 whitespace-nowrap px-3 py-1 text-xs capitalize ${classes[status]}`}>{labelize(status)}</span>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4 rounded-md bg-base-200 px-3 py-2">
            <span className="text-gray-600">{label}</span>
            <span className="text-right font-semibold text-charcoal">{value}</span>
        </div>
    );
}

function EmptyPanel({ title, text }: { title: string; text: string }) {
    return (
        <div className="rounded-lg border border-dashed border-base-300 bg-base-100 p-8 text-center">
            <div className="font-bold text-charcoal">{title}</div>
            <p className="mt-1 text-sm text-gray-600">{text}</p>
        </div>
    );
}

function FormCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
    return (
        <div className="rounded-lg border border-base-300 bg-base-100 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-maroon">{icon}{title}</h3>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

function toNewsEditor(article: NewsArticle): Partial<NewsArticle> {
    return {
        id: article.id,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        body_md: article.body_md,
        source_label: article.source_label,
        article_type: article.article_type,
        event: article.event,
        department: article.department,
        status: article.status,
        ai_generated: article.ai_generated,
    };
}

function toRecapEditor(recap: AIRecap): Partial<AIRecap> {
    return {
        id: recap.id,
        generated_title: recap.generated_title,
        generated_summary: recap.generated_summary,
        generated_body: recap.generated_body,
        status: recap.status,
    };
}

function formatDate(value?: string | null) {
    if (!value) return 'TBA';
    try {
        return format(parseISO(value), 'MMM d, yyyy h:mm a');
    } catch {
        return 'TBA';
    }
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function labelize(value: string) {
    return value.replace(/_/g, ' ');
}

function getCitationSources(value: Record<string, unknown> | null | undefined) {
    if (!value) return [] as string[];
    const sources = value.sources;
    if (Array.isArray(sources)) {
        return sources.map(source => String(source));
    }
    return [];
}

function isDateInWindow(value: string | null | undefined, window: 'all' | 'day' | 'week') {
    if (window === 'all') return true;
    if (!value) return false;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return false;
    const elapsed = Date.now() - parsed;
    const day = 1000 * 60 * 60 * 24;
    if (window === 'day') return elapsed <= day;
    return elapsed <= day * 7;
}
