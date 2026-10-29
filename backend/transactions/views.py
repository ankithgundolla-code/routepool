from rest_framework import generics, permissions
from .models import Transaction
from .serializers import TransactionSerializer

class TransactionListView(generics.ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Transaction.objects.all()
        if user.role == 'vendor':
            return Transaction.objects.filter(delivery__match__package__vendor__user=user)
        # Commuter
        return Transaction.objects.filter(delivery__match__commuter_route__commuter=user)
