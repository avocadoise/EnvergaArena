from django.contrib import admin
from .models import Department, Venue, VenueArea, UserProfile

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'acronym', 'color_code')
    search_fields = ('name', 'acronym')

class VenueAreaInline(admin.TabularInline):
    model = VenueArea
    extra = 1

@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ('name', 'location')
    search_fields = ('name',)
    inlines = [VenueAreaInline]

@admin.register(VenueArea)
class VenueAreaAdmin(admin.ModelAdmin):
    list_display = ('name', 'venue', 'capacity')
    list_filter = ('venue',)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'department')
    list_filter = ('role', 'department')
    search_fields = ('user__username', 'user__email')
