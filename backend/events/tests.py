from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from events.models import Event, EventCategory


class EventEndpointSmokeTests(APITestCase):
    def setUp(self):
        self.category = EventCategory.objects.create(name='Ball Games')
        Event.objects.create(
            category=self.category,
            name='Basketball Finals',
            result_family='match_based',
            status='scheduled',
        )
        self.admin = User.objects.create_superuser('admin', 'admin@example.com', 'demo1234')

    def test_public_can_read_events(self):
        response = self.client.get('/api/public/events/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]['name'], 'Basketball Finals')

    def test_public_cannot_create_events(self):
        response = self.client.post('/api/public/events/', {
            'category': self.category.id,
            'name': 'Unauthorized Event',
            'result_family': 'match_based',
            'status': 'scheduled',
        }, format='json')

        self.assertIn(response.status_code, [401, 403])

    def test_admin_can_create_events(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/public/events/', {
            'category': self.category.id,
            'name': 'Admin Event',
            'result_family': 'rank_based',
            'status': 'scheduled',
        }, format='json')

        self.assertEqual(response.status_code, 201)
