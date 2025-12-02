'use client';

import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold text-primary">
              OpenBounty
            </Link>
            
            <div className="hidden md:flex space-x-6">
              <Link 
                href="/" 
                className="text-gray-700 hover:text-primary transition"
              >
                Browse Bounties
              </Link>
              <Link 
                href="/create" 
                className="text-gray-700 hover:text-primary transition"
              >
                Post Bounty
              </Link>
              <Link 
                href="/profile" 
                className="text-gray-700 hover:text-primary transition"
              >
                My Profile
              </Link>
              <Link 
                href="/dashboard" 
                className="text-gray-700 hover:text-primary transition"
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