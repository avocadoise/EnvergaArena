import { Link } from 'react-router-dom';
import { useMedalTally, usePublishedNews } from '../../hooks/usePublicData';
import { Trophy, ArrowRight, Activity, Newspaper, Sparkles } from 'lucide-react';

export default function Home() {
    return (
        <div className="space-y-16 py-8">
            {/* Hero Section */}
            <section className="flex flex-col items-center justify-center py-12 lg:py-24 text-center px-4 bg-base-100 rounded-lg border border-base-300 shadow-sm">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-maroon/10 text-maroon text-sm font-semibold mb-6">
                    <Activity className="w-4 h-4"/> Live Intramurals 2026
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-maroon tracking-tight mb-6 drop-shadow-sm">
                    Enverga Arena
                </h1>
                <p className="text-xl md:text-2xl max-w-3xl text-charcoal/80 mb-10 leading-relaxed">
                    The official tournament portal for the Manuel S. Enverga University Foundation intramurals.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Link to="/schedules" className="btn btn-lg bg-maroon hover:bg-maroon-dark text-white border-none shadow-lg">
                        View Schedules
                    </Link>
                    <Link to="/results" className="btn btn-lg btn-outline border-maroon text-maroon hover:bg-maroon hover:text-white bg-white">
                        Live Results & Tally
                    </Link>
                </div>
            </section>

            {/* Top 3 Leaderboard Widget */}
            <section className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8 px-2">
                    <h2 className="text-3xl font-bold text-charcoal flex items-center gap-2">
                        <Trophy className="w-8 h-8 text-gold"/> Current Leaders
                    </h2>
                    <Link to="/results" className="text-maroon font-semibold hover:underline flex items-center gap-1">
                        Full Tally <ArrowRight className="w-4 h-4"/>
                    </Link>
                </div>
                
                <Top3Widget />
            </section>

            <LatestNewsSection />
        </div>
    );
}

