'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { SystemProgram } from '@solana/web3.js';
import { useProgram, getTreasuryPda, getBountyPda } from '@/hooks/useProgram';
import { LAMPORTS_PER_SOL, BOUNTY_CREATION_FEE } from '@/lib/constants';

export default function CreateBounty() {
  const { publicKey } = useWallet();
  const program = useProgram();
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    skills: '',
    prizeAmount: '',
    deadline: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!publicKey || !program) {
      setError('Please connect your wallet');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const prizeInLamports = parseFloat(formData.prizeAmount) * LAMPORTS_PER_SOL;
      
      // In production: Upload metadata to IPFS/database
      // For now, use a simple hash
      const descriptionHash = `bounty_${Date.now()}_${publicKey.toString().slice(0, 8)}`;
      
      const [treasuryPda] = getTreasuryPda();
      const [bountyPda] = getBountyPda(publicKey, descriptionHash);

      // Convert deadline to timestamp (optional)
      const deadlineTimestamp = formData.deadline 
        ? Math.floor(new Date(formData.deadline).getTime() / 1000)
        : null;

      const tx = await program.methods
        .createBounty(
          descriptionHash,
          prizeInLamports,
          deadlineTimestamp
        )
        .accounts({
          company: publicKey,
          bounty: bountyPda,
          treasury: treasuryPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Bounty created! Transaction:', tx);
      
      // In production: Save metadata to database
      // await saveMetadata(bountyPda, formData);

      alert(`Bounty created successfully!\nTransaction: ${tx}`);
      router.push('/');
    } catch (err: any) {
      console.error('Error creating bounty:', err);
      setError(err.message || 'Failed to create bounty');
    } finally {
      setLoading(false);
    }
  }

  if (!publicKey) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600">
            Please connect your wallet to post a bounty
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Post a Bounty</h1>
        <p className="text-gray-600 mb-8">
          Create a task and offer SOL as a reward
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bounty Title *
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g., Build a landing page for our DeFi protocol"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              required
              rows={6}
              maxLength={5000}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Describe the task, requirements, deliverables, etc."
            />
            <p className="text-sm text-gray-500 mt-1">
              {formData.description.length} / 5000 characters
            </p>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required Skills
            </label>
            <input
              type="text"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g., React, Solidity, Design (comma separated)"
            />
          </div>

          {/* Prize Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prize Amount (SOL) *
            </label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={formData.prizeAmount}
              onChange={(e) => setFormData({ ...formData, prizeAmount: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="10.5"
            />
            <p className="text-sm text-gray-500 mt-1">
              Winner receives 99%, platform takes 1% fee
            </p>
          </div>

          {/* Deadline (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deadline (Optional)
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Fee Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Cost Breakdown</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <div className="flex justify-between">
                <span>Prize amount:</span>
                <span>{formData.prizeAmount || '0'} SOL</span>
              </div>
              <div className="flex justify-between">
                <span>Creation fee:</span>
                <span>{BOUNTY_CREATION_FEE} SOL</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t border-blue-300">
                <span>Total cost:</span>
                <span>
                  {(parseFloat(formData.prizeAmount || '0') + BOUNTY_CREATION_FEE).toFixed(3)} SOL
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Bounty...' : 'Post Bounty'}
          </button>

          <p className="text-sm text-gray-500 text-center">
            Note: Bounties cannot be cancelled once posted. Prize is held in escrow until completion.
          </p>
        </form>
      </div>
    </div>
  );
}