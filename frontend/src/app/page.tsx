'use client';

import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import { useProgram, getBountyPda } from '@/hooks/useProgram';
import { BountyWithMetadata } from '@/types';
import { LAMPORTS_PER_SOL } from '@/lib/constants';

export default function Home() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const program = useProgram();
  const [bounties, setBounties] = useState<BountyWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBounties();
  }, [program]);

  async function fetchBounties() {
    if (!program) {
      setLoading(false);
      return;
    }

    try {
      const bountyAccounts = await program.account.bounty.all();
      
      // In production, fetch metadata from IPFS/database
      const bountiesWithMetadata: BountyWithMetadata[] = bountyAccounts.map((account) => ({
        ...account.account,
        publicKey: account.publicKey,
        title: `Bounty by ${account.account.company.toString().slice(0, 8)}...`,
        description: account.account.descriptionHash,
        skills: ['Development', 'Design'], // Mock data - fetch from DB
        prizeInSol: account.account.prizeAmount / LAMPORTS_PER_SOL,
      }));

      setBounties(bountiesWithMetadata);
    } catch (error) {
      console.error('Error fetching bounties:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading bounties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Decentralized Freelance Marketplace
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Post bounties, complete tasks, earn SOL — all on-chain with Solana
        </p>
        {!publicKey && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-yellow-800">
              👆 Connect your wallet to get started
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-3xl font-bold text-primary">{bounties.length}</div>
          <div className="text-gray-600 mt-1">Active Bounties</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-3xl font-bold text-primary">
            {bounties.reduce((sum, b) => sum + b.prizeInSol, 0).toFixed(2)} SOL
          </div>
          <div className="text-gray-600 mt-1">Total Prize Pool</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-3xl font-bold text-primary">
            {bounties.filter(b => b.completed).length}
          </div>
          <div className="text-gray-600 mt-1">Completed</div>
        </div>
      </div>

      {/* Bounty List */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Available Bounties</h2>
          <Link
            href="/create"
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition"
          >
            Post a Bounty
          </Link>
        </div>

        {bounties.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg">No bounties yet. Be the first to post one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bounties.map((bounty) => (
              <Link
                key={bounty.publicKey.toString()}
                href={`/bounty/${bounty.publicKey.toString()}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {bounty.title}
                  </h3>
                  {bounty.completed && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                      Completed
                    </span>
                  )}
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {bounty.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {bounty.skills.slice(0, 3).map((skill) => (
                    <span
                      key={skill}
                      className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-2xl font-bold text-primary">
                    {bounty.prizeInSol} SOL
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(bounty.createdAt * 1000).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}