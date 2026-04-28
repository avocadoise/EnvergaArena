import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
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
    useCreateEvent,
    useCreateSchedule,
    useCreateVenue,
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
    useUpdateEvent,
    useUpdateRegistrationStatus,
    useUpdateSchedule,
    useVenues,
} from '../../hooks/useAdminData';
import type { AIRecap, EventItem, EventPayload, EventRegistration, NewsArticle, SchedulePayload } from '../../hooks/useAdminData';
import { useMatchResults, useMedalTally, usePodiumResults, useSchedules } from '../../hooks/usePublicData';
import type { EventSchedule } from '../../hooks/usePublicData';
import DepartmentLogo from '../../components/DepartmentLogo';

type ScheduleStatus = 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled';

interface ScheduleFormState {
    id?: number;
    event: string;
    phase: string;
    round_label: string;
    scheduled_start: string;
    scheduled_end: string;
    venue: string;
    venue_area: string;
    status: ScheduleStatus;
    notes: string;
}

interface EventFormState {
    id?: number;
    name: string;
    slug: string;
    category: string;
    division: string;
    result_family: 'match_based' | 'rank_based';
    competition_format: string;
    best_of: string;
    team_size_min: string;
    team_size_max: string;
    roster_size_max: string;
    medal_bearing: boolean;
    ruleset_ref: string;
    status: EventItem['status'];
    sort_order: string;
}

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
                                <td>
                                    <div className="flex items-center gap-3">
                                        <DepartmentLogo acronym={dept.acronym} name={dept.name} className="h-9 w-9" />
                                        <span className="font-black text-maroon">{dept.acronym}</span>
                                    </div>
                                </td>
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
    const createVenue = useCreateVenue();
    const [query, setQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({
        name: '',
        campus: 'Main Campus',
        building: '',
        address: '',
        location: '',
        is_indoor: true,
        is_active: true,
        notes: '',
    });
    const rows = (venues || []).filter(venue =>
        `${venue.name} ${venue.location} ${venue.campus || ''} ${venue.building || ''}`.toLowerCase().includes(query.toLowerCase())
    );

    const closeModal = () => {
        setIsModalOpen(false);
        setForm({
            name: '',
            campus: 'Main Campus',
            building: '',
            address: '',
            location: '',
            is_indoor: true,
            is_active: true,
            notes: '',
        });
    };

    const submitVenue = (event: FormEvent) => {
        event.preventDefault();
        createVenue.mutate(form, {
            onSuccess: closeModal,
        });
    };

    return (
        <SectionShell title="Venues" searchValue={query} onSearch={setQuery}>
            <div className="mb-4 flex flex-col gap-3 rounded-lg border border-base-300 bg-base-100 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h3 className="font-black text-charcoal">Venue Operations</h3>
                    <p className="text-sm text-gray-600">Create venues now; area management can build on each venue record later.</p>
                </div>
                <button className="btn bg-maroon text-white hover:bg-maroon-dark" onClick={() => setIsModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add Venue
                </button>
            </div>

            {createVenue.isSuccess && (
                <div className="alert mb-4 border-success/30 bg-success/10 text-charcoal">
                    Venue added successfully.
                </div>
            )}

            {createVenue.isError && (
                <div className="alert mb-4 border-error/30 bg-error/10 text-charcoal">
                    Unable to add venue. Check the required fields and try again.
                </div>
            )}

            <TableState isLoading={isLoading} isEmpty={rows.length === 0}>
                <div className="grid gap-4 lg:grid-cols-2">
                    {rows.map(venue => (
                        <article key={venue.id} className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-black text-charcoal">{venue.name}</h2>
                                    <p className="text-sm text-gray-600">{venue.location || venue.building || 'Location TBA'}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {venue.campus && <span className="badge badge-sm badge-outline border-maroon/30 text-maroon">{venue.campus}</span>}
                                        <span className="badge badge-sm badge-outline">{venue.is_indoor ? 'Indoor' : 'Outdoor'}</span>
                                    </div>
                                </div>
                                <StatusChip status={venue.is_active === false ? 'inactive' : 'active'} />
                            </div>
                            {(venue.building || venue.address || venue.notes) && (
                                <div className="mt-4 rounded-md bg-base-200 p-3 text-sm text-gray-700">
                                    {venue.building && <div><span className="font-semibold text-charcoal">Building:</span> {venue.building}</div>}
                                    {venue.address && <div><span className="font-semibold text-charcoal">Address:</span> {venue.address}</div>}
                                    {venue.notes && <div><span className="font-semibold text-charcoal">Notes:</span> {venue.notes}</div>}
                                </div>
                            )}
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

            {isModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-3xl rounded-lg">
                        <div className="mb-4">
                            <p className="text-xs font-bold uppercase text-maroon">Venue Management</p>
                            <h3 className="text-2xl font-black text-charcoal">Add Venue</h3>
                            <p className="text-sm text-gray-600">Create a venue record for schedule assignment and future venue area management.</p>
                        </div>

                        <form onSubmit={submitVenue} className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="form-control">
                                    <span className="label-text mb-1 font-semibold">Venue name</span>
                                    <input
                                        className="input input-bordered"
                                        value={form.name}
                                        onChange={event => setForm({ ...form, name: event.target.value })}
                                        placeholder="University Indoor Courts"
                                        required
                                    />
                                </label>
                                <label className="form-control">
                                    <span className="label-text mb-1 font-semibold">Campus</span>
                                    <input
                                        className="input input-bordered"
                                        value={form.campus}
                                        onChange={event => setForm({ ...form, campus: event.target.value })}
                                        placeholder="Main Campus"
                                    />
                                </label>
                                <label className="form-control">
                                    <span className="label-text mb-1 font-semibold">Building / location</span>
                                    <input
                                        className="input input-bordered"
                                        value={form.building}
                                        onChange={event => setForm({ ...form, building: event.target.value, location: event.target.value })}
                                        placeholder="Sports Complex"
                                    />
                                </label>
                                <label className="form-control">
                                    <span className="label-text mb-1 font-semibold">Address</span>
                                    <input
                                        className="input input-bordered"
                                        value={form.address}
                                        onChange={event => setForm({ ...form, address: event.target.value })}
                                        placeholder="Lucena City"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="form-control">
                                    <span className="label-text mb-1 font-semibold">Venue type</span>
                                    <select
                                        className="select select-bordered"
                                        value={form.is_indoor ? 'indoor' : 'outdoor'}
                                        onChange={event => setForm({ ...form, is_indoor: event.target.value === 'indoor' })}
                                    >
                                        <option value="indoor">Indoor</option>
                                        <option value="outdoor">Outdoor</option>
                                    </select>
                                </label>
                                <label className="form-control">
                                    <span className="label-text mb-1 font-semibold">Status</span>
                                    <select
                                        className="select select-bordered"
                                        value={form.is_active ? 'active' : 'inactive'}
                                        onChange={event => setForm({ ...form, is_active: event.target.value === 'active' })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </label>
                            </div>

                            <label className="form-control">
                                <span className="label-text mb-1 font-semibold">Address or notes</span>
                                <textarea
                                    className="textarea textarea-bordered min-h-24"
                                    value={form.notes}
                                    onChange={event => setForm({ ...form, notes: event.target.value })}
                                    placeholder="Operational notes, access instructions, or setup details"
                                />
                            </label>

                            <div className="rounded-md border border-dashed border-base-300 bg-base-200 p-3 text-sm text-gray-600">
                                Venue areas such as Court A, Table Tennis Area, or Esports Room A can be managed from this venue record in the next increment.
                            </div>

                            <div className="modal-action">
                                <button type="button" className="btn btn-ghost" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button className="btn bg-maroon text-white hover:bg-maroon-dark" disabled={createVenue.isPending}>
                                    {createVenue.isPending ? 'Saving...' : 'Save Venue'}
                                </button>
                            </div>
                        </form>
                    </div>
                    <button className="modal-backdrop" onClick={closeModal}>Close</button>
                </div>
            )}
        </SectionShell>
    );
}

export function CategoriesPage() {
    const { data: categories, isLoading } = useEventCategories();

    return (
        <SectionShell title="Event Categories">
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
    const { data: categories } = useEventCategories();
    const createEvent = useCreateEvent();
    const updateEvent = useUpdateEvent();
    const [status, setStatus] = useState('all');
    const [category, setCategory] = useState('all');
    const [resultMode, setResultMode] = useState('all');
    const [medalBearing, setMedalBearing] = useState('all');
    const [division, setDivision] = useState('all');
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<EventItem | null>(null);
    const [editor, setEditor] = useState<EventFormState | null>(null);
    const activeEvent = editor?.id ? events?.find(event => event.id === editor.id) || null : null;
    const mutationError = createEvent.error || updateEvent.error;
    const apiError = getApiErrorMessage(mutationError);
    const divisions = Array.from(new Set((events || []).map(event => event.division || 'Open'))).sort();
    const rows = (events || []).filter(event => {
        const matchesStatus = status === 'all' || event.status === status;
        const matchesCategory = category === 'all' || String(event.category) === category;
        const matchesResultMode = resultMode === 'all' || event.result_family === resultMode;
        const matchesMedal = medalBearing === 'all' || String(event.medal_bearing) === medalBearing;
        const matchesDivision = division === 'all' || (event.division || 'Open') === division;
        const matchesQuery = `${event.name} ${event.slug} ${event.category_name} ${event.division} ${event.competition_format}`.toLowerCase().includes(query.toLowerCase());
        return matchesStatus && matchesCategory && matchesResultMode && matchesMedal && matchesDivision && matchesQuery;
    });

    const openCreate = () => {
        setSelected(null);
        setEditor(createEmptyEventForm(categories?.[0]?.id));
    };

    const openEdit = (event: EventItem) => {
        setSelected(event);
        setEditor(eventToForm(event));
    };

    const saveEvent = (event: FormEvent) => {
        event.preventDefault();
        if (!editor) return;

        if (activeEvent && isSensitiveEventEdit(activeEvent, editor)) {
            const confirmed = window.confirm('This event has linked schedules, registrations, or results. Continue with this metadata/status update?');
            if (!confirmed) return;
        }

        const payload = formToEventPayload(editor);
        if (editor.id) {
            updateEvent.mutate(
                { id: editor.id, ...payload },
                { onSuccess: saved => { setSelected(saved); setEditor(null); } },
            );
            return;
        }

        createEvent.mutate(payload as EventPayload, {
            onSuccess: saved => { setSelected(saved); setEditor(null); },
        });
    };

    const patchStatus = (event: EventItem, nextStatus: EventItem['status']) => {
        if (event.linked_schedule_count || event.linked_registration_count || event.linked_result_count) {
            const confirmed = window.confirm('This event has linked operational data. Continue with the status change?');
            if (!confirmed) return;
        }
        updateEvent.mutate({ id: event.id, status: nextStatus });
    };

    return (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SectionShell title="Events" searchValue={query} onSearch={setQuery}>
            <FilterRow>
                <select className="select select-bordered select-sm" value={status} onChange={event => setStatus(event.target.value)}>
                    <option value="all">All statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                    <option value="postponed">Postponed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="archived">Archived</option>
                </select>
                <select className="select select-bordered select-sm" value={category} onChange={event => setCategory(event.target.value)}>
                    <option value="all">All categories</option>
                    {(categories || []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <select className="select select-bordered select-sm" value={resultMode} onChange={event => setResultMode(event.target.value)}>
                    <option value="all">All result modes</option>
                    <option value="match_based">Match Based</option>
                    <option value="rank_based">Rank Based</option>
                </select>
                <select className="select select-bordered select-sm" value={medalBearing} onChange={event => setMedalBearing(event.target.value)}>
                    <option value="all">All medal settings</option>
                    <option value="true">Medal-bearing</option>
                    <option value="false">Non-medal</option>
                </select>
                <select className="select select-bordered select-sm" value={division} onChange={event => setDivision(event.target.value)}>
                    <option value="all">All divisions</option>
                    {divisions.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
                <button className="btn btn-sm bg-maroon text-white hover:bg-maroon-dark" onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Add Event
                </button>
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
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(event => (
                            <tr key={event.id} className="hover">
                                <td>
                                    <div className="font-semibold">{event.name}</div>
                                    <div className="text-xs text-gray-600">{event.slug}</div>
                                </td>
                                <td>{event.category_name}</td>
                                <td>{event.division || 'Open'}</td>
                                <td><StatusChip status={event.result_family} /></td>
                                <td>{event.medal_bearing ? 'Yes' : 'No'}</td>
                                <td><StatusChip status={event.status} /></td>
                                <td>
                                    <div className="flex flex-wrap gap-2">
                                        <button className="btn btn-xs" onClick={() => setSelected(event)}>
                                            <Eye className="h-3.5 w-3.5" />
                                            View
                                        </button>
                                        <button className="btn btn-xs border-maroon text-maroon hover:bg-maroon hover:text-white" onClick={() => openEdit(event)}>
                                            Edit
                                        </button>
                                        {event.status !== 'archived' && (
                                            <button className="btn btn-xs btn-warning" onClick={() => patchStatus(event, 'archived')}>
                                                Archive
                                            </button>
                                        )}
                                    </div>
                                </td>
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
                        <h3 className="text-xl font-black text-charcoal">{selected.name}</h3>
                        <p className="text-sm text-gray-600">{selected.category_name} - {selected.division || 'Open'}</p>
                    </div>
                    {(selected.linked_schedule_count > 0 || selected.linked_registration_count > 0 || selected.linked_result_count > 0) && (
                        <div className="alert alert-warning py-3 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>This event has linked operational data. Sensitive changes require care.</span>
                        </div>
                    )}
                    <div className="space-y-2 text-sm">
                        <InfoRow label="Slug" value={selected.slug || 'Not set'} />
                        <InfoRow label="Result mode" value={labelize(selected.result_family)} />
                        <InfoRow label="Medal bearing" value={selected.medal_bearing ? 'Yes' : 'No'} />
                        <InfoRow label="Status" value={labelize(selected.status)} />
                        <InfoRow label="Competition format" value={selected.competition_format || 'Not set'} />
                        <InfoRow label="Best of" value={selected.best_of ? String(selected.best_of) : 'Not set'} />
                        <InfoRow label="Team size" value={`${selected.team_size_min ?? 'TBA'} - ${selected.team_size_max ?? 'TBA'}`} />
                        <InfoRow label="Roster max" value={selected.roster_size_max ? String(selected.roster_size_max) : 'Not set'} />
                        <InfoRow label="Schedules" value={String(selected.linked_schedule_count)} />
                        <InfoRow label="Registrations" value={String(selected.linked_registration_count)} />
                        <InfoRow label="Results" value={String(selected.linked_result_count)} />
                    </div>
                    {selected.ruleset_ref && (
                        <div className="rounded-md bg-base-200 p-3">
                            <div className="text-xs font-bold uppercase text-gray-500">Ruleset reference</div>
                            <p className="mt-1 text-sm text-charcoal">{selected.ruleset_ref}</p>
                        </div>
                    )}
                    <button className="btn w-full bg-maroon text-white hover:bg-maroon-dark" onClick={() => openEdit(selected)}>
                        Edit Event
                    </button>
                </div>
            ) : (
                <EmptyPanel title="No event selected" text="View or edit a row to inspect operational metadata and linked records." />
            )}
        </aside>
        {editor && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
                <form className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-base-100 p-6 shadow-2xl" onSubmit={saveEvent}>
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-2xl font-black text-charcoal">{editor.id ? 'Edit Event' : 'Add Event'}</h3>
                            <p className="text-sm text-gray-600">Manage event definitions, result mode, roster limits, and operational status.</p>
                        </div>
                        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditor(null)}>Close</button>
                    </div>
                    {activeEvent && isSensitiveEventEdit(activeEvent, editor) && (
                        <div className="alert alert-warning mb-4 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>This event has linked schedules, registrations, or results. Result mode and medal-bearing changes may be blocked by the backend.</span>
                        </div>
                    )}
                    {apiError && (
                        <div className="alert alert-warning mb-4 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>{apiError}</span>
                        </div>
                    )}
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="form-control">
                            <span className="label-text font-semibold">Title</span>
                            <input className="input input-bordered" value={editor.name} onChange={event => setEditor({ ...editor, name: event.target.value, slug: editor.slug || slugify(event.target.value) })} required />
                        </label>
                        <label className="form-control">
                            <span className="label-text font-semibold">Slug</span>
                            <input className="input input-bordered" value={editor.slug} onChange={event => setEditor({ ...editor, slug: slugify(event.target.value) })} placeholder="auto-generated-if-empty" />
                        </label>
                        <label className="form-control">
                            <span className="label-text font-semibold">Category</span>
                            <select className="select select-bordered" value={editor.category} onChange={event => setEditor({ ...editor, category: event.target.value })} required>
                                <option value="">Select category</option>
                                {(categories || []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                        </label>
                        <label className="form-control">
                            <span className="label-text font-semibold">Division</span>
                            <input className="input input-bordered" value={editor.division} onChange={event => setEditor({ ...editor, division: event.target.value })} placeholder="Open, Men's, Women's, Mixed" />
                        </label>
                        <label className="form-control">
                            <span className="label-text font-semibold">Result mode</span>
                            <select className="select select-bordered" value={editor.result_family} onChange={event => setEditor({ ...editor, result_family: event.target.value as EventFormState['result_family'] })}>
                                <option value="match_based">Match Based</option>
                                <option value="rank_based">Rank Based</option>
                            </select>
                        </label>
                        <label className="form-control">
                            <span className="label-text font-semibold">Competition format</span>
                            <input className="input input-bordered" value={editor.competition_format} onChange={event => setEditor({ ...editor, competition_format: event.target.value })} placeholder="Single elimination, timed final, bracket" />
                        </label>
                        <label className="form-control">
                            <span className="label-text font-semibold">Best of</span>
                            <input type="number" min="1" className="input input-bordered" value={editor.best_of} onChange={event => setEditor({ ...editor, best_of: event.target.value })} />
                        </label>
                        <label className="form-control">
                            <span className="label-text font-semibold">Status</span>
                            <select className="select select-bordered" value={editor.status} onChange={event => setEditor({ ...editor, status: event.target.value as EventItem['status'] })}>
                                <option value="scheduled">Scheduled</option>
                                <option value="live">Live</option>
                                <option value="completed">Completed</option>
                                <option value="postponed">Postponed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="archived">Archived</option>
                            </select>
                        </label>
                        <label className="form-control">
                            <span className="label-text font-semibold">Team size min</span>
                            <input type="number" min="0" className="input input-bordered" value={editor.team_size_min} onChange={event => setEditor({ ...editor, team_size_min: event.target.value })} />
                        </label>
                        <label className="form-control">
                            <span className="label-text font-semibold">Team size max</span>
                            <input type="number" min="0" className="input input-bordered" value={editor.team_size_max} onChange={event => setEditor({ ...editor, team_size_max: event.target.value })} />
                        </label>
                        <label className="form-control">
                            <span className="label-text font-semibold">Roster size max</span>
                            <input type="number" min="0" className="input input-bordered" value={editor.roster_size_max} onChange={event => setEditor({ ...editor, roster_size_max: event.target.value })} />
                        </label>
                        <label className="form-control">
                            <span className="label-text font-semibold">Sort order</span>
                            <input type="number" min="0" className="input input-bordered" value={editor.sort_order} onChange={event => setEditor({ ...editor, sort_order: event.target.value })} />
                        </label>
                        <label className="flex items-center gap-3 rounded-lg border border-base-300 p-3">
                            <input type="checkbox" className="toggle bg-maroon" checked={editor.medal_bearing} onChange={event => setEditor({ ...editor, medal_bearing: event.target.checked })} />
                            <span>
                                <span className="block font-semibold text-charcoal">Medal-bearing event</span>
                                <span className="text-xs text-gray-600">Counts toward medal tally when final results are entered.</span>
                            </span>
                        </label>
                        <label className="form-control md:col-span-2">
                            <span className="label-text font-semibold">Ruleset reference</span>
                            <input className="input input-bordered" value={editor.ruleset_ref} onChange={event => setEditor({ ...editor, ruleset_ref: event.target.value })} placeholder="Rules memo, handbook section, or format note" />
                        </label>
                    </div>
                    <div className="mt-6 flex flex-wrap justify-end gap-2">
                        <button type="button" className="btn" onClick={() => setEditor(null)}>Cancel</button>
                        <button type="submit" className="btn bg-maroon text-white hover:bg-maroon-dark" disabled={createEvent.isPending || updateEvent.isPending}>
                            {createEvent.isPending || updateEvent.isPending ? 'Saving...' : 'Save Event'}
                        </button>
                    </div>
                </form>
            </div>
        )}
        </div>
    );
}

export function SchedulesAdminPage() {
    const { data: schedules, isLoading } = useSchedules();
    const { data: events } = useEvents();
    const { data: venues } = useVenues();
    const createSchedule = useCreateSchedule();
    const updateSchedule = useUpdateSchedule();
    const [status, setStatus] = useState('all');
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<EventSchedule | null>(null);
    const [editor, setEditor] = useState<ScheduleFormState | null>(null);
    const rows = (schedules || []).filter(schedule => {
        const scheduleStatus = getScheduleStatus(schedule);
        const matchesStatus = status === 'all' || scheduleStatus === status;
        const matchesQuery = `${schedule.event_name} ${schedule.event_category} ${schedule.venue_name || ''} ${schedule.venue_area_name || ''}`.toLowerCase().includes(query.toLowerCase());
        return matchesStatus && matchesQuery;
    });
    const activeSchedule = editor?.id ? schedules?.find(schedule => schedule.id === editor.id) || null : null;
    const selectedVenueId = Number(editor?.venue || 0);
    const venueAreas = venues?.flatMap(venue => venue.areas.map(area => ({ ...area, venue_name: venue.name }))) || [];
    const filteredVenueAreas = venueAreas.filter(area => !selectedVenueId || area.venue === selectedVenueId);
    const conflict = editor ? findScheduleConflict(editor, schedules || []) : null;
    const mutationError = createSchedule.error || updateSchedule.error;
    const apiError = getApiErrorMessage(mutationError);

    const openCreate = () => {
        setSelected(null);
        setEditor(createEmptyScheduleForm());
    };

    const openEdit = (schedule: EventSchedule) => {
        setSelected(schedule);
        setEditor(scheduleToForm(schedule));
    };

    const patchStatus = (schedule: EventSchedule, nextStatus: SchedulePayload['status']) => {
        if (schedule.status === 'completed' || schedule.has_result_data) {
            const confirmed = window.confirm('This schedule is completed or has linked result data. Continue with the status change?');
            if (!confirmed) return;
        }
        updateSchedule.mutate({ id: schedule.id, status: nextStatus });
    };

    const saveSchedule = (event: FormEvent) => {
        event.preventDefault();
        if (!editor || conflict) return;
        if (activeSchedule && (activeSchedule.status === 'completed' || activeSchedule.has_result_data)) {
            const confirmed = window.confirm('You are editing a completed schedule or one with linked result data. Continue and preserve the correction in the updated schedule record?');
            if (!confirmed) return;
        }

        const payload = formToSchedulePayload(editor);
        if (editor.id) {
            updateSchedule.mutate(
                { id: editor.id, ...payload },
                { onSuccess: schedule => { setSelected(schedule); setEditor(null); } },
            );
            return;
        }

        createSchedule.mutate(payload as SchedulePayload, {
            onSuccess: schedule => { setSelected(schedule); setEditor(null); },
        });
    };

    return (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SectionShell title="Schedules" searchValue={query} onSearch={setQuery}>
            <FilterRow>
                <select className="select select-bordered select-sm" value={status} onChange={event => setStatus(event.target.value)}>
                    <option value="all">All statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                    <option value="postponed">Postponed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <button className="btn btn-sm bg-maroon text-white hover:bg-maroon-dark" onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Add Schedule
                </button>
            </FilterRow>
            <TableState isLoading={isLoading} isEmpty={rows.length === 0}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Event</th>
                            <th>Category</th>
                            <th>Phase</th>
                            <th>Start</th>
                            <th>End</th>
                            <th>Venue Area</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(schedule => (
                            <tr key={schedule.id} className="hover">
                                <td className="font-semibold">{schedule.event_name}</td>
                                <td>{schedule.event_category}</td>
                                <td>
                                    <div className="font-semibold">{schedule.phase || 'General'}</div>
                                    {schedule.round_label && <div className="text-xs text-gray-600">{schedule.round_label}</div>}
                                </td>
                                <td>{formatDate(schedule.scheduled_start)}</td>
                                <td>{formatDate(schedule.scheduled_end)}</td>
                                <td>{schedule.venue_name} {schedule.venue_area_name && `- ${schedule.venue_area_name}`}</td>
                                <td><StatusChip status={getScheduleStatus(schedule)} /></td>
                                <td>
                                    <div className="flex flex-wrap gap-2">
                                        <button className="btn btn-xs" onClick={() => setSelected(schedule)}>
                                            <Eye className="h-3.5 w-3.5" />
                                            View
                                        </button>
                                        <button className="btn btn-xs border-maroon text-maroon hover:bg-maroon hover:text-white" onClick={() => openEdit(schedule)}>
                                            Edit
                                        </button>
                                        {getScheduleStatus(schedule) !== 'postponed' && (
                                            <button className="btn btn-xs btn-warning" onClick={() => patchStatus(schedule, 'postponed')}>
                                                Postpone
                                            </button>
                                        )}
                                        {getScheduleStatus(schedule) !== 'cancelled' && (
                                            <button className="btn btn-xs btn-error text-white" onClick={() => patchStatus(schedule, 'cancelled')}>
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </td>
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
                        <h3 className="text-xl font-black text-charcoal">{selected.event_name}</h3>
                        <p className="text-sm text-gray-600">{selected.event_category}</p>
                    </div>
                    {(selected.status === 'completed' || selected.has_result_data) && (
                        <div className="alert alert-warning py-3 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Completed or result-linked schedules should only be changed after confirming the correction.</span>
                        </div>
                    )}
                    <div className="space-y-2 text-sm">
                        <InfoRow label="Phase" value={selected.phase || 'General'} />
                        <InfoRow label="Round" value={selected.round_label || 'Not set'} />
                        <InfoRow label="Start" value={formatDate(selected.scheduled_start)} />
                        <InfoRow label="End" value={formatDate(selected.scheduled_end)} />
                        <InfoRow label="Venue" value={selected.venue_area_name ? `${selected.venue_name || 'Venue TBA'} - ${selected.venue_area_name}` : selected.venue_name || 'Venue TBA'} />
                        <InfoRow label="Status" value={labelize(getScheduleStatus(selected))} />
                        <InfoRow label="Registrations" value={String(selected.participants.length)} />
                    </div>
                    {selected.notes && (
                        <div className="rounded-md bg-base-200 p-3">
                            <div className="text-xs font-bold uppercase text-gray-500">Official notes</div>
                            <p className="mt-1 text-sm text-charcoal">{selected.notes}</p>
                        </div>
                    )}
                    <button className="btn w-full bg-maroon text-white hover:bg-maroon-dark" onClick={() => openEdit(selected)}>
                        Edit Schedule
                    </button>
                </div>
            ) : (
                <EmptyPanel title="No schedule selected" text="View or edit a row to inspect venue, status, and operational notes." />
            )}
        </aside>
        {editor && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
                <form className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-base-100 p-6 shadow-2xl" onSubmit={saveSchedule}>
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-2xl font-black text-charcoal">{editor.id ? 'Edit Schedule' : 'Add Schedule'}</h3>
                            <p className="text-sm text-gray-600">Manage slot timing, phase, venue assignment, and operational status.</p>
                        </div>
                        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditor(null)}>Close</button>
                    </div>
                    {activeSchedule?.status === 'live' && (
                        <div className="alert alert-warning mb-4 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>This schedule is live. Changes to time, venue, venue area, or status should be coordinated with the operations desk.</span>
                        </div>
                    )}
                    {(activeSchedule?.status === 'completed' || activeSchedule?.has_result_data) && (
                        <div className="alert alert-error mb-4 text-sm text-white">
                            <AlertTriangle className="h-4 w-4" />
                            <span>This schedule is completed or has result data. Saving will ask for confirmation.</span>
                        </div>
                    )}
                    {conflict && (
                        <div className="alert alert-error mb-4 text-sm text-white">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Venue conflict: {conflict.event_name} already uses {conflict.venue_area_name} from {formatDate(conflict.scheduled_start)} to {formatDate(conflict.scheduled_end)}.</span>
                        </div>
                    )}
                    {apiError && (
                        <div className="alert alert-warning mb-4 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>{apiError}</span>
                        </div>
                    )}
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="form-control md:col-span-2">
                            <span className="label-text font-semibold">Event</span>
                            <select className="select select-bordered" value={editor.event} onChange={event => setEditor({ ...editor, event: event.target.value })} required>
                                <option value="">Select event</option>
                                {(events || []).map(item => (
                                    <option key={item.id} value={item.id}>{item.name} - {item.category_name}</option>
                                ))}
                            </select>
                        </label>
                        <label className="form-control">
                            <span className="label-text font-semibold">Phase</span>
                            <input className="input input-bordered" value={editor.phase} onChange={event => setEditor({ ...editor, phase: event.target.value })} placeholder="Elimination, semifinal, final" />
                        </label>
                        <label className="form-control">
                            <span className="label-text font-semibold">Round label</span>
                            <input className="input input-bordered" value={editor.round_label} onChange={event => setEditor({ ...editor, round_label: event.target.value })} placeholder="Game 1, Heat 2, Finals" />
                        </label>
                        <label className="form-control">
                            <span className="label-text font-semibold">Start datetime</span>
                            <input type="datetime-local" className="input input-bordered" value={editor.scheduled_start} onChange={event => setEditor({ ...editor, scheduled_start: event.target.value })} />
                        </label>
                        <label className="form-control">
                            <span className="label-text font-semibold">End datetime</span>
                            <input type="datetime-local" className="input input-bordered" value={editor.scheduled_end} onChange={event => setEditor({ ...editor, scheduled_end: event.target.value })} />
                        </label>
                        <label className="form-control">
                            <span className="label-text font-semibold">Venue</span>
                            <select className="select select-bordered" value={editor.venue} onChange={event => setEditor({ ...editor, venue: event.target.value, venue_area: '' })}>
                                <option value="">Venue TBA</option>
                                {(venues || []).map(venue => (
                                    <option key={venue.id} value={venue.id}>{venue.name}</option>
                                ))}
                            </select>
                        </label>
                        <label className="form-control">
                            <span className="label-text font-semibold">Venue area</span>
                            <select className="select select-bordered" value={editor.venue_area} onChange={event => setEditor({ ...editor, venue_area: event.target.value })}>
                                <option value="">Area TBA</option>
                                {filteredVenueAreas.map(area => (
                                    <option key={area.id} value={area.id}>{area.venue_name} - {area.name}</option>
                                ))}
                            </select>
                        </label>
                        <label className="form-control">
                            <span className="label-text font-semibold">Status</span>
                            <select className="select select-bordered" value={editor.status} onChange={event => setEditor({ ...editor, status: event.target.value as ScheduleFormState['status'] })}>
                                <option value="scheduled">Scheduled</option>
                                <option value="live">Live</option>
                                <option value="completed">Completed</option>
                                <option value="postponed">Postponed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </label>
                        <label className="form-control md:col-span-2">
                            <span className="label-text font-semibold">Official notes</span>
                            <textarea className="textarea textarea-bordered min-h-28" value={editor.notes} onChange={event => setEditor({ ...editor, notes: event.target.value })} placeholder="Operational notes, officiating reminders, or venue instructions" />
                        </label>
                    </div>
                    <div className="mt-6 flex flex-wrap justify-end gap-2">
                        <button type="button" className="btn" onClick={() => setEditor(null)}>Cancel</button>
                        <button type="submit" className="btn bg-maroon text-white hover:bg-maroon-dark" disabled={Boolean(conflict) || createSchedule.isPending || updateSchedule.isPending}>
                            {createSchedule.isPending || updateSchedule.isPending ? 'Saving...' : 'Save Schedule'}
                        </button>
                    </div>
                </form>
            </div>
        )}
        </div>
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
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <DepartmentLogo acronym={reg.department_acronym} name={reg.department_name} className="h-8 w-8" />
                                            <span>{reg.department_name}</span>
                                        </div>
                                    </td>
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
        <SectionShell title="Participants">
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
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <DepartmentLogo acronym={dept?.acronym} name={dept?.name || String(athlete.department)} className="h-8 w-8" />
                                            <span>{dept?.name || athlete.department}</span>
                                        </div>
                                    </td>
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
    const matchSchedules = competitiveSchedules.filter(item => item.result_family === 'match_based');
    const rankSchedules = competitiveSchedules.filter(item => item.result_family === 'rank_based');

    return (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <SectionShell title="Results Entry">
                <div className="alert mb-4 border-warning/30 bg-warning/10 text-charcoal">
                    Official result write actions are hidden until the finalization workflow is fully connected. This view shows the schedules that need result processing and the latest recorded results.
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                    <FormCard title="Match-Based Queue" icon={<Swords className="h-5 w-5" />}>
                        <ResultScheduleList schedules={matchSchedules} />
                    </FormCard>
                    <FormCard title="Rank-Based Queue" icon={<Medal className="h-5 w-5" />}>
                        <ResultScheduleList schedules={rankSchedules} />
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
                            <div className="mt-2 flex items-center gap-2">
                                <DepartmentLogo acronym={podium.department_acronym} name={podium.department_name} className="h-7 w-7" />
                                <span>Rank {podium.rank}: {podium.department_name}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>
        </div>
    );
}

function ResultScheduleList({ schedules }: { schedules: EventSchedule[] }) {
    if (!schedules.length) {
        return <p className="rounded-md border border-dashed border-base-300 p-4 text-sm text-gray-600">No schedules in this result mode yet.</p>;
    }

    return (
        <div className="space-y-2">
            {schedules.slice(0, 6).map(schedule => (
                <div key={schedule.id} className="rounded-md bg-base-200 p-3">
                    <div className="font-semibold text-charcoal">{schedule.event_name}</div>
                    <div className="text-xs text-gray-600">
                        {formatDate(schedule.scheduled_start)} {schedule.venue_name ? `at ${schedule.venue_name}` : ''}
                    </div>
                    <StatusChip status={schedule.event_status} />
                </div>
            ))}
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
            <SectionShell title="News Management" searchValue={query} onSearch={setQuery}>
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
                                    <td className="text-sm">
                                        {article.department_name ? (
                                            <div className="flex items-center gap-2">
                                                <DepartmentLogo name={article.department_name} className="h-7 w-7" />
                                                <span>{article.department_name}</span>
                                            </div>
                                        ) : '-'}
                                    </td>
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
            <SectionShell title="AI Recap Review" searchValue={query} onSearch={setQuery}>
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
                                    <td>
                                        {recap.department_name ? (
                                            <div className="flex items-center gap-2">
                                                <DepartmentLogo name={recap.department_name} className="h-7 w-7" />
                                                <span>{recap.event_name || recap.department_name}</span>
                                            </div>
                                        ) : recap.event_name || 'Campus-wide'}
                                    </td>
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
        <SectionShell title={title}>
            <div className="alert mb-4 border-maroon/20 bg-maroon/5 text-charcoal">
                Official rank follows gold medals first, then silver, then bronze. Department name is only a final stable sort.
            </div>
            {showCards && (
                <div className="mb-5 grid gap-4 md:grid-cols-3">
                    {top3.map((row, index) => (
                        <div key={row.id} className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <DepartmentLogo acronym={row.department_acronym} name={row.department_name} className={index === 0 ? 'h-14 w-14' : 'h-12 w-12'} />
                                <div>
                                    <div className="text-sm font-bold text-maroon">Rank {index + 1}</div>
                                    <div className="mt-1 text-lg font-black">{row.department_name}</div>
                                </div>
                            </div>
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
                                <td>
                                    <div className="flex items-center gap-3">
                                        <DepartmentLogo acronym={row.department_acronym} name={row.department_name} className="h-8 w-8" />
                                        <span className="font-semibold">{row.department_name}</span>
                                    </div>
                                </td>
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
    searchValue,
    onSearch,
    children,
}: {
    title: string;
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

function toDateTimeLocal(value?: string | null) {
    if (!value) return '';
    try {
        return format(parseISO(value), "yyyy-MM-dd'T'HH:mm");
    } catch {
        return '';
    }
}

function fromDateTimeLocal(value: string) {
    return value ? new Date(value).toISOString() : null;
}

function getScheduleStatus(schedule: EventSchedule): ScheduleStatus {
    return (schedule.status || schedule.event_status) as ScheduleStatus;
}

function createEmptyEventForm(categoryId?: number): EventFormState {
    return {
        name: '',
        slug: '',
        category: categoryId ? String(categoryId) : '',
        division: 'Open',
        result_family: 'match_based',
        competition_format: '',
        best_of: '',
        team_size_min: '',
        team_size_max: '',
        roster_size_max: '',
        medal_bearing: true,
        ruleset_ref: '',
        status: 'scheduled',
        sort_order: '0',
    };
}

function eventToForm(event: EventItem): EventFormState {
    return {
        id: event.id,
        name: event.name,
        slug: event.slug || '',
        category: String(event.category),
        division: event.division || 'Open',
        result_family: event.result_family,
        competition_format: event.competition_format || '',
        best_of: numberToFormValue(event.best_of),
        team_size_min: numberToFormValue(event.team_size_min),
        team_size_max: numberToFormValue(event.team_size_max),
        roster_size_max: numberToFormValue(event.roster_size_max),
        medal_bearing: event.medal_bearing,
        ruleset_ref: event.ruleset_ref || '',
        status: event.status,
        sort_order: numberToFormValue(event.sort_order),
    };
}

function formToEventPayload(form: EventFormState): EventPayload {
    return {
        name: form.name.trim(),
        slug: form.slug.trim(),
        category: Number(form.category),
        division: form.division.trim() || 'Open',
        result_family: form.result_family,
        competition_format: form.competition_format.trim(),
        best_of: nullableNumber(form.best_of),
        team_size_min: nullableNumber(form.team_size_min),
        team_size_max: nullableNumber(form.team_size_max),
        roster_size_max: nullableNumber(form.roster_size_max),
        medal_bearing: form.medal_bearing,
        is_program_event: !form.medal_bearing,
        ruleset_ref: form.ruleset_ref.trim(),
        status: form.status,
        sort_order: nullableNumber(form.sort_order) || 0,
    };
}

function isSensitiveEventEdit(event: EventItem, form: EventFormState) {
    const hasLinkedData = Boolean(event.linked_schedule_count || event.linked_registration_count || event.linked_result_count);
    if (!hasLinkedData) return false;
    return (
        event.result_family !== form.result_family
        || event.division !== form.division
        || event.medal_bearing !== form.medal_bearing
        || event.status !== form.status
    );
}

function nullableNumber(value: string) {
    if (value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function numberToFormValue(value: number | null | undefined) {
    return value === null || value === undefined ? '' : String(value);
}

function createEmptyScheduleForm(): ScheduleFormState {
    return {
        event: '',
        phase: '',
        round_label: '',
        scheduled_start: '',
        scheduled_end: '',
        venue: '',
        venue_area: '',
        status: 'scheduled',
        notes: '',
    };
}

function scheduleToForm(schedule: EventSchedule): ScheduleFormState {
    return {
        id: schedule.id,
        event: String(schedule.event),
        phase: schedule.phase || '',
        round_label: schedule.round_label || '',
        scheduled_start: toDateTimeLocal(schedule.scheduled_start),
        scheduled_end: toDateTimeLocal(schedule.scheduled_end),
        venue: schedule.venue ? String(schedule.venue) : '',
        venue_area: schedule.venue_area ? String(schedule.venue_area) : '',
        status: getScheduleStatus(schedule),
        notes: schedule.official_notes || schedule.notes || '',
    };
}

function formToSchedulePayload(form: ScheduleFormState): SchedulePayload {
    return {
        event: Number(form.event),
        phase: form.phase.trim(),
        round_label: form.round_label.trim(),
        scheduled_start: fromDateTimeLocal(form.scheduled_start),
        scheduled_end: fromDateTimeLocal(form.scheduled_end),
        venue: form.venue ? Number(form.venue) : null,
        venue_area: form.venue_area ? Number(form.venue_area) : null,
        status: form.status,
        notes: form.notes.trim(),
    };
}

function findScheduleConflict(form: ScheduleFormState, schedules: EventSchedule[]) {
    if (!form.venue_area || !form.scheduled_start || !form.scheduled_end || ['postponed', 'cancelled'].includes(form.status)) {
        return null;
    }

    const start = new Date(form.scheduled_start).getTime();
    const end = new Date(form.scheduled_end).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return null;

    return schedules.find(schedule => {
        if (schedule.id === form.id) return false;
        if (String(schedule.venue_area || '') !== form.venue_area) return false;
        if (['postponed', 'cancelled'].includes(getScheduleStatus(schedule))) return false;
        if (!schedule.scheduled_start || !schedule.scheduled_end) return false;
        const existingStart = new Date(schedule.scheduled_start).getTime();
        const existingEnd = new Date(schedule.scheduled_end).getTime();
        return existingStart < end && existingEnd > start;
    }) || null;
}

function getApiErrorMessage(error: unknown) {
    if (!error || typeof error !== 'object') return '';
    const response = 'response' in error ? (error as { response?: { data?: unknown } }).response : undefined;
    const data = response?.data;
    if (!data) return '';
    if (typeof data === 'string') return data;
    if (typeof data === 'object') {
        if ('detail' in data && typeof (data as { detail?: unknown }).detail === 'string') {
            return (data as { detail: string }).detail;
        }
        return Object.entries(data as Record<string, unknown>)
            .map(([key, value]) => `${labelize(key)}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
            .join(' ');
    }
    return '';
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
