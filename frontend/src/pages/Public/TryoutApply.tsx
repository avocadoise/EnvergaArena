import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { AxiosError } from 'axios';
import { format, parseISO } from 'date-fns';
import { CheckCircle, FileText, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useDepartments } from '../../hooks/useAdminData';
import { useSchedules } from '../../hooks/usePublicData';
import { sendTryoutOtp, submitTryoutApplication, verifyTryoutOtp } from '../../services/tryouts';

declare global {
    interface Window {
        turnstile?: {
            render: (
                element: HTMLElement,
                options: {
                    sitekey: string;
                    callback: (token: string) => void;
                    'expired-callback': () => void;
                    'error-callback': () => void;
                }
            ) => string;
            reset: (widgetId?: string) => void;
        };
    }
}

const EMAIL_DOMAIN = '@student.mseuf.edu.ph';
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

export default function TryoutApply() {
    const { data: departments, isLoading: departmentsLoading } = useDepartments();
    const { data: schedules, isLoading: schedulesLoading } = useSchedules();
    const turnstileRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [turnstileToken, setTurnstileToken] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [form, setForm] = useState({
        full_name: '',
        student_no: '',
        school_email: '',
        department: '',
        schedule: '',
        program: '',
        year_level: '',
        contact_no: '',
        prior_experience: '',
        notes: '',
        consent: false,
    });

    const availableSchedules = useMemo(() => {
        return (schedules || []).filter(schedule =>
            !schedule.is_program_event
            && schedule.event_status !== 'cancelled'
            && schedule.event_status !== 'postponed'
        );
    }, [schedules]);

    useEffect(() => {
        if (!TURNSTILE_SITE_KEY || widgetIdRef.current || !turnstileRef.current) return;

        const renderWidget = () => {
            if (!window.turnstile || !turnstileRef.current || widgetIdRef.current) return;
            widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
                sitekey: TURNSTILE_SITE_KEY,
                callback: token => setTurnstileToken(token),
                'expired-callback': () => {
                    setTurnstileToken('');
                    setMessage({ type: 'info', text: 'Turnstile expired. Please complete the challenge again.' });
                },
                'error-callback': () => {
                    setTurnstileToken('');
                    setMessage({ type: 'error', text: 'Turnstile could not verify. Please refresh the challenge.' });
                },
            });
        };

        if (window.turnstile) {
            renderWidget();
            return;
        }

        const existingScript = document.querySelector<HTMLScriptElement>('script[data-turnstile-script="true"]');
        if (existingScript) {
            existingScript.addEventListener('load', renderWidget, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset.turnstileScript = 'true';
        script.addEventListener('load', renderWidget, { once: true });
        document.body.appendChild(script);
    }, []);

    const updateField = (field: keyof typeof form, value: string | boolean) => {
        setForm(current => ({ ...current, [field]: value }));
        if (['student_no', 'school_email', 'department', 'schedule'].includes(field)) {
            setOtpSent(false);
            setEmailVerified(false);
            setOtpCode('');
        }
    };

    const resetTurnstile = () => {
        setTurnstileToken('');
        if (window.turnstile && widgetIdRef.current) {
            window.turnstile.reset(widgetIdRef.current);
        }
    };

    const canRequestOtp =
        form.full_name
        && form.student_no
        && form.school_email.endsWith(EMAIL_DOMAIN)
        && form.department
        && form.schedule
        && form.consent
        && turnstileToken;

    const canSubmit = emailVerified && form.program && form.year_level && form.contact_no && form.consent;

    const handleSendOtp = async () => {
        if (!canRequestOtp) {
            setMessage({ type: 'error', text: `Complete the form, consent, Turnstile, and use an email ending in ${EMAIL_DOMAIN}.` });
            return;
        }

        setIsSendingOtp(true);
        setMessage(null);
        try {
            const response = await sendTryoutOtp({
                full_name: form.full_name,
                student_no: form.student_no,
                school_email: form.school_email,
                department: Number(form.department),
                schedule: Number(form.schedule),
                turnstile_token: turnstileToken,
            });
            setOtpSent(true);
            setMessage({ type: 'success', text: response.detail || 'OTP sent. Check your student email.' });
            resetTurnstile();
        } catch (error) {
            setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to send OTP.') });
            resetTurnstile();
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpCode || otpCode.length !== 6) {
            setMessage({ type: 'error', text: 'Enter the 6-digit OTP code.' });
            return;
        }

        setIsVerifyingOtp(true);
        setMessage(null);
        try {
            const response = await verifyTryoutOtp({
                student_no: form.student_no,
                school_email: form.school_email,
                department: Number(form.department),
                schedule: Number(form.schedule),
                code: otpCode,
            });
            setEmailVerified(true);
            setMessage({ type: 'success', text: response.detail || 'Email verified.' });
        } catch (error) {
            setEmailVerified(false);
            setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to verify OTP.') });
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!canSubmit) {
            setMessage({ type: 'error', text: 'Verify your email and complete the required fields before submitting.' });
            return;
        }

        setIsSubmitting(true);
        setMessage(null);
        try {
            await submitTryoutApplication({
                full_name: form.full_name,
                student_no: form.student_no,
                school_email: form.school_email,
                department: Number(form.department),
                schedule: Number(form.schedule),
                program: form.program,
                year_level: form.year_level,
                contact_no: form.contact_no,
                prior_experience: form.prior_experience,
                notes: form.notes,
                consent: form.consent,
            });
            setMessage({ type: 'success', text: 'Your verified tryout application was submitted. Your department representative can now review it.' });
            setForm({
                full_name: '',
                student_no: '',
                school_email: '',
                department: '',
                schedule: '',
                program: '',
                year_level: '',
                contact_no: '',
                prior_experience: '',
                notes: '',
                consent: false,
            });
            setOtpCode('');
            setOtpSent(false);
            setEmailVerified(false);
            resetTurnstile();
        } catch (error) {
            setMessage({ type: 'error', text: getErrorMessage(error, 'Unable to submit tryout application.') });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-5xl py-8">
            <div className="mb-6">
                <p className="text-xs font-bold uppercase text-maroon">Public Verified Tryout Form</p>
                <h1 className="text-3xl font-black text-charcoal">Apply for Department Tryouts</h1>
                <p className="mt-2 max-w-3xl text-sm text-gray-600">
                    Students do not need accounts. Use your official MSEUF student email, verify by OTP, then submit your tryout application to your department representative.
                </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                    {message && (
                        <div className={`alert ${message.type === 'success' ? 'alert-success' : message.type === 'error' ? 'alert-error' : 'alert-info'} text-sm`}>
                            <span>{message.text}</span>
                        </div>
                    )}

                    <FormSection title="Student Details" icon={<FileText className="h-5 w-5" />}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <TextInput label="Full name" value={form.full_name} onChange={value => updateField('full_name', value)} required />
                            <TextInput label="Student number" value={form.student_no} onChange={value => updateField('student_no', value)} required />
                            <TextInput label="School email" value={form.school_email} onChange={value => updateField('school_email', value.trim())} type="email" placeholder={`name${EMAIL_DOMAIN}`} required />
                            <TextInput label="Contact number" value={form.contact_no} onChange={value => updateField('contact_no', value)} required />
                            <TextInput label="Program / Course" value={form.program} onChange={value => updateField('program', value)} required />
                            <label className="form-control">
                                <span className="label-text mb-1 font-semibold">Year level</span>
                                <select className="select select-bordered" value={form.year_level} onChange={event => updateField('year_level', event.target.value)} required>
                                    <option value="">Select year level</option>
                                    <option>1st Year</option>
                                    <option>2nd Year</option>
                                    <option>3rd Year</option>
                                    <option>4th Year</option>
                                    <option>5th Year</option>
                                </select>
                            </label>
                        </div>
                    </FormSection>

                    <FormSection title="Tryout Selection" icon={<Sparkles className="h-5 w-5" />}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="form-control">
                                <span className="label-text mb-1 font-semibold">Department</span>
                                <select className="select select-bordered" value={form.department} onChange={event => updateField('department', event.target.value)} disabled={departmentsLoading} required>
                                    <option value="">Select department</option>
                                    {departments?.map(department => (
                                        <option key={department.id} value={department.id}>
                                            {department.name} ({department.acronym})
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="form-control">
                                <span className="label-text mb-1 font-semibold">Event</span>
                                <select className="select select-bordered" value={form.schedule} onChange={event => updateField('schedule', event.target.value)} disabled={schedulesLoading} required>
                                    <option value="">Select event</option>
                                    {availableSchedules.map(schedule => (
                                        <option key={schedule.id} value={schedule.id}>
                                            {schedule.event_name} - {formatSchedule(schedule.scheduled_start)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </FormSection>

                    <FormSection title="Experience and Notes" icon={<Mail className="h-5 w-5" />}>
                        <div className="grid gap-4">
                            <label className="form-control">
                                <span className="label-text mb-1 font-semibold">Prior experience</span>
                                <textarea className="textarea textarea-bordered min-h-24" value={form.prior_experience} onChange={event => updateField('prior_experience', event.target.value)} />
                            </label>
                            <label className="form-control">
                                <span className="label-text mb-1 font-semibold">Additional notes</span>
                                <textarea className="textarea textarea-bordered min-h-24" value={form.notes} onChange={event => updateField('notes', event.target.value)} />
                            </label>
                        </div>
                    </FormSection>

                    <FormSection title="Verification" icon={<ShieldCheck className="h-5 w-5" />}>
                        <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-md border border-base-300 p-3">
                            <input type="checkbox" className="checkbox checkbox-primary mt-1" checked={form.consent} onChange={event => updateField('consent', event.target.checked)} />
                            <span className="text-sm text-gray-700">
                                I confirm that the information is accurate and consent to my department representative reviewing this tryout application.
                            </span>
                        </label>

                        <div className="rounded-md bg-base-200 p-4">
                            {TURNSTILE_SITE_KEY ? (
                                <div ref={turnstileRef} />
                            ) : (
                                <div className="text-sm text-error">
                                    Turnstile site key is not configured. Add VITE_TURNSTILE_SITE_KEY in the frontend environment.
                                </div>
                            )}
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                            <input
                                className="input input-bordered"
                                value={otpCode}
                                onChange={event => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter 6-digit OTP"
                                disabled={!otpSent}
                            />
                            <div className="flex flex-wrap gap-2">
                                <button type="button" className="btn btn-outline border-maroon text-maroon hover:bg-maroon hover:text-white" onClick={handleSendOtp} disabled={!canRequestOtp || isSendingOtp}>
                                    {isSendingOtp ? 'Sending...' : 'Send OTP'}
                                </button>
                                <button type="button" className="btn bg-maroon text-white hover:bg-maroon-dark" onClick={handleVerifyOtp} disabled={!otpSent || isVerifyingOtp || otpCode.length !== 6}>
                                    {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
                                </button>
                            </div>
                        </div>

                        {emailVerified && (
                            <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-success">
                                <CheckCircle className="h-4 w-4" />
                                School email verified
                            </div>
                        )}
                    </FormSection>

                    <div className="flex justify-end">
                        <button type="submit" className="btn bg-maroon text-white hover:bg-maroon-dark" disabled={!canSubmit || isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit Tryout Application'}
                        </button>
                    </div>
                </form>

                <aside className="space-y-4">
                    <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
                        <h2 className="font-black text-charcoal">How it works</h2>
                        <div className="mt-4 space-y-3 text-sm text-gray-700">
                            <Step number="1" text="Fill out your student details and choose your department and event." />
                            <Step number="2" text="Complete Turnstile and request an OTP." />
                            <Step number="3" text="Verify the code sent to your MSEUF student email." />
                            <Step number="4" text="Submit the verified application for department review." />
                        </div>
                    </section>
                    <section className="rounded-lg border border-maroon/20 bg-maroon/5 p-5 text-sm text-gray-700">
                        <h2 className="font-black text-charcoal">Email rule</h2>
                        <p className="mt-2">
                            Only emails ending in <span className="font-bold text-maroon">{EMAIL_DOMAIN}</span> are accepted. This is enforced by the backend.
                        </p>
                    </section>
                </aside>
            </div>
        </div>
    );
}

function FormSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
    return (
        <section>
            <div className="mb-3 flex items-center gap-2 text-maroon">
                {icon}
                <h2 className="text-lg font-black text-charcoal">{title}</h2>
            </div>
            {children}
        </section>
    );
}

function TextInput({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    required,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
}) {
    return (
        <label className="form-control">
            <span className="label-text mb-1 font-semibold">{label}</span>
            <input
                className="input input-bordered"
                type={type}
                value={value}
                placeholder={placeholder}
                required={required}
                onChange={event => onChange(event.target.value)}
            />
        </label>
    );
}

function Step({ number, text }: { number: string; text: string }) {
    return (
        <div className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-maroon text-xs font-black text-white">{number}</span>
            <span>{text}</span>
        </div>
    );
}

function formatSchedule(value?: string | null) {
    if (!value) return 'TBA';

    try {
        return format(parseISO(value), 'MMM d, yyyy h:mm a');
    } catch {
        return 'TBA';
    }
}

function getErrorMessage(error: unknown, fallback: string) {
    const axiosError = error as AxiosError<Record<string, unknown>>;
    const data = axiosError.response?.data;
    if (!data) return fallback;
    if (typeof data.detail === 'string') return data.detail;
    const messages = Object.entries(data)
        .flatMap(([field, value]) => {
            const label = field === 'non_field_errors' ? 'Error' : field.replace('_', ' ');
            if (Array.isArray(value)) return value.map(item => `${label}: ${String(item)}`);
            if (typeof value === 'string') return [`${label}: ${value}`];
            if (value && typeof value === 'object') return [`${label}: ${JSON.stringify(value)}`];
            return [];
        });
    if (messages.length) return messages.join(' ');
    return fallback;
}
