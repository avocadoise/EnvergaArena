from rest_framework.test import APITestCase

from core.models import Department
from tournaments.models import MedalTally


class MedalTallySmokeTests(APITestCase):
    def test_public_medal_tally_uses_gold_silver_bronze_priority(self):
        department_a = Department.objects.create(name='Department A', acronym='DA')
        department_b = Department.objects.create(name='Department B', acronym='DB')
        department_c = Department.objects.create(name='Department C', acronym='DC')
        department_d = Department.objects.create(name='Department D', acronym='DD')

        MedalTally.objects.create(department=department_a, gold=1, silver=0, bronze=0)
        MedalTally.objects.create(department=department_b, gold=0, silver=50, bronze=0)
        MedalTally.objects.create(department=department_c, gold=1, silver=2, bronze=0)
        MedalTally.objects.create(department=department_d, gold=1, silver=2, bronze=3)

        response = self.client.get('/api/public/medal-tally/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item['department_name'] for item in response.data],
            ['Department D', 'Department C', 'Department A', 'Department B'],
        )
