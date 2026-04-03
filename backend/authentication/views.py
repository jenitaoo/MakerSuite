from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status, generics
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from .models import UserProfile
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    ProfileUpdateSerializer, ChangePasswordSerializer
)


@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(generics.CreateAPIView):
    authentication_classes = []
    permission_classes = []
    queryset = User.objects.all()
    serializer_class = RegisterSerializer


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    authentication_classes = []
    permission_classes = []
    serializer_class = LoginSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password']
        )
        if user:
            login(request, user)
            return Response({
                'user': UserSerializer(user, context={'request': request}).data,
                'message': 'Login successful'
            })
        return Response({'message': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        logout(request)
        return Response({'message': 'Logout successful'})


class UserView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            return Response(UserSerializer(request.user, context={'request': request}).data)
        return Response({'message': 'Not logged in'}, status=status.HTTP_401_UNAUTHORIZED)


class CSRFTokenView(APIView):
    def get(self, request):
        return Response({'csrfToken': get_token(request)})


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        return Response(UserSerializer(request.user, context={'request': request}).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user
        if 'username' in data:
            user.username = data['username']
        if 'email' in data:
            user.email = data['email']
        user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        if 'full_name' in data:
            profile.full_name = data['full_name']
        if 'photo' in data:
            profile.photo = data['photo']
        profile.save()

        return Response(UserSerializer(user, context={'request': request}).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if not request.user.check_password(data['current_password']):
            return Response(
                {'current_password': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.set_password(data['new_password'])
        request.user.save()
        # Re-login so session stays valid after password change
        login(request, request.user)
        return Response({'message': 'Password updated successfully.'})