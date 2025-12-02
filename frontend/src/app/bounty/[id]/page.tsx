'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { useProgram, getHunterProfilePda } from '@/hooks/useProgram';
import { BountyWithMetadata } from '@/types';
import { LAMPORTS_PER_SOL } from '@/lib/constants';

export default function BountyDetail() {
  const params = useParams();
  const router = useRouter();
  const { publicKey } = useWallet();
  const program = useProgram();
  
  const [bounty, setBounty] = useState<BountyWithMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectingWinner, setSelectingWinner] = useState(false);
  const [winnerAddress, setWinnerAddress] = useState('');
  const [submissionHash, setSubmissionHash] = useState('');

  useEffect(() => {
    fetchBounty();
  }, [params.id, program]);

  async function fetchBounty() {
    if (!program || !params.id) return;

    try {
      const bountyPubkey = new PublicKey(params.id as string);
      const bountyAccount = await program.account.bounty.fetch(bountyPubkey);

      const bountyWithMetadata: BountyWithMetadata = {
        ...bountyAccount,
        publicKey: bountyPubkey,
        title: `Bounty by ${bountyAccount.company.toString().slice(0, 8)}...`,
        description: bountyAccount.descriptionHash,
        skills: ['Development', 'Design'], // Mock - fetch from DB
        prizeInSol: bountyAccount.prizeAmount / LAMPORTS_PER_SOL,
      };

      setBounty(bountyWithMetadata);
    } catch (error) {
      console.error('Error fetching bounty:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectWinner(e: React.FormEvent) {
    e.preventDefault();
    
    if (!publicKey || !program || !bounty) return;

    setSelectingWinner(true);

    try {
      const winnerPubkey = new PublicKey(winnerAddress);
      const [winnerProfilePda] = getHunterProfilePda(winnerPubkey);

      // Check if hunter profile exists, create if not
      try {
        await program.account.hunterProfile.fetch(winnerProfilePda);
      } catch {
        // Profile doesn't exist, need to create it first
        alert('Winner must create a hunter profile first');
        setSelectingWinner(false);
        return;
      }

      const tx = await program.methods
        .selectWinner(submissionHash || `submission_${Date.now()}`)
        .accounts({
          company: publicKey,
          bounty: bounty.publicKey,
          winner: winnerPubkey,
          winnerProfile: winnerProfilePda,
          treasury: await program.account.treasury.all().then(t => t[0].publicKey),
        })
        .rpc();

      console.log('Winner selected! Transaction:', tx);
      alert(`Winner selected successfully!\nTransaction: ${tx}`);
      
      // Refresh bounty data
      await fetchBounty();
    } catch (err: any) {
      console.error('Error selecting winner:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setSelectingWinner(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading bounty...</p>
        </div>
      </div>
    );
  }

  if (!bounty) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Bounty Not Found</h2>
          <button
            onClick={() => router.push('/')}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition"
          >
            Back to Bounties
          </button>
        </div>
      </div>
    );
  }

  const isCompany = publicKey && publicKey.equals(bounty.company);
  const canSelectWinner = isCompany && !bounty.completed;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <button
        onClick={() => router.push('/')}
        className="text-primary hover:underline mb-6"
      >
        ← Back to all bounties
      </button>

      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{bounty.title}</h1>
            <p className="text-gray-600">
              Posted by: {bounty.company.toString().slice(0, 8)}...{bounty.company.toString().slice(-8)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary mb-2">
              {bounty.prizeInSol} SOL
            </div>
            {bounty.completed ? (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                ✓ Completed
              </span>
            ) : (
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                ● Open
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{bounty.description}</p>
        </div>

        {/* Skills */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Required Skills</h2>
          <div className="flex flex-wrap gap-2">
            {bounty.skills.map((skill) => (
              <span
                key={skill}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-gray-600 text-sm">Created</p>
            <p className="font-semibold">
              {new Date(bounty.createdAt * 1000).toLocaleDateString()}
            </p>
          </div>
          {bounty.deadlineTimestamp && (
            <div>
              <p className="text-gray-600 text-sm">Deadline</p>
              <p className="font-semibold">
                {new Date(bounty.deadlineTimestamp * 1000).toLocaleDateString()}
              </p>
            </div>
          )}
          {bounty.completed && bounty.completedAt && (
            <div>
              <p className="text-gray-600 text-sm">Completed</p>
              <p className="font-semibold">
                {new Date(bounty.completedAt * 1000).toLocaleDateString()}
              </p>
            </div>
          )}
          {bounty.winner && (
            <div>
              <p className="text-gray-600 text-sm">Winner</p>
              <p className="font-semibold text-sm">
                {bounty.winner.toString().slice(0, 8)}...{bounty.winner.toString().slice(-8)}
              </p>
            </div>
          )}
        </div>

        {/* Select Winner Form (Company Only) */}
        {canSelectWinner && (
          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Select Winner</h3>
            <form onSubmit={handleSelectWinner} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Winner's Wallet Address *
                </label>
                <input
                  type="text"
                  required
                  value={winnerAddress}
                  onChange={(e) => setWinnerAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Enter winner's Solana address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Submission Reference (Optional)
                </label>
                <input
                  type="text"
                  value={submissionHash}
                  onChange={(e) => setSubmissionHash(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="IPFS hash or submission ID"
                />
              </div>
              <button
                type="submit"
                disabled={selectingWinner}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-50"
              >
                {selectingWinner ? 'Selecting Winner...' : 'Select Winner & Distribute Prize'}
              </button>
              <p className="text-sm text-gray-600">
                This will send {(bounty.prizeInSol * 0.99).toFixed(2)} SOL to the winner
                and {(bounty.prizeInSol * 0.01).toFixed(4)} SOL platform fee.
              </p>
            </form>
          </div>
        )}

        {/* Already Completed */}
        {bounty.completed && (
          <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              ✓ Bounty Completed
            </h3>
            <p className="text-green-800">
              This bounty has been completed and the prize has been distributed to the winner.
            </p>
          </div>
        )}

        {/* Submit Work (Hunters) */}
        {!isCompany && !bounty.completed && (
          <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Interested in this bounty?</h3>
            <p className="text-gray-700 mb-4">
              Complete the task and submit your work off-chain (via email, GitHub, etc.) to the company.
              The company will review submissions and select a winner on-chain.
            </p>
            <p className="text-sm text-gray-600">
              Company contact: {bounty.company.toString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}