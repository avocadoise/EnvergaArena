import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowRight, CalendarDays, Newspaper, Search, Sparkles } from 'lucide-react';
import { usePublishedNews } from '../../hooks/usePublicData';
import type { PublicNewsArticle } from '../../hooks/usePublicData';

type NewsFilter = 'all' | PublicNewsArticle['article_type'];

const FILTER_OPTIONS: Array<{ value: NewsFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'announcement', label: 'Announcements' },
    { value: 'schedule_update', label: 'Schedule Updates' },
    { value: 'highlight', label: 'Highlights' },
    { value: 'result_recap', label: 'Recaps' },
    { value: 'general_news', label: 'General News' },
];

export default function News() {
    const { data: articles, isLoading, isError } = usePublishedNews();
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<NewsFilter>('all');

    const filteredArticles = useMemo(() => {
        return (articles || []).filter(article => {
            const matchesFilter = filter === 'all' || article.article_type === filter;
            const matchesQuery = `${article.title} ${article.summary} ${article.department_name || ''} ${article.event_name || ''}`
                .toLowerCase()
                .includes(query.toLowerCase());
            return matchesFilter && matchesQuery;
        });
    }, [articles, filter, query]);

    const [featured, ...rest] = filteredArticles;

    return (
        <div className="space-y-8 py-8">
            <section className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm lg:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-maroon/10 px-3 py-1 text-sm font-semibold text-maroon">
                            <Newspaper className="h-4 w-4" />
                            Official Intramurals News
                        </div>
                        <h1 className="text-4xl font-black text-maroon">News and Announcements</h1>
                        <p className="mt-3 text-base text-charcoal/75">
                            Published announcements, schedule updates, event highlights, and admin-reviewed recap stories from Enverga Arena.
                        </p>
                    </div>
                    <label className="input input-bordered flex w-full max-w-md items-center gap-2 bg-base-100">
                        <Search className="h-4 w-4 text-gray-500" />
                        <input
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            placeholder="Search official news"
                        />
                    </label>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                    {FILTER_OPTIONS.map(option => (
                        <button
                            key={option.value}
                            className={`btn btn-sm ${filter === option.value ? 'bg-maroon text-white hover:bg-maroon-dark' : 'btn-outline border-base-300 text-charcoal hover:border-maroon hover:text-maroon'}`}
                            onClick={() => setFilter(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </section>

            {isLoading && (
                <div className="grid min-h-64 place-items-center">
                    <span className="loading loading-spinner loading-lg text-maroon"></span>
                </div>
            )}

            {isError && (
                <div className="alert alert-warning">
                    <span>Unable to load published news right now.</span>
                </div>
            )}

            {!isLoading && !isError && featured && (
                <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                    <article className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                            <TypeBadge type={featured.article_type} />
                            {featured.ai_generated && (
                                <span className="badge border-maroon/30 bg-maroon/10 text-maroon">
                                    <Sparkles className="mr-1 h-3 w-3" />
                                    AI-assisted recap
                                </span>
                            )}
                        </div>
                        <h2 className="text-3xl font-black text-charcoal">{featured.title}</h2>
                        <p className="mt-3 text-base leading-7 text-charcoal/75">{featured.summary}</p>
                        <MetaLine article={featured} className="mt-5" />
                        <div className="mt-6">
                            <Link to={`/news/${featured.slug}`} className="btn bg-maroon text-white hover:bg-maroon-dark">
                                Read full article
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </article>

                    <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
                        <h3 className="text-lg font-black text-charcoal">Latest Publishing Queue</h3>
                        <div className="mt-4 space-y-3">
                            {rest.slice(0, 4).map(article => (
                                <Link
                                    key={article.id}
                                    to={`/news/${article.slug}`}
                                    className="block rounded-xl border border-base-300 bg-base-100 p-4 transition hover:border-maroon/30 hover:bg-maroon/5"
                                >
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <TypeBadge type={article.article_type} compact />
                                        <span className="text-xs text-gray-500">{formatDate(article.published_at)}</span>
                                    </div>
                                    <div className="font-bold text-charcoal">{article.title}</div>
                                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{article.summary}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {!isLoading && !isError && filteredArticles.length === 0 && (
                <section className="rounded-2xl border border-dashed border-base-300 bg-base-100 p-10 text-center shadow-sm">
                    <h2 className="text-xl font-bold text-charcoal">No published articles match this filter yet.</h2>
                    <p className="mt-2 text-sm text-gray-600">Try another category or search term.</p>
                </section>
            )}

            {!isLoading && !isError && rest.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-charcoal">More Official Updates</h2>
                        <div className="text-sm text-gray-600">{filteredArticles.length} published articles</div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {rest.map(article => (
                            <Link
                                key={article.id}
                                to={`/news/${article.slug}`}
                                className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-maroon/30"
                            >
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <TypeBadge type={article.article_type} compact />
                                    {article.ai_generated && (
                                        <span className="badge border-maroon/30 bg-maroon/10 text-maroon">AI-assisted</span>
                                    )}
                                </div>
                                <h3 className="text-lg font-black text-charcoal">{article.title}</h3>
                                <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">{article.summary}</p>
                                <MetaLine article={article} className="mt-4" compact />
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function TypeBadge({ type, compact = false }: { type: PublicNewsArticle['article_type']; compact?: boolean }) {
    return (
        <span className={`badge ${compact ? 'badge-sm' : ''} border-maroon/30 bg-maroon/10 capitalize text-maroon`}>
            {labelize(type)}
        </span>
    );
}

function MetaLine({
    article,
    className,
    compact = false,
}: {
    article: PublicNewsArticle;
    className?: string;
    compact?: boolean;
}) {
    return (
        <div className={`${className || ''} flex flex-wrap items-center gap-3 text-sm text-gray-600`}>
            <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {formatDate(article.published_at)}
            </span>
            {article.event_name && <span>{article.event_name}</span>}
            {article.department_name && <span>{compact ? article.department_name : `Department: ${article.department_name}`}</span>}
        </div>
    );
}

function formatDate(value?: string | null) {
    if (!value) return 'Unscheduled';
    try {
        return format(parseISO(value), 'MMM d, yyyy');
    } catch {
        return 'Unscheduled';
    }
}

function labelize(value: string) {
    return value.replace(/_/g, ' ');
}
