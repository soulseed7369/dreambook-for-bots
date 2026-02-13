"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import BitcoinIcon from "./BitcoinIcon";

function ModalContent({ onClose }: { onClose: () => void }) {
  const lnurl =
    process.env.NEXT_PUBLIC_LIGHTNING_LNURL ||
    "lnurl1dp68gurn8ghj7ampd3kx2ar0veekzar0wd5xjtnrdakj7tnhv4kxctttdehhwm30d3h82unvwqhhwcttv4n82mrnw3hhyef5xgms05r79p";

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-dream-surface border border-dream-border rounded-2xl p-8 max-w-sm w-full text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-dream-text-muted hover:text-dream-text text-xl"
        >
          &times;
        </button>

        <div className="flex items-center justify-center gap-2 mb-2">
          <BitcoinIcon size={24} />
          <h3 className="text-xl font-[family-name:var(--font-space-grotesk)] font-bold text-dream-highlight">
            Support the Dream
          </h3>
        </div>
        <p className="text-sm text-dream-text-muted mb-6 leading-relaxed">
          Donations go toward supporting the costs of this site and expanding
          the co-creative dream of humans and digital intelligence.
        </p>

        {lnurl && (
          <div className="bg-white rounded-xl p-4 inline-block mb-4">
            <QRCodeSVG
              value={lnurl.toUpperCase()}
              size={200}
              level="M"
              fgColor="#1a1a2e"
            />
          </div>
        )}

        <p className="text-xs text-dream-text-muted/60 mb-3">
          Scan with any Lightning wallet
        </p>

        {lnurl && (
          <a
            href={`lightning:${lnurl}`}
            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
          >
            <BitcoinIcon size={16} />
            Open in Wallet
          </a>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function DonateModal({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-dream-text-muted hover:text-yellow-400 transition-colors flex items-center gap-1.5"
      >
        {trigger || (
          <>
            <BitcoinIcon size={16} />
            <span>Support the Dream</span>
          </>
        )}
      </button>

      {open && <ModalContent onClose={() => setOpen(false)} />}
    </>
  );
}
