from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import UserProfile
from etsy.models import EtsyToken

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    etsy_connected = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'full_name', 'photo', 'etsy_connected')

    def get_full_name(self, obj):
        try:
            return obj.userprofile.full_name
        except UserProfile.DoesNotExist:
            return ''

    def get_photo(self, obj):
        try:
            if obj.userprofile.photo:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.userprofile.photo.url)
                return obj.userprofile.photo.url
        except UserProfile.DoesNotExist:
            pass
        return None

    def get_etsy_connected(self, obj):
        return EtsyToken.objects.filter(user=obj).exists()  # fixed


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    full_name = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = User
        fields = ('username', 'email', 'full_name', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords didn't match."})
        return attrs

    def create(self, validated_data):
        full_name = validated_data.pop('full_name', '')
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        user.userprofile.full_name = full_name
        user.userprofile.save()
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)


class ProfileUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(required=False, allow_blank=True)
    username = serializers.CharField(required=False)
    email = serializers.EmailField(required=False)
    photo = serializers.ImageField(required=False)

    def validate_username(self, value):
        user = self.context['request'].user
        if User.objects.exclude(pk=user.pk).filter(username=value).exists():
            raise serializers.ValidationError("Username already taken.")
        return value

    def validate_email(self, value):
        user = self.context['request'].user
        if User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError("Email already in use.")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"new_password": "Passwords didn't match."})
        return attrs