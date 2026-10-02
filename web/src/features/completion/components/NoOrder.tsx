import { Link } from "react-router";
import { Sheet } from "@/shared/ui/Sheet";

export function NoOrder() {
  return (
    <Sheet offset="ink" className="p-6 md:p-8">
      <h1 className="text-3xl font-extrabold font-stretch-expanded">
        There is no order in this browser
      </h1>
      <p className="mt-2 leading-relaxed text-ink-muted">
        Open this page in the browser you bought in, or start from the shop.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block font-semibold text-sky-ink underline decoration-2 underline-offset-4"
      >
        Go to the shop
      </Link>
    </Sheet>
  );
}
