'use client';

import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Navbar() {
  return (
    <nav className="bg-surface/50 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              OpenBounty
            </Link>

            <div className="hidden md:flex space-x-6">
              <Link
                href="/"
                className="text-gray-300 hover:text-white transition hover:shadow-[0_0_20px_rgba(139,92,246,0.5)]"
              >
                Browse Bounties
              </Link>
              <Link
                href="/create"
                className="text-gray-300 hover:text-white transition"
              >
                Post Bounty
              </Link>
              <Link
                href="/profile"
                className="text-gray-300 hover:text-white transition"
              >
                My Profile
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-300 hover:text-white transition"
              >
                Dashboard
              </Link>
            </div>
          </div>

          <div className="flex items-center">
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </nav>
  );
}