from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Custom manager for RoutePool User using email as the primary credential."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email address is required for user account creation')
        email = self.normalize_email(email)
        extra_fields.setdefault('username', email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    RoutePool Core User Model.
    Supports role-based routing (Vendor, Commuter, Admin) and maintains
    a dynamic reliability score for crowd-shipping custody trust.
    """
    ROLE_CHOICES = (
        ('vendor', 'Vendor / Local Merchant'),
        ('commuter', 'Daily Commuter / Transporter'),
        ('admin', 'Platform Administrator'),
    )

    name = models.CharField(max_length=255, blank=True, help_text="Full user or representative name")
    email = models.EmailField(unique=True, db_index=True, help_text="Unique authentication email")
    phone = models.CharField(max_length=25, blank=True, help_text="Contact telephone / WhatsApp for dispatch OTP")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='commuter', db_index=True)
    reliability_score = models.FloatField(
        default=100.0,
        help_text="Dynamic credibility index (0-100). Incremented on successful handovers and decremented on dropouts."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
        ]

    def __str__(self):
        label = self.name or self.email
        return f"{label} ({self.role}) [Trust: {self.reliability_score:.1f}%]"

    @property
    def is_vendor(self) -> bool:
        return self.role == 'vendor'

    @property
    def is_commuter(self) -> bool:
        return self.role == 'commuter'

    @property
    def is_admin_user(self) -> bool:
        return self.role == 'admin' or self.is_superuser

    @property
    def display_name(self) -> str:
        return self.name if self.name else self.email.split('@')[0]
