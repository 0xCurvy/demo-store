import { AdminDashboard } from "@/features/admin/components/AdminDashboard";
import { AdminSignIn } from "@/features/admin/components/AdminSignIn";
import { useAdminOverview } from "@/features/admin/hooks/useAdminOverview";
import { useAdminToken } from "@/features/admin/hooks/useAdminToken";
import { ApiRequestError, errorMessage } from "@/shared/api/client";
import { Notice } from "@/shared/ui/Notice";
import { OverprintLoader } from "@/shared/ui/OverprintLoader";
import { SetupNeeded } from "@/shared/ui/SetupNeeded";

/** The shop owner's view of orders, at /admin. */
export function AdminPage() {
  const { token, signIn, signOut } = useAdminToken();
  const overview = useAdminOverview(token);
  const error = overview.error instanceof ApiRequestError ? overview.error : null;

  if (error?.code === "ADMIN_DISABLED") {
    return (
      <Notice tone="warning" title="The admin page is off">
        Set <code className="font-mono">ADMIN_TOKEN</code> in{" "}
        <code className="font-mono">.env</code> to a random string of at least 16 characters, then
        restart the server.
      </Notice>
    );
  }

  if (error?.code === "NOT_SET_UP") return <SetupNeeded problems={error.body.problems ?? []} />;

  if (token === null || error?.code === "UNAUTHORIZED") {
    const problem =
      error?.code === "UNAUTHORIZED" ? "That token did not work. Check ADMIN_TOKEN in .env." : null;

    return <AdminSignIn problem={problem} onSignIn={signIn} />;
  }

  if (overview.isError) {
    return (
      <Notice tone="warning" title="The orders did not load">
        {errorMessage(overview.error)}
      </Notice>
    );
  }

  if (!overview.data) return <OverprintLoader label="Loading orders" />;

  return (
    <AdminDashboard
      overview={overview.data}
      updatedAt={overview.dataUpdatedAt}
      token={token}
      onSignOut={signOut}
    />
  );
}
