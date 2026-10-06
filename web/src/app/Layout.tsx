import { Link, NavLink, Outlet } from "react-router";
import { cn } from "@/shared/lib/cn";

const DOCS_URL = "https://docs.curvy.box/sdk/payments/human-checkout";

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    "font-semibold underline-offset-8",
    isActive ? "underline decoration-red decoration-4" : "hover:underline",
  );
}

/** The mark: three slabs on a footing, a red sun behind them. */
function Mark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8">
      <circle cx="22" cy="10" r="7" fill="var(--color-red)" />
      <g className="mix-blend-multiply" fill="var(--color-ink)">
        <rect x="7" y="12" width="5" height="12" />
        <rect x="14" y="6" width="5" height="18" />
        <rect x="21" y="14" width="5" height="10" />
        <rect x="3" y="24" width="26" height="4" />
      </g>
    </svg>
  );
}

/** Every page: the shop's name, two links, and a footer that says what this is. */
export function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 md:px-8">
      <header className="flex items-center justify-between gap-6 py-6">
        <Link to="/" className="flex items-center gap-3" aria-label="Brutalism, back to the shop">
          <Mark />
          <span className="text-2xl poster-title">
            Brutalism<span className="font-medium text-ink-muted">.store</span>
          </span>
        </Link>

        {/* The orders page stays at /admin for the shop owner; it is not advertised here. */}
        <nav aria-label="Pages" className="flex gap-6">
          <NavLink to="/" end className={navClass}>
            Shop
          </NavLink>
          <NavLink to="/agents" className={navClass}>
            For agents
          </NavLink>
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline-offset-8 hover:underline"
          >
            How it works
          </a>
        </nav>
      </header>

      <main className="flex-1 py-10">
        <Outlet />
      </main>

      <footer className="flex flex-wrap justify-between gap-4 border-t-2 border-ink py-6 text-sm text-ink-muted">
        <p>
          Brutalism is a demo shop for Curvy checkout. The only thing that ships is a download link.
        </p>
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-sky-ink underline underline-offset-4"
        >
          How Curvy checkout works
        </a>
      </footer>
    </div>
  );
}
