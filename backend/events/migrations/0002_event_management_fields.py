from django.db import migrations, models
from django.utils.text import slugify


def seed_event_metadata(apps, schema_editor):
    Event = apps.get_model('events', 'Event')
    used_slugs = set()

    for index, event in enumerate(Event.objects.order_by('id'), start=1):
        base_slug = slugify(event.name) or f'event-{event.id}'
        slug = base_slug
        suffix = 2
        while slug in used_slugs or Event.objects.exclude(pk=event.pk).filter(slug=slug).exists():
            slug = f'{base_slug}-{suffix}'
            suffix += 1
        used_slugs.add(slug)

        name_lower = event.name.lower()
        if 'women' in name_lower:
            division = "Women's"
        elif 'men' in name_lower:
            division = "Men's"
        elif 'mixed' in name_lower:
            division = 'Mixed'
        else:
            division = 'Open'

        event.slug = slug
        event.division = division
        event.medal_bearing = not event.is_program_event
        event.sort_order = index
        event.save(update_fields=['slug', 'division', 'medal_bearing', 'sort_order'])


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='slug',
            field=models.SlugField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='event',
            name='division',
            field=models.CharField(blank=True, default='Open', max_length=120),
        ),
        migrations.AddField(
            model_name='event',
            name='competition_format',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='event',
            name='best_of',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='team_size_min',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='team_size_max',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='roster_size_max',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='medal_bearing',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='event',
            name='ruleset_ref',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='event',
            name='sort_order',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='event',
            name='status',
            field=models.CharField(
                choices=[
                    ('scheduled', 'Scheduled'),
                    ('live', 'Live'),
                    ('completed', 'Completed'),
                    ('postponed', 'Postponed'),
                    ('cancelled', 'Cancelled'),
                    ('archived', 'Archived'),
                ],
                default='scheduled',
                max_length=20,
            ),
        ),
        migrations.AlterModelOptions(
            name='event',
            options={'ordering': ['sort_order', 'name']},
        ),
        migrations.RunPython(seed_event_metadata, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='event',
            name='slug',
            field=models.SlugField(blank=True, max_length=255, unique=True),
        ),
    ]
