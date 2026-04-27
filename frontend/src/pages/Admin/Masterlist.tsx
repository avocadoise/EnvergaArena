import { useState } from 'react';
import { useAthletes, useCreateAthlete } from '../../hooks/useAdminData';
import { useAuth } from '../../context/AuthContext';
import { Users, Plus, CheckCircle, XCircle } from 'lucide-react';

export default function Masterlist() {
    const { user } = useAuth();
    const { data: athletes, isLoading } = useAthletes();
    const createAthlete = useCreateAthlete();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState({
        student_number: '',
        full_name: '',
        program_course: '',
        year_level: '1st Year',
        is_enrolled: true,
        medical_cleared: false,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.department_id) return;

        createAthlete.mutate(
            { ...formData, department: user.department_id },
            {
                onSuccess: () => {
                    setIsFormOpen(false);
                    setFormData({ ...formData, student_number: '', full_name: '' }); // reset some fields
                }
            }
        );
    };

    return (
        <div className="py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-charcoal flex items-center gap-2">
                        <Users className="w-8 h-8 text-maroon" /> Athlete Masterlist
                    </h1>
                    <p className="text-gray-600">
                        Manage {user?.department_name || 'department'} student athletes
                        {user?.department_acronym && ` (${user.department_acronym})`}
                    </p>
                </div>
                <button 
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className="btn bg-maroon hover:bg-maroon-dark text-white border-none"
                >
                    <Plus className="w-4 h-4 mr-1"/> Add Athlete
                </button>
            </div>

            {/* Form */}
            {isFormOpen && (
                <div className="card bg-base-100 shadow-md border border-base-300 mb-8">
                    <div className="card-body">
                        <h2 className="card-title text-maroon mb-4">New Athlete</h2>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control">
                                <label className="label"><span className="label-text">Student Number</span></label>
                                <input required type="text" className="input input-bordered" 
                                    value={formData.student_number} 
                                    onChange={e => setFormData({...formData, student_number: e.target.value})} 
                                />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">Full Name</span></label>
                                <input required type="text" className="input input-bordered" 
                                    value={formData.full_name} 
                                    onChange={e => setFormData({...formData, full_name: e.target.value})} 
                                />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">Program / Course</span></label>
                                <input required type="text" className="input input-bordered" 
                                    value={formData.program_course} 
                                    onChange={e => setFormData({...formData, program_course: e.target.value})} 
                                />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">Year Level</span></label>
                                <select className="select select-bordered" value={formData.year_level} onChange={e => setFormData({...formData, year_level: e.target.value})}>
                                    <option>1st Year</option>
                                    <option>2nd Year</option>
                                    <option>3rd Year</option>
                                    <option>4th Year</option>
                                    <option>5th Year</option>
                                </select>
                            </div>
                            <div className="form-control flex-row gap-4 mt-4 col-span-1 md:col-span-2">
                                <label className="cursor-pointer flex items-center gap-2">
                                    <input type="checkbox" className="checkbox checkbox-primary" 
                                        checked={formData.is_enrolled} 
                                        onChange={e => setFormData({...formData, is_enrolled: e.target.checked})} 
                                    />
                                    <span className="label-text">Currently Enrolled</span>
                                </label>
                                <label className="cursor-pointer flex items-center gap-2">
                                    <input type="checkbox" className="checkbox checkbox-primary" 
                                        checked={formData.medical_cleared} 
                                        onChange={e => setFormData({...formData, medical_cleared: e.target.checked})} 
                                    />
                                    <span className="label-text">Medical Cleared</span>
                                </label>
                            </div>
                            <div className="col-span-1 md:col-span-2 mt-4 flex gap-2">
                                <button type="submit" className="btn btn-primary" disabled={createAthlete.isPending}>
                                    {createAthlete.isPending ? 'Saving...' : 'Save Athlete'}
                                </button>
                                <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-ghost">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* List */}
            {isLoading ? (
                <div className="text-center py-10"><span className="loading loading-spinner text-maroon"></span></div>
            ) : (
                <div className="overflow-x-auto bg-base-100 rounded-xl border border-base-200">
                    <table className="table table-zebra w-full">
                        <thead className="bg-base-200 text-charcoal">
                            <tr>
                                <th>Student ID</th>
                                <th>Name</th>
                                <th>Course/Year</th>
                                <th>Enrolled</th>
                                <th>Med Cleared</th>
                            </tr>
                        </thead>
                        <tbody>
                            {athletes?.map(a => (
                                <tr key={a.id}>
                                    <td className="font-mono text-xs">{a.student_number}</td>
                                    <td className="font-bold">{a.full_name}</td>
                                    <td>{a.program_course} - {a.year_level}</td>
                                    <td>{a.is_enrolled ? <CheckCircle className="text-success w-5 h-5"/> : <XCircle className="text-error w-5 h-5"/>}</td>
                                    <td>{a.medical_cleared ? <CheckCircle className="text-success w-5 h-5"/> : <XCircle className="text-error w-5 h-5"/>}</td>
                                </tr>
                            ))}
                            {athletes?.length === 0 && (
                                <tr><td colSpan={5} className="text-center py-8 text-gray-600">No athletes recorded yet. Add one above.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
