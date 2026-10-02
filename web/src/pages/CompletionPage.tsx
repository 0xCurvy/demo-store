import { CompletionContent } from "@/features/completion/components/CompletionContent";
import { useCheckoutReturn } from "@/features/completion/hooks/useCheckoutReturn";
import { errorMessage } from "@/shared/api/client";
import { Notice } from "@/shared/ui/Notice";

/** Where Curvy checkout sends the buyer back to: /checkout/complete. */
export function CompletionPage() {
  const { order, hintProblem, freshPayment, retrying } = useCheckoutReturn();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {hintProblem && (
        <Notice title="The transaction from checkout did not match this order">
          {hintProblem}. The shop keeps checking the chain for your payment.
        </Notice>
      )}

      {freshPayment.isError && (
        <Notice tone="warning" title="A new payment could not start">
          {errorMessage(freshPayment.error)}
        </Notice>
      )}

      <CompletionContent
        order={order.data}
        checkedAt={order.dataUpdatedAt}
        error={order.error}
        retrying={retrying}
        startingAgain={freshPayment.isPending || freshPayment.isSuccess}
        onPayAgain={(latestEphemeralKeyX) => freshPayment.mutate({ latestEphemeralKeyX })}
      />
    </div>
  );
}
