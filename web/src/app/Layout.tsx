import { Link, NavLink, Outlet } from "react-router";
import { cn } from "@/shared/lib/cn";

const DOCS_URL = "https://docs.curvy.box/sdk/payments/human-checkout";

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    "font-semibold underline-offset-8",
    isActive ? "underline decoration-pink decoration-4" : "hover:underline",
  );
}

/** Every page: the shop's name, two links, and a footer that says what this is. */
export function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 md:px-8">
      <header className="flex items-center justify-between gap-6 py-6">
        <Link to="/" className="flex items-center gap-3" aria-label="Overprint, back to the shop">
          <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8">
            <circle cx="13" cy="15" r="10" fill="var(--color-blue)" />
            <circle
              cx="19"
              cy="17"
              r="10"
              fill="var(--color-pink)"
              className="mix-blend-multiply"
            />
          </svg>
          <span className="text-2xl font-black tracking-tight font-stretch-expanded">
            Overprint
          </span>
        </Link>

        <nav aria-label="Pages" className="flex gap-6">
          <NavLink to="/" end className={navClass}>
            Shop
          </NavLink>
          <NavLink to="/admin" className={navClass}>
            Orders
          </NavLink>
        </nav>
      </header>

      <main className="flex-1 py-10">
        <Outlet />
      </main>

      <footer className="flex flex-wrap justify-between gap-4 border-t-2 border-ink py-6 text-sm text-ink-muted">
        <p>Overprint is a demo shop for Curvy checkout. Nothing is shipped.</p>
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-blue-ink underline underline-offset-4"
        >
          How Curvy checkout works
        </a>
      </footer>
    </div>
  );
}
