import { Link, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, CalendarDays, Link2, Sparkles } from 'lucide-react';
import { usePublishedNews, usePublishedNewsArticle } from '../../hooks/usePublicData';

export default function NewsArticlePage() {
    const { slug } = useParams();
    const { data: article, isLoading, isError } = usePublishedNewsArticle(slug);
    const { data: articles } = usePublishedNews();

    const relatedArticles = (articles || [])
        .filter(item => item.slug !== slug)
        .filter(item =>
            item.article_type === article?.article_type ||
            (article?.department && item.department === article.department) ||
            (article?.event && item.event === article.event)
        )
        .slice(0, 3);

    if (isLoading) {
        return (
            <div className="grid min-h-[50vh] place-items-center py-10">
                <span className="loading loading-spinner loading-lg text-maroon"></span>
            </div>
        );
    }

    if (isError || !article) {
        return (
            <div className="space-y-4 py-10">
                <Link to="/news" className="btn btn-outline border-maroon text-maroon hover:bg-maroon hover:text-white">
                    <ArrowLeft className="h-4 w-4" />
                    Back to news
                </Link>
                <div className="alert alert-warning">
                    <span>That published article could not be loaded.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 py-8">
            <Link to="/news" className="btn btn-outline border-maroon text-maroon hover:bg-maroon hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back to news
            </Link>

            <article className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm lg:p-8">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="badge border-maroon/30 bg-maroon/10 capitalize text-maroon">
                        {labelize(article.article_type)}
                    </span>
                    {article.ai_generated && (
                        <span className="badge border-maroon/30 bg-maroon/10 text-maroon">
                            <Sparkles className="mr-1 h-3 w-3" />
                            AI-assisted recap
                        </span>
                    )}
                </div>

                <h1 className="mt-4 text-4xl font-black text-charcoal">{article.title}</h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-charcoal/75">{article.summary}</p>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {formatDate(article.published_at)}
                    </span>
                    {article.event_name && (
                        <span className="inline-flex items-center gap-1">
                            <Link2 className="h-4 w-4" />
                            {article.event_name}
                        </span>
                    )}
                    {article.department_name && <span>{article.department_name}</span>}
                    <span>{article.source_label || 'Enverga Arena Editorial Desk'}</span>
                </div>

                <div className="mt-8 space-y-5 text-base leading-8 text-charcoal">
                    {renderBody(article.body_md)}
                </div>
            </article>

            {relatedArticles.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-charcoal">Related Official News</h2>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {relatedArticles.map(item => (
                            <Link
                                key={item.id}
                                to={`/news/${item.slug}`}
                                className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-maroon/30"
                            >
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="badge badge-sm border-maroon/30 bg-maroon/10 capitalize text-maroon">
                                        {labelize(item.article_type)}
                                    </span>
                                    <span className="text-xs text-gray-500">{formatDate(item.published_at)}</span>
                                </div>
                                <h3 className="text-lg font-black text-charcoal">{item.title}</h3>
                                <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">{item.summary}</p>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function renderBody(body: string) {
    return body
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((block, index) => {
            const trimmed = block.trim();
            if (!trimmed) return null;

            if (trimmed.startsWith('## ')) {
                return <h2 key={index} className="text-2xl font-black text-charcoal">{trimmed.replace(/^##\s*/, '')}</h2>;
            }

            if (trimmed.startsWith('# ')) {
                return <h2 key={index} className="text-2xl font-black text-charcoal">{trimmed.replace(/^#\s*/, '')}</h2>;
            }

            const lines = trimmed.split('\n');
            const isList = lines.every(line => /^[-*]\s+/.test(line.trim()));
            if (isList) {
                return (
                    <ul key={index} className="list-disc space-y-2 pl-6">
                        {lines.map((line, lineIndex) => <li key={lineIndex}>{line.replace(/^[-*]\s+/, '')}</li>)}
                    </ul>
                );
            }

            return (
                <p key={index} className="whitespace-pre-line">
                    {trimmed}
                </p>
            );
        });
}

function formatDate(value?: string | null) {
    if (!value) return 'Date unavailable';
    try {
        return format(parseISO(value), 'MMMM d, yyyy');
    } catch {
        return 'Date unavailable';
    }
}

function labelize(value: string) {
    return value.replace(/_/g, ' ');
}
