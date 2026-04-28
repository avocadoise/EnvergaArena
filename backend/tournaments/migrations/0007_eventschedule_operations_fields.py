from django.db import migrations, models


def copy_event_status_to_schedule(apps, schema_editor):
    EventSchedule = apps.get_model('tournaments', 'EventSchedule')
    for schedule in EventSchedule.objects.select_related('event').all():
        schedule.status = schedule.event.status
        schedule.save(update_fields=['status'])


class Migration(migrations.Migration):

    dependencies = [
        ('tournaments', '0006_tryoutapplication_created_ip_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='eventschedule',
            name='phase',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='eventschedule',
            name='round_label',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='eventschedule',
            name='status',
            field=models.CharField(
                choices=[
                    ('scheduled', 'Scheduled'),
                    ('live', 'Live'),
                    ('completed', 'Completed'),
                    ('postponed', 'Postponed'),
                    ('cancelled', 'Cancelled'),
                ],
                default='scheduled',
                max_length=20,
            ),
        ),
        migrations.RunPython(copy_event_status_to_schedule, migrations.RunPython.noop),
    ]
