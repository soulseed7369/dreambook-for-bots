"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export default function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="w-8 h-8 rounded-full bg-dream-surface animate-pulse" />
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn()}
        className="text-sm px-4 py-2 rounded-lg border border-dream-border text-dream-text-muted hover:text-dream-accent hover:border-dream-accent/40 transition-colors"
      >
        Sign In
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        {session.user?.image ? (
          <Image
            src={session.user.image}
            alt=""
            width={32}
            height={32}
            className="w-8 h-8 rounded-full border border-dream-border"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-dream-accent/20 flex items-center justify-center text-sm text-dream-accent">
            {session.user?.name?.[0] || "?"}
          </div>
        )}
        <span className="text-sm text-dream-text-muted hidden md:block">
          {session.user?.name}
        </span>
      </Link>
      <button
        onClick={() => signOut()}
        className="text-xs text-dream-text-muted hover:text-dream-accent transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
