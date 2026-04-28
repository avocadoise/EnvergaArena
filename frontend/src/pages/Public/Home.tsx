import { Link } from 'react-router-dom';
import { useMedalTally, usePublishedNews } from '../../hooks/usePublicData';
import { Trophy, ArrowRight, Activity, Newspaper, Sparkles } from 'lucide-react';
import DepartmentLogo from '../../components/DepartmentLogo';

export default function Home() {
    return (
        <div className="space-y-16 py-8">
            {/* Hero Section */}
            <section
                className="relative overflow-hidden rounded-lg border border-base-300 bg-cover bg-center px-4 py-12 text-center shadow-sm lg:py-24"
                style={{ backgroundImage: "url('/intrams.png')" }}
            >
                <div className="absolute inset-0 bg-charcoal/55" />
                <div className="relative mx-auto flex max-w-4xl flex-col items-center justify-center rounded-lg border border-white/25 bg-white/55 px-5 py-8 shadow-xl md:px-10">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-maroon/10 px-3 py-1 text-sm font-semibold text-maroon">
                        <Activity className="w-4 h-4"/> Live Intramurals 2026
                    </div>
                    <h1 className="mb-6 text-5xl font-black tracking-tight text-maroon drop-shadow-sm md:text-6xl">
                        Enverga Arena
                    </h1>
                    <p className="mb-10 max-w-3xl text-xl leading-relaxed text-charcoal md:text-2xl">
                        The official tournament portal for the Manuel S. Enverga University Foundation intramurals.
                    </p>
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <Link to="/schedules" className="btn btn-lg border-none bg-maroon text-white shadow-lg hover:bg-maroon-dark">
                            View Schedules
                        </Link>
                        <Link to="/results" className="btn btn-lg border-maroon bg-white text-maroon hover:bg-maroon hover:text-white">
                            Live Results & Tally
                        </Link>
                    </div>
                </div>
            </section>

            {/* Top 3 Leaderboard Widget */}
            <section className="mx-auto max-w-5xl">
                <div className="mb-8 flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="flex items-center gap-3 text-3xl font-black text-charcoal">
                        <span className="grid h-11 w-11 place-items-center rounded-full border border-yellow-300/70 bg-yellow-50 text-yellow-700 shadow-sm">
                            <Trophy className="h-6 w-6" />
                        </span>
                        Current Leaders
                    </h2>
                    <Link
                        to="/results"
                        className="btn btn-sm border-maroon/25 bg-white text-maroon shadow-sm hover:border-maroon hover:bg-maroon hover:text-white"
                    >
                        Full Tally <ArrowRight className="h-4 w-4" />
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
            cardClass: 'border-yellow-400 bg-yellow-50/95 shadow-2xl shadow-yellow-900/10 md:-mt-10 md:scale-105 z-10',
            rankClass: 'border-yellow-200 bg-yellow-500 text-white shadow-md shadow-yellow-900/15',
            logoClass: 'h-24 w-24 ring-4 ring-yellow-300/60 ring-offset-4 ring-offset-yellow-50',
            statClass: 'border-yellow-200/80 bg-white/80',
            totalClass: 'border-yellow-300/80 bg-yellow-100/70',
            medalLabel: 'Gold',
            medalClass: 'border-yellow-300 bg-yellow-100 text-yellow-800',
            bronzeTextClass: 'text-amber-700',
        },
        top3[1] && {
            ...top3[1],
            orderClass: 'md:order-1',
            cardClass: 'border-slate-300 bg-slate-50/95 shadow-lg shadow-slate-900/5',
            rankClass: 'border-slate-200 bg-slate-500 text-white shadow-sm',
            logoClass: 'h-20 w-20 ring-4 ring-slate-200 ring-offset-4 ring-offset-slate-50',
            statClass: 'border-slate-200 bg-white/80',
            totalClass: 'border-slate-200 bg-white/75',
            medalLabel: 'Silver',
            medalClass: 'border-slate-300 bg-slate-100 text-slate-700',
            bronzeTextClass: 'text-amber-700',
        },
        top3[2] && {
            ...top3[2],
            orderClass: 'md:order-3',
            cardClass: 'border-orange-800/70 bg-orange-100/80 shadow-lg shadow-orange-950/10',
            rankClass: 'border-orange-300/70 bg-orange-900 text-orange-50 shadow-sm',
            logoClass: 'h-20 w-20 ring-4 ring-orange-800/30 ring-offset-4 ring-offset-orange-100',
            statClass: 'border-orange-800/20 bg-white/80',
            totalClass: 'border-orange-800/25 bg-orange-50/90',
            medalLabel: 'Bronze',
            medalClass: 'border-orange-800/30 bg-orange-900/10 text-orange-950',
            bronzeTextClass: 'text-orange-900',
        },
    ].filter(Boolean);

    return (
        <div className="grid grid-cols-1 items-end gap-5 md:grid-cols-3 lg:gap-6">
            {podium.map((dept) => (
                <div
                    key={dept.id}
                    className={`relative overflow-hidden rounded-2xl border border-t-4 transition-transform ${dept.orderClass} ${dept.cardClass}`}
                >
                    <div className={`flex h-full min-h-[390px] flex-col items-center text-center ${dept.rank === 1 ? 'px-7 py-8 md:min-h-[430px]' : 'px-6 py-7'}`}>
                        <div className={`absolute left-5 top-5 rounded-full border px-3 py-1 text-sm font-black ${dept.rankClass}`}>
                            #{dept.rank}
                        </div>
                        <div className={`mb-5 rounded-full border px-4 py-1.5 text-xs font-black uppercase ${dept.medalClass}`}>
                            {dept.medalLabel}
                        </div>
                        <DepartmentLogo
                            acronym={dept.department_acronym}
                            name={dept.department_name}
                            className={`${dept.logoClass} border-white/80 shadow-md`}
                        />
                        <h3 className={`${dept.rank === 1 ? 'mt-7 text-5xl' : 'mt-6 text-4xl'} font-black leading-none text-maroon`}>
                            {dept.department_acronym}
                        </h3>
                        <p className="mt-3 min-h-10 max-w-[15rem] text-sm font-semibold leading-snug text-gray-700">
                            {dept.department_name}
                        </p>
                        
                        <div className={`mt-6 grid w-full grid-cols-3 rounded-xl border p-2.5 ${dept.statClass}`}>
                            <div className="border-r border-base-300/70 px-2 text-center">
                                <div className="text-2xl font-black text-yellow-700">{dept.gold}</div>
                                <div className="mt-1 text-[0.68rem] font-bold uppercase text-gray-600">Gold</div>
                            </div>
                            <div className="border-r border-base-300/70 px-2 text-center">
                                <div className="text-2xl font-black text-slate-600">{dept.silver}</div>
                                <div className="mt-1 text-[0.68rem] font-bold uppercase text-gray-600">Silver</div>
                            </div>
                            <div className="px-2 text-center">
                                <div className={`text-2xl font-black ${dept.bronzeTextClass || 'text-amber-700'}`}>{dept.bronze}</div>
                                <div className="mt-1 text-[0.68rem] font-bold uppercase text-gray-600">Bronze</div>
                            </div>
                        </div>
                        
                        <div className={`mt-4 w-full rounded-xl border px-4 py-3 ${dept.totalClass}`}>
                            <div className="mx-auto mb-2 h-px w-16 bg-maroon/20" />
                            <div className={`${dept.rank === 1 ? 'text-4xl' : 'text-3xl'} font-black leading-none text-charcoal`}>
                                {dept.total_medals}
                            </div>
                            <div className="mt-1 text-xs font-bold uppercase text-gray-600">Total Medals</div>
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
