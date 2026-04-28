from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from core.models import Department, NewsArticle, UserProfile


class AdminNewsSmokeTests(APITestCase):
    def setUp(self):
        self.department = Department.objects.create(
            name='College of Engineering',
            acronym='CENG',
        )
        self.admin = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='demo1234',
        )
        UserProfile.objects.create(user=self.admin, role='admin')
        self.rep = User.objects.create_user(
            username='ceng_rep',
            email='ceng@example.com',
            password='demo1234',
        )
        UserProfile.objects.create(user=self.rep, role='department_rep', department=self.department)
        NewsArticle.objects.create(
            title='Published Update',
            slug='published-update',
            summary='Published summary',
            body_md='Published body',
            article_type='announcement',
            status='published',
            published_at=timezone.now(),
            created_by=self.admin,
            reviewed_by=self.admin,
        )
        NewsArticle.objects.create(
            title='Draft Update',
            slug='draft-update',
            summary='Draft summary',
            body_md='Draft body',
            article_type='general_news',
            status='draft',
            created_by=self.admin,
        )

    def test_seeded_admin_login_token_can_access_admin_news(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'admin',
            'password': 'demo1234',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertNotIn('refresh', response.data)
        self.assertIn('enverga_refresh', response.cookies)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        news_response = self.client.get('/api/admin/news/')

        self.assertEqual(news_response.status_code, 200)
        self.assertEqual(len(news_response.data), 2)

    def test_refresh_uses_httponly_cookie_and_returns_access_only(self):
        login_response = self.client.post('/api/auth/login/', {
            'username': 'admin',
            'password': 'demo1234',
        }, format='json')
        self.assertEqual(login_response.status_code, 200)
        self.assertIn('enverga_refresh', login_response.cookies)
        self.assertTrue(login_response.cookies['enverga_refresh']['httponly'])

        refresh_response = self.client.post('/api/auth/refresh/', {}, format='json')

        self.assertEqual(refresh_response.status_code, 200)
        self.assertIn('access', refresh_response.data)
        self.assertNotIn('refresh', refresh_response.data)

    def test_logout_clears_refresh_cookie(self):
        login_response = self.client.post('/api/auth/login/', {
            'username': 'admin',
            'password': 'demo1234',
        }, format='json')
        self.assertEqual(login_response.status_code, 200)

        logout_response = self.client.post('/api/auth/logout/', {}, format='json')

        self.assertEqual(logout_response.status_code, 200)
        self.assertIn('enverga_refresh', logout_response.cookies)
        self.assertEqual(logout_response.cookies['enverga_refresh'].value, '')

    def test_department_rep_cannot_access_admin_news(self):
        self.client.force_authenticate(user=self.rep)
        response = self.client.get('/api/admin/news/')

        self.assertEqual(response.status_code, 403)

    def test_public_news_endpoint_only_returns_published_articles(self):
        response = self.client.get('/api/public/news/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['slug'] for item in response.data], ['published-update'])

    def test_department_serializer_exposes_real_representative(self):
        response = self.client.get('/api/public/departments/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]['representative_username'], 'ceng_rep')
        self.assertEqual(response.data[0]['operational_status'], 'ready')
