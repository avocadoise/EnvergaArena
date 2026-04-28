from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_newsarticle'),
    ]

    operations = [
        migrations.AddField(
            model_name='venue',
            name='address',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='venue',
            name='building',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='venue',
            name='campus',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='venue',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='venue',
            name='is_indoor',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='venue',
            name='notes',
            field=models.TextField(blank=True),
        ),
    ]
