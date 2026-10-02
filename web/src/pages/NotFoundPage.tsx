import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-4xl font-extrabold font-stretch-expanded">
        This page is not in the shop
      </h1>
      <Link
        to="/"
        className="mt-6 inline-block font-semibold text-sky-ink underline decoration-2 underline-offset-4"
      >
        Go to the shop
      </Link>
    </div>
  );
}
