import { cn } from "@/shared/lib/cn";

const STEPS = [
  {
    title: "Choose Pay with Curvy",
    text: "The shop creates your order and signs a one-time payment request for it.",
  },
  {
    title: "Pay on Curvy's checkout page",
    text: "Send the amount from your own wallet. Curvy checks where it came from and delivers it to the shop privately.",
  },
  {
    title: "Come back to the shop",
    text: "The shop confirms the payment on chain before it counts the order as paid.",
  },
];

/** Each step in one of the shop's inks; text stays readable on each. */
const MARKS = ["bg-blue text-sheet", "bg-pink text-ink", "bg-yellow text-ink"];

/** The three steps of a purchase, in order. */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works">
      <h2 id="how-it-works" className="text-2xl font-bold font-stretch-expanded">
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
