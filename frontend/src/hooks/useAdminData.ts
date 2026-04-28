import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// Types
export interface Department {
    id: number;
    name: string;
    acronym: string;
    color_code?: string;
    representative_name?: string;
    representative_username?: string;
    operational_status?: 'ready' | 'needs_representative';
}

export interface VenueArea {
    id: number;
    venue: number;
    name: string;
    capacity?: number | null;
}

export interface Venue {
    id: number;
    name: string;
    location: string;
    areas: VenueArea[];
}

export interface EventCategory {
    id: number;
    name: string;
    is_medal_bearing: boolean;
}

export interface EventItem {
    id: number;
    name: string;
    category: number;
    category_name: string;
    result_family: 'match_based' | 'rank_based';
    is_program_event: boolean;
    status: 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled';
}

export interface Athlete {
    id?: number;
    student_number: string;
    full_name: string;
    department: number;
    program_course: string;
    year_level: string;
    is_enrolled: boolean;
    medical_cleared: boolean;
}

export type TryoutApplicationStatus = 'submitted' | 'under_review' | 'selected' | 'not_selected' | 'waitlisted' | 'withdrawn';

export interface TryoutApplication {
    id: number;
    department: number;
    department_name: string;
    department_acronym: string;
    schedule: number;
    schedule_event_name: string;
    schedule_category: string;
    schedule_start: string | null;
    venue_name: string | null;
    student_number: string;
    full_name: string;
    school_email: string;
    contact_number: string;
    program_course: string;
    year_level: string;
    prior_experience: string;
    notes: string;
    email_verified: boolean;
    verified_at: string | null;
    status: TryoutApplicationStatus;
    review_notes: string;
    converted_athlete: number | null;
    converted_athlete_name: string | null;
    created_at: string;
    updated_at: string;
}

export interface RosterEntry {
    id?: number;
    athlete: number;
    athlete_name?: string;
    student_number?: string;
    is_eligible?: boolean;
}

export interface EventRegistration {
    id?: number;
    schedule: number;
    department: number;
    department_name?: string;
    department_acronym?: string;
    schedule_event_name?: string;
    schedule_start?: string | null;
    venue_name?: string | null;
    status: 'submitted' | 'pending' | 'needs_revision' | 'approved' | 'rejected';
    admin_notes?: string;
    roster: RosterEntry[];
    created_at?: string;
    updated_at?: string;
}

export interface RooneyLog {
    id: number;
    question_text: string;
    answer_text: string;
    normalized_intent: string;
    grounded: boolean;
    source_labels: string[];
    refusal_reason: string;
    responded_at: string;
}

export interface NewsArticle {
    id: number;
    title: string;
    slug: string;
    summary: string;
    body_md: string;
    article_type: 'announcement' | 'schedule_update' | 'highlight' | 'result_recap' | 'general_news';
    source_label: string;
    event: number | null;
    event_name?: string | null;
    department: number | null;
    department_name?: string | null;
    status: 'draft' | 'review' | 'published' | 'archived';
    published_at: string | null;
    ai_generated: boolean;
    created_by?: number | null;
    created_by_username?: string | null;
    reviewed_by?: number | null;
    reviewed_by_username?: string | null;
    created_at: string;
    updated_at: string;
}

export interface AIRecap {
    id: number;
    trigger_type: 'event_completion' | 'medal_update' | 'schedule_highlight' | 'rooney_summary' | 'manual';
    scope_type: 'match_result' | 'podium_schedule' | 'event' | 'leaderboard' | 'manual';
    scope_key: string;
    event: number | null;
    event_name?: string | null;
    department: number | null;
    department_name?: string | null;
    input_snapshot_json: Record<string, unknown>;
    generated_title: string;
    generated_summary: string;
    generated_body: string;
    model_name: string;
    prompt_version: string;
    citation_map_json: Record<string, unknown>;
    status: 'generated' | 'under_review' | 'approved' | 'discarded' | 'published';
    generated_at: string;
    reviewed_at: string | null;
    reviewed_by?: number | null;
    reviewed_by_username?: string | null;
    linked_news_article?: number | null;
    linked_news_article_title?: string | null;
    linked_news_article_slug?: string | null;
    created_at: string;
    updated_at: string;
    published_news_slug?: string;
}

export interface CreateRegistrationPayload {
    schedule: number;
    department: number;
    roster_athlete_ids: number[];
}

// Hooks
export const useDepartments = () => {
    return useQuery<Department[]>({
        queryKey: ['departments'],
        queryFn: async () => {
            const { data } = await api.get('/public/departments/');
            return data;
        },
    });
};

export const useVenues = () => {
    return useQuery<Venue[]>({
        queryKey: ['venues'],
        queryFn: async () => {
            const { data } = await api.get('/public/venues/');
            return data;
        },
    });
};

