from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from core.models import Department, UserProfile
from events.models import Event, EventCategory
from rooney.models import AIRecap


class AIRecapAdminSmokeTests(APITestCase):
    def setUp(self):
        self.department = Department.objects.create(name='College of Computing and Multimedia Studies', acronym='CCMS')
        self.admin = User.objects.create_superuser('admin', 'admin@example.com', 'demo1234')
        UserProfile.objects.create(user=self.admin, role='admin')
        self.rep = User.objects.create_user('ccms_rep', 'ccms@example.com', 'demo1234')
        UserProfile.objects.create(user=self.rep, role='department_rep', department=self.department)
        category = EventCategory.objects.create(name='Ball Games')
        event = Event.objects.create(
            category=category,
            name='Table Tennis Final',
            result_family='match_based',
            status='completed',
        )
        self.recap = AIRecap.objects.create(
            trigger_type='event_completion',
            scope_type='event',
            scope_key='event:table-tennis-final',
            event=event,
            department=self.department,
            input_snapshot_json={'event_title': event.name},
            generated_title='Table Tennis Final recap',
            generated_summary='A recap draft is ready.',
            generated_body='Official recap body.',
            citation_map_json={'sources': ['final_match_result']},
        )

    def test_admin_can_list_ai_recaps(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/ai-recaps/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]['generated_title'], self.recap.generated_title)

    def test_department_rep_cannot_list_ai_recaps(self):
        self.client.force_authenticate(user=self.rep)
        response = self.client.get('/api/admin/ai-recaps/')

        self.assertEqual(response.status_code, 403)

    def test_anonymous_user_cannot_list_ai_recaps(self):
        response = self.client.get('/api/admin/ai-recaps/')

        self.assertEqual(response.status_code, 401)
