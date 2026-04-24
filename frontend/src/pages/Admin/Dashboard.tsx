import { useAuth } from '../../context/AuthContext';
import { useRegistrations, useUpdateRegistrationStatus } from '../../hooks/useAdminData';
import { Link } from 'react-router-dom';
import { Users, ClipboardList, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function Dashboard() {
    const { user } = useAuth();

    return (
        <div className="py-8">
            <h1 className="text-3xl font-bold text-charcoal mb-2">
                {user?.role === 'admin' ? 'Central Administration' : 'Department Portal'}
            </h1>
            <p className="text-gray-500 mb-8">
                Welcome, <span className="font-semibold text-maroon">{user?.username}</span>
                {user?.department_acronym && ` (${user.department_acronym})`}
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
                <p className="text-gray-500 italic">No pending registrations.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pending.map(reg => (
                        <div key={reg.id} className="card bg-base-100 shadow-md border-l-4 border-yellow-400">
                            <div className="card-body p-5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="badge badge-warning mb-2">{reg.status}</div>
                                        <h3 className="font-bold text-lg">{reg.department_acronym}</h3>
                                        <p className="text-sm text-gray-500">Event Schedule ID: {reg.schedule}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => updateStatus.mutate({ id: reg.id!, status: 'approved' })}
                                            className="btn btn-sm btn-success text-white"
                                            disabled={updateStatus.isPending}
                                        >
                                            <CheckCircle className="w-4 h-4"/> Approve
                                        </button>
                                        <button 
                                            onClick={() => updateStatus.mutate({ id: reg.id!, status: 'needs_revision', admin_notes: 'Please update medical clearances.' })}
                                            className="btn btn-sm btn-error text-white"
                                            disabled={updateStatus.isPending}
                                        >
                                            <XCircle className="w-4 h-4"/> Revise
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4 bg-gray-50 p-2 text-xs rounded border text-gray-600">
                                    Athletes registered: {reg.roster?.length || 0}
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
    const { data: registrations, isLoading } = useRegistrations();

    if (isLoading) return <div className="loading loading-spinner text-maroon" />;

    return (
        <div className="space-y-8">
            <div className="flex gap-4">
                <Link to="/admin/masterlist" className="btn bg-maroon hover:bg-maroon-dark text-white border-none">
                    <Users className="w-4 h-4 mr-2"/> Manage Athlete Masterlist
                </Link>
                {/* Submit new registration would go here */}
                <button className="btn btn-outline border-maroon text-maroon hover:bg-maroon hover:text-white">
                    <ClipboardList className="w-4 h-4 mr-2"/> Submit Registration
                </button>
            </div>

            <div>
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-charcoal">
                    <Clock className="w-5 h-5"/> My Submissions
                </h2>
                
                {registrations?.length === 0 ? (
                    <p className="text-gray-500 italic">You haven't submitted any event registrations yet.</p>
                ) : (
                    <div className="overflow-x-auto bg-base-100 rounded-xl shadow-sm border border-base-200">
                        <table className="table table-zebra w-full">
                            <thead>
                                <tr>
                                    <th>Event Schedule</th>
                                    <th>Status</th>
                                    <th>Athletes</th>
                                    <th>Admin Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registrations?.map(reg => (
                                    <tr key={reg.id}>
                                        <td className="font-bold">Schedule ID: {reg.schedule}</td>
                                        <td>
                                            <span className={`badge ${
                                                reg.status === 'approved' ? 'badge-success text-white' : 
                                                reg.status === 'rejected' ? 'badge-error text-white' : 
                                                'badge-warning'
                                            }`}>
                                                {reg.status}
                                            </span>
                                        </td>
                                        <td>{reg.roster?.length || 0} enrolled</td>
                                        <td className="text-xs text-red-500 max-w-xs">{reg.admin_notes || '-'}</td>
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
