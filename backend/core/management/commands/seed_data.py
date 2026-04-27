from datetime import timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import Department, UserProfile, Venue, VenueArea
from events.models import Event, EventCategory
from tournaments.models import (
    Athlete,
    EventRegistration,
    EventSchedule,
    MatchResult,
    MatchSetScore,
    MedalRecord,
    MedalTally,
    PodiumResult,
    RosterEntry,
)
from tournaments.services import apply_final_match_result, apply_final_podium_result


DEMO_PASSWORD = "demo1234"
DEPARTMENT_ACRONYMS = [
    "CAFA",
    "CAS",
    "CBA",
    "CCMS",
    "CCJC",
    "CED",
    "CENG",
    "CIHTM",
    "CME",
    "CNAHS",
]
DEMO_USERNAMES = ["admin", *[f"{acronym.lower()}_rep" for acronym in DEPARTMENT_ACRONYMS]]


class Command(BaseCommand):
    help = "Seeds the database with context-aligned Enverga Arena demo data"

    def handle(self, *args, **kwargs):
        self.stdout.write("Clearing existing data...")
        User.objects.filter(username__in=DEMO_USERNAMES).delete()
        MedalRecord.objects.all().delete()
        MedalTally.objects.all().delete()
        PodiumResult.objects.all().delete()
        MatchSetScore.objects.all().delete()
        MatchResult.objects.all().delete()
        RosterEntry.objects.all().delete()
        EventRegistration.objects.all().delete()
        Athlete.objects.all().delete()
        EventSchedule.objects.all().delete()
        Event.objects.all().delete()
        EventCategory.objects.all().delete()
        VenueArea.objects.all().delete()
        Venue.objects.all().delete()
        Department.objects.all().delete()

        departments = self.seed_departments()
        users = self.seed_demo_users(departments)
        venue_areas = self.seed_venues()
        categories = self.seed_categories()
        events = self.seed_events(categories)
        schedules = self.seed_schedules(events, venue_areas)
        athletes = self.seed_athletes(departments)
        self.seed_registrations(schedules, departments, users, athletes)
        self.seed_results(schedules, departments)
        self.seed_remaining_medal_records(categories, departments)

        self.stdout.write(self.style.SUCCESS("Successfully seeded context-aligned Enverga Arena demo data."))
        rep_logins = ", ".join(f"{acronym.lower()}_rep/{DEMO_PASSWORD}" for acronym in DEPARTMENT_ACRONYMS)
        self.stdout.write(self.style.SUCCESS(f"Demo admin login: admin/{DEMO_PASSWORD}"))
        self.stdout.write(self.style.SUCCESS(f"Demo department rep logins: {rep_logins}"))

    def seed_departments(self):
        self.stdout.write("Seeding official departments...")
        departments_data = [
            ("College of Architecture and Fine Arts", "CAFA", "#7A1114"),
            ("College of Arts and Sciences", "CAS", "#1D3557"),
            ("College of Business and Accountancy", "CBA", "#9A6500"),
            ("College of Computing and Multimedia Studies", "CCMS", "#0F766E"),
            ("College of Criminal Justice and Criminology", "CCJC", "#5B1113"),
            ("College of Education", "CED", "#2563EB"),
            ("College of Engineering", "CENG", "#A52A2A"),
            ("College of International Hospitality and Tourism Management", "CIHTM", "#BE185D"),
            ("College of Maritime Education", "CME", "#1E40AF"),
            ("College of Nursing and Allied Health Sciences", "CNAHS", "#166534"),
        ]

        departments = {}
        for name, acronym, color in departments_data:
            departments[acronym] = Department.objects.create(
                name=name,
                acronym=acronym,
                color_code=color,
            )
        return departments

    def seed_demo_users(self, departments):
        self.stdout.write("Creating demo accounts...")
        admin = User.objects.create_superuser(
            username="admin",
            email="admin@enverga.demo",
            password=DEMO_PASSWORD,
        )
        UserProfile.objects.create(user=admin, role="admin")

        users = {"admin": admin}
        for acronym in DEPARTMENT_ACRONYMS:
            username = f"{acronym.lower()}_rep"
            user = User.objects.create_user(
                username=username,
                email=f"{acronym.lower()}@enverga.demo",
                password=DEMO_PASSWORD,
            )
            UserProfile.objects.create(
                user=user,
                role="department_rep",
                department=departments[acronym],
            )
            users[username] = user

        return users

    def seed_venues(self):
        self.stdout.write("Seeding venues and venue areas...")
        gym = Venue.objects.create(name="University Gymnasium", location="MSEUF Lucena main campus")
        covered_complex = Venue.objects.create(name="Covered Sports Complex", location="MSEUF Lucena main campus")
        pool = Venue.objects.create(name="Olympic-sized Swimming Pool", location="MSEUF Lucena main campus")
        tennis_area = Venue.objects.create(name="Tennis Court Area", location="MSEUF Lucena main campus")
        ccms = Venue.objects.create(name="CCMS Building", location="MSEUF Lucena main campus")
        tba = Venue.objects.create(name="Venue TBA", location="Pending OSCR confirmation")

        return {
            "gym_court_a": VenueArea.objects.create(venue=gym, name="Court A"),
            "gym_court_b": VenueArea.objects.create(venue=gym, name="Court B"),
            "covered_badminton": VenueArea.objects.create(venue=covered_complex, name="Badminton Court"),
            "covered_pickleball": VenueArea.objects.create(venue=covered_complex, name="Pickleball Court"),
            "table_tennis": VenueArea.objects.create(venue=gym, name="Table Tennis Area"),
            "tennis_1": VenueArea.objects.create(venue=tennis_area, name="Tennis Court 1"),
            "pool_lanes": VenueArea.objects.create(venue=pool, name="Pool Lane Set"),
            "esports_room": VenueArea.objects.create(venue=ccms, name="Esports Room A"),
            "venue_tba": VenueArea.objects.create(venue=tba, name="To be assigned"),
        }

    def seed_categories(self):
        self.stdout.write("Seeding event categories...")
        return {
            "ball": EventCategory.objects.create(name="Ball Games"),
            "aquatics": EventCategory.objects.create(name="Aquatics"),
            "cultural": EventCategory.objects.create(name="Cultural"),
            "esports": EventCategory.objects.create(name="E-Sports"),
            "athletics": EventCategory.objects.create(name="Athletics"),
            "martial": EventCategory.objects.create(name="Martial Arts"),
            "mind": EventCategory.objects.create(name="Mind Sports"),
            "others": EventCategory.objects.create(name="Others", is_medal_bearing=False),
            "previous": EventCategory.objects.create(name="Previous Events (Seeded)", is_medal_bearing=False),
        }

    def seed_events(self, categories):
        self.stdout.write("Seeding context-approved v1 events...")
        event_specs = {
            "basketball": ("Men's Basketball Finals", "ball", "match_based", "live"),
            "volleyball": ("Women's Volleyball Finals", "ball", "match_based", "completed"),
            "badminton": ("Badminton Team Qualifiers", "ball", "match_based", "scheduled"),
            "table_tennis": ("Men's Table Tennis Team Final", "ball", "match_based", "completed"),
            "tennis": ("Tennis Doubles Qualifiers", "ball", "match_based", "scheduled"),
            "pickleball": ("Pickleball Mixed Doubles", "ball", "match_based", "scheduled"),
            "swimming": ("200m Freestyle Final", "aquatics", "rank_based", "completed"),
            "dancesport": ("Dancesport Latin Category", "cultural", "rank_based", "completed"),
            "esports": ("Esports Semifinal Title A", "esports", "match_based", "scheduled"),
            "athletics_track": ("Athletics Track Events (Configurable)", "athletics", "rank_based", "postponed"),
            "athletics_field": ("Athletics Field Events (Configurable)", "athletics", "rank_based", "postponed"),
            "taekwondo_kyorugi": ("Taekwondo Kyorugi (Format TBA)", "martial", "match_based", "postponed"),
            "taekwondo_poomsae": ("Taekwondo Poomsae / Karatedo (Format TBA)", "martial", "rank_based", "postponed"),
            "solo_voice": ("Solo Voice / Vocal Solo (Configurable)", "cultural", "rank_based", "postponed"),
            "oratorical": ("Oratorical Competition (Configurable)", "cultural", "rank_based", "postponed"),
            "pageant": ("Mr. & Ms. Intramurals / Mutya (Configurable)", "cultural", "rank_based", "postponed"),
            "hiphop": ("Hip-Hop / Street Dance (Configurable)", "cultural", "rank_based", "postponed"),
            "chess": ("Chess Tournament (Optional v2)", "mind", "rank_based", "postponed"),
        }

        events = {}
        for key, (name, category_key, result_family, status) in event_specs.items():
            events[key] = Event.objects.create(
                category=categories[category_key],
                name=name,
                result_family=result_family,
                status=status,
            )

        # Program activities are schedulable but not medal-bearing. The current schema still
        # requires a result family, so these are marked as program events and never produce results.
        for key, name in {
            "opening": "Opening Ceremony and Parade",
            "solidarity": "Solidarity Meeting",
            "fun_run": "Fun Run and Booths",
        }.items():
            events[key] = Event.objects.create(
                category=categories["others"],
                name=name,
                result_family="rank_based",
                is_program_event=True,
                status="scheduled",
            )

        return events

    def seed_schedules(self, events, venue_areas):
        self.stdout.write("Seeding schedules...")
        now = timezone.now().replace(minute=0, second=0, microsecond=0)
        schedule_specs = {
            "opening": ("opening", "gym_court_a", now - timedelta(days=1, hours=3), 2, "Program event"),
            "basketball": ("basketball", "gym_court_a", now - timedelta(minutes=30), 2, ""),
            "volleyball": ("volleyball", "gym_court_b", now - timedelta(days=1), 2, ""),
            "table_tennis": ("table_tennis", "table_tennis", now - timedelta(hours=6), 2, ""),
            "swimming": ("swimming", "pool_lanes", now - timedelta(hours=4), 2, ""),
            "dancesport": ("dancesport", "gym_court_b", now - timedelta(hours=4), 2, ""),
            "badminton": ("badminton", "covered_badminton", now + timedelta(hours=2), 2, ""),
            "tennis": ("tennis", "tennis_1", now + timedelta(days=1, hours=1), 2, ""),
            "pickleball": ("pickleball", "covered_pickleball", now + timedelta(days=1, hours=4), 2, ""),
            "esports": (
                "esports",
                "esports_room",
                now + timedelta(days=2),
                3,
                "Exact esports title is configurable because no official title list is confirmed in the context.",
            ),
            "solidarity": ("solidarity", "gym_court_b", now + timedelta(days=2, hours=4), 1, "Program event"),
            "fun_run": ("fun_run", "gym_court_a", now + timedelta(days=3, hours=6), 2, "Program event"),
            "athletics_track": (
                "athletics_track",
                "venue_tba",
                None,
                None,
                "Phase-gated: add after athletics venue and heat format are confirmed by OSCR.",
            ),
            "athletics_field": (
                "athletics_field",
                "venue_tba",
                None,
                None,
                "Phase-gated: add after athletics venue and field-event equipment are confirmed by OSCR.",
            ),
            "taekwondo_kyorugi": (
                "taekwondo_kyorugi",
                "venue_tba",
                None,
                None,
                "Phase-gated: taekwondo activity is supported by context, but intramural divisions/rules need confirmation.",
            ),
            "taekwondo_poomsae": (
                "taekwondo_poomsae",
                "venue_tba",
                None,
                None,
                "Optional future martial-arts event; keep configurable until rules and divisions are confirmed.",
            ),
            "solo_voice": (
                "solo_voice",
                "venue_tba",
                None,
                None,
                "Configurable cultural event; enable only if it counts toward the same championship.",
            ),
            "oratorical": (
                "oratorical",
                "venue_tba",
                None,
                None,
                "Configurable cultural event; enable only if it counts toward the same championship.",
            ),
            "pageant": (
                "pageant",
                "venue_tba",
                None,
                None,
                "Configurable cultural event; championship inclusion still needs confirmation.",
            ),
            "hiphop": (
                "hiphop",
                "venue_tba",
                None,
                None,
                "Optional future judged event; not enabled by default without OSCR confirmation.",
            ),
            "chess": (
                "chess",
                "venue_tba",
                None,
                None,
                "Optional v2 mind-sports event; direct MSEUF intramurals confirmation is still low.",
            ),
        }

        schedules = {}
        for key, (event_key, area_key, start, duration_hours, notes) in schedule_specs.items():
            area = venue_areas[area_key]
            schedules[key] = EventSchedule.objects.create(
                event=events[event_key],
                venue=area.venue,
                venue_area=area,
                scheduled_start=start,
                scheduled_end=start + timedelta(hours=duration_hours) if start and duration_hours else None,
                notes=notes,
            )
        return schedules

    def seed_athletes(self, departments):
        self.stdout.write("Seeding participant records...")
        program_by_dept = {
            "CAFA": "BS Architecture",
            "CAS": "BS Psychology",
            "CBA": "BS Accountancy",
            "CCMS": "BS Information Technology",
            "CCJC": "BS Criminology",
            "CED": "BSEd English",
            "CENG": "BS Civil Engineering",
            "CIHTM": "BS Hospitality Management",
            "CME": "BS Marine Transportation",
            "CNAHS": "BS Nursing",
        }
        names_by_dept = {
            "CAFA": ["Arielle Mendoza", "Luis Santiago", "Mika Reyes", "Gian Flores"],
            "CAS": ["Sofia Garcia", "Kenji Ramos", "Angelica Flores", "Noel Bautista"],
            "CBA": ["Trisha Mercado", "Harvey Gonzales", "Elaine Torres", "Miguel Uy"],
            "CCMS": ["Rafael Cruz", "Nina Villanueva", "Paolo Tan", "Janelle Uy"],
            "CCJC": ["Andrea Manalo", "Jonas Perez", "Rhea Castillo"],
            "CED": ["Camille Austria", "Bryan Mallari", "Faith Mendoza"],
            "CENG": ["Marco Lim", "Bianca Santos", "Jerome Dela Cruz", "Iris Navarro"],
            "CIHTM": ["Patricia Lopez", "Enzo Ramos", "Mara Delos Santos"],
            "CME": ["Aldrin Reyes", "Kurt Villasis", "Shane Bautista"],
            "CNAHS": ["Nica Salazar", "Dean Carpio", "Jules De Vera"],
        }

        athletes = {}
        for dept_acronym, names in names_by_dept.items():
            athletes[dept_acronym] = []
            for index, full_name in enumerate(names, 1):
                athletes[dept_acronym].append(Athlete.objects.create(
                    student_number=f"{dept_acronym}-2026-{index:03}",
                    full_name=full_name,
                    department=departments[dept_acronym],
                    program_course=program_by_dept[dept_acronym],
                    year_level=["1st Year", "2nd Year", "3rd Year", "4th Year"][index % 4],
                    is_enrolled=True,
                    medical_cleared=not (dept_acronym == "CCMS" and index == 4),
                ))
        return athletes

    def seed_registrations(self, schedules, departments, users, athletes):
        self.stdout.write("Seeding registrations and rosters...")
        demo_registrations = [
            ("basketball", "CBA", "approved", "cba_rep", athletes["CBA"][:4], ""),
            ("basketball", "CAS", "approved", "cas_rep", athletes["CAS"][:4], ""),
            ("volleyball", "CAFA", "approved", "cafa_rep", athletes["CAFA"][:4], ""),
            ("volleyball", "CENG", "approved", "ceng_rep", athletes["CENG"][:4], ""),
            ("table_tennis", "CCMS", "approved", "ccms_rep", athletes["CCMS"][:3], ""),
            ("table_tennis", "CAS", "approved", "cas_rep", athletes["CAS"][:3], ""),
            ("swimming", "CAFA", "approved", "cafa_rep", athletes["CAFA"][:2], ""),
            ("swimming", "CCMS", "approved", "ccms_rep", athletes["CCMS"][:2], ""),
            ("swimming", "CENG", "approved", "ceng_rep", athletes["CENG"][:2], ""),
            ("dancesport", "CCMS", "approved", "ccms_rep", athletes["CCMS"][:2], ""),
            ("dancesport", "CAFA", "approved", "cafa_rep", athletes["CAFA"][:2], ""),
            ("dancesport", "CBA", "approved", "cba_rep", athletes["CBA"][:2], ""),
            ("badminton", "CNAHS", "submitted", "cnahs_rep", athletes["CNAHS"][:2], ""),
            (
                "badminton",
                "CCJC",
                "needs_revision",
                "ccjc_rep",
                athletes["CCJC"][:2],
                "Upload updated medical clearance before admin review.",
            ),
            ("tennis", "CME", "pending", "cme_rep", athletes["CME"][:2], ""),
            ("tennis", "CED", "submitted", "ced_rep", athletes["CED"][:2], ""),
            ("pickleball", "CIHTM", "submitted", "cihtm_rep", athletes["CIHTM"][:2], ""),
            ("esports", "CENG", "submitted", "ceng_rep", athletes["CENG"][:3], ""),
            ("esports", "CBA", "submitted", "cba_rep", athletes["CBA"][:3], ""),
        ]

        for schedule_key, dept_acronym, status, submitted_by_key, roster, admin_notes in demo_registrations:
            registration = EventRegistration.objects.create(
                schedule=schedules[schedule_key],
                department=departments[dept_acronym],
                status=status,
                submitted_by=users.get(submitted_by_key) if submitted_by_key else None,
                admin_notes=admin_notes,
            )
            RosterEntry.objects.bulk_create([
                RosterEntry(registration=registration, athlete=athlete)
                for athlete in roster
            ])

    def seed_results(self, schedules, departments):
        self.stdout.write("Seeding finalized and live results...")
        basketball = MatchResult.objects.create(
            schedule=schedules["basketball"],
            home_department=departments["CBA"],
            away_department=departments["CAS"],
            home_score=68,
            away_score=72,
            winner=departments["CAS"],
            is_final=False,
        )
        MatchSetScore.objects.bulk_create([
            MatchSetScore(match=basketball, set_number=1, home_score=18, away_score=17),
            MatchSetScore(match=basketball, set_number=2, home_score=16, away_score=19),
            MatchSetScore(match=basketball, set_number=3, home_score=17, away_score=18),
            MatchSetScore(match=basketball, set_number=4, home_score=17, away_score=18),
        ])

        volleyball = MatchResult.objects.create(
            schedule=schedules["volleyball"],
            home_department=departments["CAFA"],
            away_department=departments["CENG"],
            home_score=3,
            away_score=1,
            winner=departments["CAFA"],
            is_final=True,
        )
        MatchSetScore.objects.bulk_create([
            MatchSetScore(match=volleyball, set_number=1, home_score=25, away_score=21),
            MatchSetScore(match=volleyball, set_number=2, home_score=23, away_score=25),
            MatchSetScore(match=volleyball, set_number=3, home_score=25, away_score=19),
            MatchSetScore(match=volleyball, set_number=4, home_score=25, away_score=22),
        ])
        apply_final_match_result(volleyball)

        table_tennis = MatchResult.objects.create(
            schedule=schedules["table_tennis"],
            home_department=departments["CCMS"],
            away_department=departments["CAS"],
            home_score=3,
            away_score=1,
            winner=departments["CCMS"],
            is_final=True,
        )
        MatchSetScore.objects.bulk_create([
            MatchSetScore(match=table_tennis, set_number=1, home_score=3, away_score=0),
            MatchSetScore(match=table_tennis, set_number=2, home_score=2, away_score=3),
            MatchSetScore(match=table_tennis, set_number=3, home_score=3, away_score=1),
            MatchSetScore(match=table_tennis, set_number=4, home_score=3, away_score=2),
        ])
        apply_final_match_result(table_tennis)

        podium_results = [
            (schedules["swimming"], "CAFA", 1, "gold"),
            (schedules["swimming"], "CCMS", 2, "silver"),
            (schedules["swimming"], "CENG", 3, "bronze"),
            (schedules["dancesport"], "CCMS", 1, "gold"),
            (schedules["dancesport"], "CAFA", 2, "silver"),
            (schedules["dancesport"], "CBA", 3, "bronze"),
        ]
        for schedule, dept_acronym, rank, medal in podium_results:
            podium = PodiumResult.objects.create(
                schedule=schedule,
                department=departments[dept_acronym],
                rank=rank,
                medal=medal,
                is_final=True,
            )
            apply_final_podium_result(podium)

    def seed_remaining_medal_records(self, categories, departments):
        self.stdout.write("Seeding context sample standings from the medal ledger...")
        target_standings = {
            "CAFA": {"gold": 18, "silver": 14, "bronze": 9},
            "CCMS": {"gold": 12, "silver": 15, "bronze": 10},
            "CENG": {"gold": 10, "silver": 12, "bronze": 18},
            "CBA": {"gold": 8, "silver": 9, "bronze": 12},
            "CAS": {"gold": 7, "silver": 11, "bronze": 15},
        }

        previous_category = categories["previous"]
        for dept_acronym, targets in target_standings.items():
            dept = departments[dept_acronym]
            existing = {
                medal: MedalRecord.objects.filter(department=dept, medal=medal).count()
                for medal in ["gold", "silver", "bronze"]
            }
            for medal_type, target_count in targets.items():
                remaining = target_count - existing[medal_type]
                for index in range(remaining):
                    event = Event.objects.create(
                        category=previous_category,
                        name=f"Seeded {medal_type.title()} Result {dept_acronym} {index + 1}",
                        result_family="rank_based",
                        status="completed",
                    )
                    MedalRecord.objects.create(
                        department=dept,
                        event=event,
                        medal=medal_type,
                    )

        for dept in departments.values():
            MedalTally.objects.get_or_create(
                department=dept,
                defaults={
                    "gold": 0,
                    "silver": 0,
                    "bronze": 0,
                    "total_points": 0,
                },
            )