function Top3Widget() {
    const { data: tally, isLoading } = useMedalTally();

    if (isLoading) {
        return <div className="text-center py-10"><span className="loading loading-spinner text-maroon"></span></div>;
    }

    if (!tally || tally.length === 0) {
        return (
            <div className="bg-base-200 rounded-2xl p-8 text-center text-gray-500">
                Waiting for the first results to be recorded.
            </div>
        );
    }

    const top3 = tally.slice(0, 3).map((dept, index) => ({
        ...dept,
        rank: index + 1,
    }));

    const podium = [
        top3[0] && {
            ...top3[0],
            orderClass: 'md:order-2',
            cardClass: 'border-yellow-500 bg-yellow-50 shadow-2xl md:-mt-8 md:scale-110 z-10',
            rankClass: 'bg-yellow-500 text-white',
            medalLabel: 'Gold',
            medalClass: 'text-yellow-700',
        },
        top3[1] && {
            ...top3[1],
            orderClass: 'md:order-1',
            cardClass: 'border-slate-400 bg-slate-50',
            rankClass: 'bg-slate-500 text-white',
            medalLabel: 'Silver',
            medalClass: 'text-slate-600',
        },
        top3[2] && {
            ...top3[2],
            orderClass: 'md:order-3',
            cardClass: 'border-amber-700 bg-amber-50',
            rankClass: 'bg-amber-700 text-white',
            medalLabel: 'Bronze',
            medalClass: 'text-amber-700',
        },
    ].filter(Boolean);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {podium.map((dept) => (
                <div
                    key={dept.id}
                    className={`card shadow-xl border-t-4 transition-transform ${dept.orderClass} ${dept.cardClass}`}
                >
                    <div className={`card-body items-center text-center ${dept.rank === 1 ? 'p-9' : 'p-8'}`}>
                        <div className={`absolute top-4 left-4 rounded-full px-3 py-1 text-sm font-black ${dept.rankClass}`}>
                            #{dept.rank}
                        </div>
                        <div className={`text-sm font-black uppercase tracking-wider ${dept.medalClass}`}>
                            {dept.medalLabel}
                        </div>
                        <h3 className={`${dept.rank === 1 ? 'text-5xl' : 'text-4xl'} font-black text-maroon mt-2`}>
                            {dept.department_acronym}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">{dept.department_name}</p>
                        
                        <div className="flex gap-4 justify-center mt-2">
                            <div className="text-center">
                                <div className="text-xl font-bold text-gold">{dept.gold}</div>
                                <div className="text-xs font-bold uppercase">Gold</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl font-bold text-gray-700">{dept.silver}</div>
                                <div className="text-xs font-bold uppercase">Silver</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl font-bold text-amber-700">{dept.bronze}</div>
                                <div className="text-xs font-bold uppercase">Bronze</div>
                            </div>
                        </div>
                        
                        <div className="mt-6 pt-4 border-t w-full">
                            <div className={`${dept.rank === 1 ? 'text-4xl' : 'text-3xl'} font-black text-charcoal`}>
                                {dept.total_medals}
                            </div>
                            <div className="text-xs font-bold uppercase text-gray-600">Total medals</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function LatestNewsSection() {
    const { data: news, isLoading } = usePublishedNews();

    if (isLoading) {
        return (
            <section className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                <div className="grid min-h-40 place-items-center">
                    <span className="loading loading-spinner text-maroon"></span>
                </div>
            </section>
        );
    }

    const latest = news?.slice(0, 3) || [];
    const featuredRecap = news?.find(article => article.article_type === 'result_recap' || article.article_type === 'highlight');
    const latestAnnouncement = news?.find(article => article.article_type === 'announcement');
    const latestScheduleUpdate = news?.find(article => article.article_type === 'schedule_update');

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-charcoal flex items-center gap-2">
                    <Newspaper className="w-8 h-8 text-maroon" />
                    Latest News
                </h2>
                <Link to="/news" className="text-maroon font-semibold hover:underline flex items-center gap-1">
                    Full Newsroom <ArrowRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm">
                    {featuredRecap ? (
                        <>
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span className="badge border-maroon/30 bg-maroon/10 capitalize text-maroon">{featuredRecap.article_type.replace('_', ' ')}</span>
                                {featuredRecap.ai_generated && (
                                    <span className="badge border-maroon/30 bg-maroon/10 text-maroon">
                                        <Sparkles className="mr-1 h-3 w-3" />
                                        AI-assisted recap
                                    </span>
                                )}
                            </div>
                            <h3 className="text-2xl font-black text-charcoal">{featuredRecap.title}</h3>
                            <p className="mt-3 text-gray-600">{featuredRecap.summary}</p>
                            <Link to={`/news/${featuredRecap.slug}`} className="btn mt-5 bg-maroon text-white hover:bg-maroon-dark">
                                Read story
                            </Link>
                        </>
                    ) : (
                        <>
                            <h3 className="text-2xl font-black text-charcoal">Published stories will appear here.</h3>
                            <p className="mt-3 text-gray-600">Once official announcements and recaps are published, the latest feature story will show on the home page.</p>
                        </>
                    )}
                </div>

                <div className="space-y-4">
                    {[latestAnnouncement, latestScheduleUpdate].filter(Boolean).map(article => (
                        <Link
                            key={article!.id}
                            to={`/news/${article!.slug}`}
                            className="block rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm transition hover:border-maroon/30"
                        >
                            <div className="badge border-maroon/30 bg-maroon/10 capitalize text-maroon">{article!.article_type.replace('_', ' ')}</div>
                            <div className="mt-3 font-black text-charcoal">{article!.title}</div>
                            <p className="mt-2 text-sm text-gray-600">{article!.summary}</p>
                        </Link>
                    ))}
                </div>
            </div>

            {latest.length > 0 && (
                <div className="grid gap-4 md:grid-cols-3">
                    {latest.map(article => (
                        <Link
                            key={article.id}
                            to={`/news/${article.slug}`}
                            className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-maroon/30"
                        >
                            <div className="badge badge-sm border-maroon/30 bg-maroon/10 capitalize text-maroon">{article.article_type.replace('_', ' ')}</div>
                            <h3 className="mt-3 text-lg font-black text-charcoal">{article.title}</h3>
                            <p className="mt-2 text-sm text-gray-600 line-clamp-3">{article.summary}</p>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}
