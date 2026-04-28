import api from './api';

export interface TryoutOtpPayload {
    full_name: string;
    student_no: string;
    school_email: string;
    department: number;
    schedule: number;
    turnstile_token: string;
}

export interface TryoutVerifyPayload {
    student_no: string;
    school_email: string;
    department: number;
    schedule: number;
    code: string;
}

export interface TryoutApplicationPayload {
    full_name: string;
    student_no: string;
    school_email: string;
    department: number;
    schedule: number;
    program: string;
    year_level: string;
    contact_no: string;
    prior_experience: string;
    notes: string;
    consent: boolean;
}

export async function sendTryoutOtp(payload: TryoutOtpPayload) {
    const { data } = await api.post('/public/tryouts/send-otp/', payload);
    return data;
}

export async function verifyTryoutOtp(payload: TryoutVerifyPayload) {
    const { data } = await api.post('/public/tryouts/verify-otp/', payload);
    return data;
}

export async function submitTryoutApplication(payload: TryoutApplicationPayload) {
    const { data } = await api.post('/public/tryouts/apply/', payload);
    return data;
}
