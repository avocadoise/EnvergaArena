import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';

// Layout
import MainLayout from './components/layout/MainLayout';
import OperationsLayout from './components/layout/OperationsLayout';

// Public Pages
import Home from './pages/Public/Home';
import News from './pages/Public/News';
import NewsArticlePage from './pages/Public/NewsArticle';
import Schedules from './pages/Public/Schedules';
import Results from './pages/Public/Results';
import Rooney from './pages/Public/Rooney';
import TryoutApply from './pages/Public/TryoutApply';

// Auth & Admin
import Login from './pages/Auth/Login';
import Dashboard from './pages/Admin/Dashboard';
import Masterlist from './pages/Admin/Masterlist';
import {
    AiRecapsPage,
    CategoriesPage,
    DepartmentsPage,
    EventsPage,
    LeaderboardAdminPage,
    MedalTallyAdminPage,
    NewsPage,
    ParticipantsAdminPage,
    RegistrationsAdminPage,
    ResultsEntryPage,
    RooneyLogsPage,
    SchedulesAdminPage,
    SettingsPage,
    VenuesPage,
} from './pages/Admin/AdminSections';
import {
    AvailableEventsPage,
    DepartmentMedalsPage,
    DepartmentResultsPage,
    DepartmentSchedulePage,
    DepartmentSummaryPage,
    RegistrationStatusPage,
    RepresentativeNewsPage,
    RepresentativeRooneyPage,
    RosterBuilderPage,
    SelectedApplicantsPage,
    TryoutApplicationsPage,
} from './pages/Portal/RepresentativePages';
import { ProtectedRoute } from './components/ProtectedRoute';

const queryClient = new QueryClient();

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        {/* Public Shell */}
                        <Route element={<MainLayout />}>
                            <Route path="/" element={<Home />} />
                            <Route path="/news" element={<News />} />
                            <Route path="/news/:slug" element={<NewsArticlePage />} />
                            <Route path="/schedules" element={<Schedules />} />
                            <Route path="/results" element={<Results />} />
                            <Route path="/rooney" element={<Rooney />} />
                            <Route path="/tryouts" element={<TryoutApply />} />
                            <Route path="/login" element={<Login />} />

                        </Route>

                        {/* Admin Portal */}
                        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                            <Route element={<OperationsLayout mode="admin" />}>
                                <Route path="/admin" element={<Dashboard mode="admin" />} />
                                <Route path="/admin/departments" element={<DepartmentsPage />} />
                                <Route path="/admin/venues" element={<VenuesPage />} />
                                <Route path="/admin/categories" element={<CategoriesPage />} />
                                <Route path="/admin/events" element={<EventsPage />} />
                                <Route path="/admin/schedules" element={<SchedulesAdminPage />} />
                                <Route path="/admin/registrations" element={<RegistrationsAdminPage />} />
                                <Route path="/admin/participants" element={<ParticipantsAdminPage />} />
                                <Route path="/admin/results-entry" element={<ResultsEntryPage />} />
                                <Route path="/admin/medal-tally" element={<MedalTallyAdminPage />} />
                                <Route path="/admin/leaderboard" element={<LeaderboardAdminPage />} />
                                <Route path="/admin/news" element={<NewsPage />} />
                                <Route path="/admin/ai-recaps" element={<AiRecapsPage />} />
                                <Route path="/admin/rooney-logs" element={<RooneyLogsPage />} />
                                <Route path="/admin/settings" element={<SettingsPage />} />
                                <Route path="/admin/masterlist" element={<Navigate to="/admin/participants" replace />} />
                            </Route>
                        </Route>

                        {/* Department Representative Portal */}
                        <Route element={<ProtectedRoute allowedRoles={['department_rep']} />}>
                            <Route element={<OperationsLayout mode="department_rep" />}>
                                <Route path="/portal" element={<Dashboard mode="department_rep" />} />
                                <Route path="/portal/summary" element={<DepartmentSummaryPage />} />
                                <Route path="/portal/tryouts" element={<TryoutApplicationsPage />} />
                                <Route path="/portal/selected-applicants" element={<SelectedApplicantsPage />} />
                                <Route path="/portal/masterlist" element={<Masterlist />} />
                                <Route path="/portal/events" element={<AvailableEventsPage />} />
                                <Route path="/portal/registrations" element={<Dashboard mode="department_rep" />} />
                                <Route path="/portal/rosters" element={<RosterBuilderPage />} />
                                <Route path="/portal/registration-status" element={<RegistrationStatusPage />} />
                                <Route path="/portal/schedules" element={<DepartmentSchedulePage />} />
                                <Route path="/portal/results" element={<DepartmentResultsPage />} />
                                <Route path="/portal/medals" element={<DepartmentMedalsPage />} />
                                <Route path="/portal/news" element={<RepresentativeNewsPage />} />
                                <Route path="/portal/rooney" element={<RepresentativeRooneyPage />} />
                            </Route>
                        </Route>
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </QueryClientProvider>
    );
}
