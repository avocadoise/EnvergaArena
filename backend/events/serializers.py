from rest_framework import serializers
from django.utils.text import slugify
from .models import EventCategory, Event

class EventCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EventCategory
        fields = ['id', 'name', 'is_medal_bearing', 'created_at', 'updated_at']

class EventSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    linked_schedule_count = serializers.SerializerMethodField()
    linked_registration_count = serializers.SerializerMethodField()
    linked_result_count = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'name', 'slug', 'category', 'category_name', 'division',
            'result_family', 'competition_format', 'best_of',
            'team_size_min', 'team_size_max', 'roster_size_max',
            'medal_bearing', 'ruleset_ref', 'sort_order',
            'is_program_event', 'status',
            'linked_schedule_count', 'linked_registration_count', 'linked_result_count',
            'created_at', 'updated_at',
        ]

    def validate(self, attrs):
        slug = attrs.get('slug')
        name = attrs.get('name') or getattr(self.instance, 'name', '')
        if not slug and name:
            attrs['slug'] = self._unique_slug(name)

        team_size_min = attrs.get('team_size_min', getattr(self.instance, 'team_size_min', None))
        team_size_max = attrs.get('team_size_max', getattr(self.instance, 'team_size_max', None))
        roster_size_max = attrs.get('roster_size_max', getattr(self.instance, 'roster_size_max', None))
        best_of = attrs.get('best_of', getattr(self.instance, 'best_of', None))

        if best_of is not None and best_of < 1:
            raise serializers.ValidationError({'best_of': 'Best-of value must be at least 1.'})
        if team_size_min is not None and team_size_max is not None and team_size_min > team_size_max:
            raise serializers.ValidationError({'team_size_max': 'Team size max must be greater than or equal to team size min.'})
        if roster_size_max is not None and team_size_max is not None and roster_size_max < team_size_max:
            raise serializers.ValidationError({'roster_size_max': 'Roster size max should be greater than or equal to team size max.'})

        if self.instance:
            has_schedules = self.instance.schedules.exists()
            has_results = self.get_linked_result_count(self.instance) > 0
            next_result_family = attrs.get('result_family', self.instance.result_family)
            next_medal_bearing = attrs.get('medal_bearing', self.instance.medal_bearing)

            if has_schedules and next_result_family != self.instance.result_family:
                raise serializers.ValidationError({
                    'result_family': 'Result mode cannot be changed after schedules have been created for this event.'
                })
            if has_results and next_medal_bearing != self.instance.medal_bearing:
                raise serializers.ValidationError({
                    'medal_bearing': 'Medal-bearing status cannot be changed after result data exists.'
                })

        return attrs

    def _unique_slug(self, name):
        base = slugify(name) or 'event'
        slug = base
        suffix = 2
        queryset = Event.objects.all()
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        while queryset.filter(slug=slug).exists():
            slug = f'{base}-{suffix}'
            suffix += 1
        return slug

    def get_linked_schedule_count(self, obj):
        return obj.schedules.count()

    def get_linked_registration_count(self, obj):
        return sum(schedule.registrations.count() for schedule in obj.schedules.all())

    def get_linked_result_count(self, obj):
        count = 0
        for schedule in obj.schedules.all():
            if hasattr(schedule, 'match_result'):
                count += 1
            count += schedule.podium_results.count()
        return count
