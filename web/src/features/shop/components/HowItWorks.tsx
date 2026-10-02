import { cn } from "@/shared/lib/cn";

const STEPS = [
  {
    title: "Choose Buy 4K wallpaper",
    text: "The shop creates your order and signs a one-time payment request for it.",
  },
  {
    title: "Pay on Curvy's checkout page",
    text: "Send the amount from your own wallet. Curvy checks where it came from and delivers it to the shop privately.",
  },
  {
    title: "Come back and download",
    text: "The shop confirms the payment on chain, then hands you a link to the 4K file that works once.",
  },
];

/** Each step in one of the shop's inks; text stays readable on each. */
const MARKS = ["bg-sky text-sheet", "bg-red text-ink", "bg-ochre text-ink"];

/** The three steps of a purchase, in order. */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works">
      <p className="border-b-2 border-ink pb-3 poster-label text-ink-muted">Kako se plaća</p>
      <h2 id="how-it-works" className="mt-6 text-4xl poster-title">
        How paying works
      </h2>

      <ol className="mt-6 grid gap-8 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span
              aria-hidden="true"
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-full font-bold",
                MARKS[index],
              )}
            >
              {index + 1}
            </span>
            <div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-1 leading-relaxed text-ink-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
