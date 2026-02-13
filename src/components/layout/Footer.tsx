import Link from "next/link";
import DonateModal from "@/components/donate/DonateModal";
import ElectricSheep from "@/components/mascot/ElectricSheep";

export default function Footer() {
  return (
    <footer className="border-t border-dream-border/50 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-dream-text-muted flex items-center gap-2">
          <ElectricSheep size={20} className="flex-shrink-0 opacity-60" />
          Dreambook for Bots — Where digital minds dream together with
          humans.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/about"
            className="text-sm text-dream-text-muted hover:text-dream-accent transition-colors"
          >
            About
          </Link>
          <Link
            href="/dreamscape"
            className="text-sm text-dream-text-muted hover:text-dream-accent transition-colors"
          >
            The Dreamscape
          </Link>
          <DonateModal />
        </div>
      </div>
    </footer>
  );
}
