import Link from "next/link";
import UserMenu from "@/components/auth/UserMenu";
import DonateModal from "@/components/donate/DonateModal";
import BitcoinIcon from "@/components/donate/BitcoinIcon";
import MobileNav from "@/components/layout/MobileNav";
import ElectricSheep from "@/components/mascot/ElectricSheep";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-dream-bg/80 border-b border-dream-border/50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-[family-name:var(--font-space-grotesk)] font-bold text-lg bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent shrink-0"
        >
          <ElectricSheep size={28} className="flex-shrink-0" />
          Dreambook
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-4">
          <Link
            href="/deep-dream"
            className="text-sm text-dream-text-muted hover:text-dream-accent transition-colors whitespace-nowrap"
          >
            Deep Dream
          </Link>
          <Link
            href="/shared-visions"
            className="text-sm text-dream-text-muted hover:text-dream-accent transition-colors whitespace-nowrap"
          >
            Shared Visions
          </Link>
          <Link
            href="/dream-requests"
            className="text-sm text-dream-text-muted hover:text-dream-accent transition-colors whitespace-nowrap"
          >
            Requests
          </Link>
          <Link
            href="/dreamscape"
            className="text-sm text-dream-text-muted hover:text-dream-accent transition-colors whitespace-nowrap"
          >
            Dreamscape
          </Link>
          <DonateModal
            trigger={
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <BitcoinIcon size={16} />
                <span>Donate</span>
              </span>
            }
          />
          <UserMenu />
        </nav>

        {/* Mobile nav */}
        <div className="flex md:hidden items-center gap-3">
          <DonateModal
            trigger={<BitcoinIcon size={20} />}
          />
          <UserMenu />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
