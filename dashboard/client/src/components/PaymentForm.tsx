import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function PaymentForm({ clientSecret, amount, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/billing?payment=success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('Payment error:', error);
        toast({
          title: 'Payment Failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Payment Successful',
          description: 'Credits have been added to your account',
        });
        onSuccess();
      }
    } catch (err) {
      console.error('Payment processing error:', err);
      toast({
        title: 'Payment Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Payment Amount Display */}
      <div className="text-center p-4 bg-card rounded-lg border border-border">
        <h3 className="text-lg font-semibold text-foreground">Payment Amount</h3>
        <p className="text-2xl font-bold text-primary">${amount.toFixed(2)}</p>
        <p className="text-sm text-muted-foreground">Credits to be added to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="max-h-[40vh] overflow-y-auto">
          <PaymentElement 
            options={{
              fields: {
                billingDetails: 'never', // Hide billing details for cleaner UI
              },
              terms: {
                card: 'never', // Hide terms for cards
              },
              wallets: {
                applePay: 'never',
                googlePay: 'never',
              },
            }}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
              className="w-full sm:flex-1 border-border text-muted-foreground hover:bg-muted"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={!stripe || isProcessing}
            className="w-full sm:flex-1 bg-[#F74000] hover:bg-[#F74000]/90 text-white"
          >
            {isProcessing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
          </Button>
        </div>
      </form>
    </div>
  );
}