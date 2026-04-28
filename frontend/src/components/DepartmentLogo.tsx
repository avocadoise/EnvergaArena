import { useState } from 'react';

interface DepartmentLogoProps {
    acronym?: string | null;
    name?: string | null;
    className?: string;
    imageClassName?: string;
}

const NAME_TO_ACRONYM: Record<string, string> = {
    'College of Architecture and Fine Arts': 'CAFA',
    'College of Arts and Sciences': 'CAS',
    'College of Business and Accountancy': 'CBA',
    'College of Computing and Multimedia Studies': 'CCMS',
    'College of Criminal Justice and Criminology': 'CCJC',
    'College of Education': 'CED',
    'College of Engineering': 'CENG',
    'College of International Hospitality and Tourism Management': 'CIHTM',
    'College of Maritime Education': 'CME',
    'College of Nursing and Allied Health Sciences': 'CNAHS',
};

function resolveAcronym(acronym?: string | null, name?: string | null) {
    if (acronym) return acronym;
    if (!name) return null;
    return NAME_TO_ACRONYM[name] || null;
}

function getDepartmentLogoPaths(acronym?: string | null) {
    if (!acronym) return null;
    const normalized = acronym.trim();
    const lower = normalized.toLowerCase();

    return [
        `/${normalized.toUpperCase()}.png`,
        `/${lower}-logo.png`,
        `/${lower}.png`,
        `/${normalized.toUpperCase()}-logo.png`,
    ];
}

export default function DepartmentLogo({
    acronym,
    name,
    className = 'h-10 w-10',
    imageClassName = '',
}: DepartmentLogoProps) {
    const [candidateIndex, setCandidateIndex] = useState(0);
    const resolvedAcronym = resolveAcronym(acronym, name);
    const logoPaths = getDepartmentLogoPaths(resolvedAcronym);
    const logoPath = logoPaths?.[candidateIndex] || null;
    const fallback = resolvedAcronym || name?.slice(0, 2).toUpperCase() || 'EA';
    const label = name || acronym || 'Department';

    return (
        <div
            className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-black-500 bg-gray-200 shadow-sm ${className}`}
            title={label}
            aria-label={`${label} logo`}
        >
            {logoPath ? (
                <img
                    src={logoPath}
                    alt={`${label} logo`}
                    className={`h-full w-full scale-135 object-contain p-0.5 ${imageClassName}`}
                    onError={() => setCandidateIndex(index => index + 1)}
                />
            ) : (
                <span className="px-1 text-center text-[0.65rem] font-black leading-none text-maroon">
                    {fallback}
                </span>
            )}
        </div>
    );
}
