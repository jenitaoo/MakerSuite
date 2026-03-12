# app/authentication/views.py
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from rest_framework import status, generics
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer

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
                'user': UserSerializer(user).data,
                'message': 'Login successful'
            })
        
        return Response({
            'message': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)

@method_decorator(csrf_protect, name='dispatch')
class LogoutView(APIView):
    #authentication_classes = [SessionAuthentication]
    #permission_classes = [IsAuthenticated]
    # remove auth temporarily just so I can get logout to work
    authentication_classes = []      # no SessionAuthentication → no CSRF enforcement
    permission_classes = []          # no IsAuthenticated required

    def post(self, request):
        logout(request)
        return Response({'message': 'Logout successful'})

class UserView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            return Response(UserSerializer(request.user).data)
        return Response({'message': 'Not logged in'}, status=status.HTTP_401_UNAUTHORIZED)

class CSRFTokenView(APIView):
    def get(self, request):
        csrf_token = get_token(request)
        return Response({'csrfToken': csrf_token})