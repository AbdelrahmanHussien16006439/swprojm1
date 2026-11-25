import Link from "next/link";
import { cn } from "@/lib/cn";

/** TravelMate logo: a paper-plane mark + wordmark. `light` = white version for dark backgrounds. */
export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)} aria-label="TravelMate home">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", light ? "bg-white/10" : "bg-navy")}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path d="M2.5 11.2 21 3.5l-6.9 17.6-3.3-6.8-8.3-3.1Z" fill="#ffffff" />
          <path d="m10.8 14.3 3.3 6.8L21 3.5 10.8 14.3Z" fill="#f2643a" />
        </svg>
      </span>
      <span className={cn("text-xl font-extrabold tracking-tight", light ? "text-white" : "text-navy")}>
        Travel<span className="text-accent">Mate</span>
      </span>
    </Link>
  );
}
