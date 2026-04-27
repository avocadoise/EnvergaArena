import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import type { AxiosError } from 'axios';
import {
    AlertCircle,
    Calendar,
    CheckCircle,
    ClipboardList,
    Clock,
    MapPin,
    Plus,
    Users,
    XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
    useAthletes,
    useCreateRegistration,
    useRegistrations,
    useUpdateRegistrationStatus,
} from '../../hooks/useAdminData';
import type { EventRegistration } from '../../hooks/useAdminData';
import { useSchedules } from '../../hooks/usePublicData';

interface RegistrationErrorBody {
    schedule?: string[];
    roster_athlete_ids?: string[];
    detail?: string;
}

export default function Dashboard() {
    const { user } = useAuth();

    return (
        <div className="py-8">
            <h1 className="text-3xl font-bold text-charcoal mb-2">
                {user?.role === 'admin' ? 'Central Administration' : 'Department Portal'}
            </h1>
            <p className="text-gray-600 mb-8">
                Welcome, <span className="font-semibold text-maroon">{user?.username}</span>
                {user?.department_name && (
                    <>
                        {' '}from <span className="font-semibold text-charcoal">{user.department_name}</span>
                        {user.department_acronym && ` (${user.department_acronym})`}
                    </>
                )}
            </p>

            {user?.role === 'admin' ? <AdminView /> : <DeptRepView />}
        </div>
    );
}

function AdminView() {
    const { data: registrations, isLoading } = useRegistrations();
    const updateStatus = useUpdateRegistrationStatus();

    if (isLoading) return <div className="loading loading-spinner text-maroon" />;

    const pending = registrations?.filter(r => ['submitted', 'pending'].includes(r.status)) || [];

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-maroon">
                <ClipboardList className="w-5 h-5"/> Registration Approvals ({pending.length})
            </h2>

            {pending.length === 0 ? (
                <p className="text-gray-600 italic">No pending registrations.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pending.map(reg => (
                        <div key={reg.id} className="card bg-base-100 shadow-md border-l-4 border-yellow-400">
                            <div className="card-body p-5">
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between gap-4">
                                        <div>
                                            <div className="badge badge-warning mb-2 capitalize">{reg.status.replace('_', ' ')}</div>
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
                                                <span key={entry.id || entry.athlete} className="badge badge-outline">
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
        </div>
    );
}

function DeptRepView() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { data: registrations, isLoading } = useRegistrations();

    if (isLoading) return <div className="loading loading-spinner text-maroon" />;

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap gap-4">
                <Link to="/admin/masterlist" className="btn bg-maroon hover:bg-maroon-dark text-white border-none">
                    <Users className="w-4 h-4 mr-2"/> Manage Athlete Masterlist
                </Link>
                <button
                    onClick={() => setIsFormOpen(open => !open)}
                    className="btn btn-outline border-maroon text-maroon hover:bg-maroon hover:text-white"
                >
                    <ClipboardList className="w-4 h-4 mr-2"/>
                    {isFormOpen ? 'Close Registration' : 'Submit Registration'}
                </button>
            </div>

            {isFormOpen && (
                <RegistrationForm
                    existingRegistrations={registrations || []}
                    onDone={() => setIsFormOpen(false)}
                />
            )}

            <div>
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
                                            <span className={`badge capitalize ${statusBadgeClass(reg.status)}`}>
                                                {reg.status.replace('_', ' ')}
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

function formatScheduleDate(value?: string | null) {
    if (!value) return 'TBA';

    try {
        return format(parseISO(value), 'MMM d, yyyy h:mm a');
    } catch {
        return 'TBA';
    }
}