export const useEventCategories = () => {
    return useQuery<EventCategory[]>({
        queryKey: ['event-categories'],
        queryFn: async () => {
            const { data } = await api.get('/public/event-categories/');
            return data;
        },
    });
};

export const useEvents = () => {
    return useQuery<EventItem[]>({
        queryKey: ['events'],
        queryFn: async () => {
            const { data } = await api.get('/public/events/');
            return data;
        },
    });
};

export const useAthletes = () => {
    return useQuery<Athlete[]>({
        queryKey: ['athletes'],
        queryFn: async () => {
            const { data } = await api.get('/public/athletes/');
            return data;
        },
    });
};

export const useCreateAthlete = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (athlete: Athlete) => {
            const { data } = await api.post('/public/athletes/', athlete);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['athletes'] });
        },
    });
};

export const useTryoutApplications = () => {
    return useQuery<TryoutApplication[]>({
        queryKey: ['tryout-applications'],
        queryFn: async () => {
            const { data } = await api.get('/public/tryout-applications/');
            return data;
        },
    });
};

export const useUpdateTryoutApplication = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...payload }: Partial<TryoutApplication> & { id: number }) => {
            const { data } = await api.patch(`/public/tryout-applications/${id}/`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tryout-applications'] });
        },
    });
};

export const useConvertTryoutApplication = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.post(`/public/tryout-applications/${id}/convert/`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tryout-applications'] });
            queryClient.invalidateQueries({ queryKey: ['athletes'] });
        },
    });
};

export const useRegistrations = () => {
    return useQuery<EventRegistration[]>({
        queryKey: ['registrations'],
        queryFn: async () => {
            const { data } = await api.get('/public/registrations/');
            return data;
        },
    });
};

export const useRooneyLogs = () => {
    return useQuery<RooneyLog[]>({
        queryKey: ['rooney-logs'],
        queryFn: async () => {
            const { data } = await api.get('/public/rooney-logs/');
            return data;
        },
    });
};

export const useAdminNews = () => {
    return useQuery<NewsArticle[]>({
        queryKey: ['admin-news'],
        queryFn: async () => {
            const { data } = await api.get('/admin/news/');
            return data;
        },
    });
};

export const useCreateAdminNews = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Partial<NewsArticle>) => {
            const { data } = await api.post('/admin/news/', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-news'] });
            queryClient.invalidateQueries({ queryKey: ['published-news'] });
        },
    });
};

export const useUpdateAdminNews = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...payload }: Partial<NewsArticle> & { id: number }) => {
            const { data } = await api.patch(`/admin/news/${id}/`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-news'] });
            queryClient.invalidateQueries({ queryKey: ['published-news'] });
        },
    });
};

export const useAIRecaps = () => {
    return useQuery<AIRecap[]>({
        queryKey: ['ai-recaps'],
        queryFn: async () => {
            const { data } = await api.get('/admin/ai-recaps/');
            return data;
        },
    });
};

export const useUpdateAIRecap = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...payload }: Partial<AIRecap> & { id: number }) => {
            const { data } = await api.patch(`/admin/ai-recaps/${id}/`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-recaps'] });
            queryClient.invalidateQueries({ queryKey: ['admin-news'] });
            queryClient.invalidateQueries({ queryKey: ['published-news'] });
        },
    });
};

export const useGenerateAIRecap = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { match_result_id?: number; schedule_id?: number }) => {
            const { data } = await api.post('/admin/ai-recaps/generate/', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-recaps'] });
        },
    });
};

export const useApproveAIRecap = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.post(`/admin/ai-recaps/${id}/approve/`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-recaps'] });
        },
    });
};

export const useDiscardAIRecap = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.post(`/admin/ai-recaps/${id}/discard/`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-recaps'] });
        },
    });
};

export const usePublishAIRecap = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.post(`/admin/ai-recaps/${id}/publish/`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-recaps'] });
            queryClient.invalidateQueries({ queryKey: ['admin-news'] });
            queryClient.invalidateQueries({ queryKey: ['published-news'] });
        },
    });
};

export const useCreateRegistration = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (registration: CreateRegistrationPayload) => {
            const { data } = await api.post('/public/registrations/', registration);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['registrations'] });
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
        },
    });
};

export const useUpdateRegistrationStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status, admin_notes }: { id: number, status: string, admin_notes?: string }) => {
            const { data } = await api.patch(`/public/registrations/${id}/`, { status, admin_notes });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['registrations'] });
        },
    });
};

export const useUpdateRegistrationRoster = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, roster_athlete_ids }: { id: number; roster_athlete_ids: number[] }) => {
            const { data } = await api.patch(`/public/registrations/${id}/`, { roster_athlete_ids });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['registrations'] });
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
        },
    });
};
