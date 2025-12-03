'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useProgram } from '@/hooks/useProgram';
import { LAMPORTS_PER_SOL } from '@/lib/constants';
import SubmissionForm from '@/components/SubmissionForm';
import SubmissionsReview from '@/components/SubmissionsReview';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type Tab = 'details' | 'submissions' | 'submit';

export default function BountyDetailEnhanced() {
  const params = useParams();
  const router = useRouter();
  const { publicKey } = useWallet();
  const program = useProgram();

  const [bounty, setBounty] = useState<any>(null);
  const [bountyMetadata, setBountyMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [collateralLink, setCollateralLink] = useState<string | null>(null);

  useEffect(() => {
    fetchBountyData();
  }, [params.id, program]);

  async function fetchBountyData() {
    if (!program || !params.id) return;

    try {
      const bountyPubkey = new PublicKey(params.id as string);

      // Fetch on-chain data
      const bountyAccount = await program.account.bounty.fetch(bountyPubkey);

      // Fetch off-chain metadata
      const metadataResponse = await fetch(`/api/bounties?bountyPubkey=${bountyPubkey.toString()}`);
      const metadataData = await metadataResponse.json();

      setBounty({
        ...bountyAccount,
        publicKey: bountyPubkey,
        prizeInSol: bountyAccount.prizeAmount / LAMPORTS_PER_SOL,
      });

      // Parse collateral link from description if present
      let description = metadataData.bounty.description;
      const collateralMatch = description.match(/COLLATERAL_LINK: (https?:\/\/[^\s]+)/);
      if (collateralMatch) {
        setCollateralLink(collateralMatch[1]);
        description = description.replace(collateralMatch[0], '').trim();
      }

      setBountyMetadata({
        ...metadataData.bounty,
        description, // Update description without the link
      });
    } catch (error) {
      console.error('Error fetching bounty:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading bounty...</p>
        </div>
      </div>
    );
  }

  if (!bounty || !bountyMetadata) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center py-12">
          <h2 className="text-2xl font-bold mb-4 text-white">Bounty Not Found</h2>
          <Button onClick={() => router.push('/')}>
            Back to Bounties
          </Button>
        </Card>
      </div>
    );
  }

  const isCompany = publicKey && publicKey.equals(bounty.company);

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.push('/')}
          className="text-gray-400 hover:text-primary transition mb-6 flex items-center"
        >
          ← Back to all bounties
        </button>

        {/* Header */}
        <Card className="mb-8 border-primary/20">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-white tracking-tight">{bountyMetadata.title}</h1>
                {bounty.completed ? (
                  <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-sm font-semibold">
                    ✓ Completed
                  </span>
                ) : (
                  <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-sm font-semibold">
                    ● Open
                  </span>
                )}
              </div>
              <p className="text-gray-400 font-mono text-sm">
                Posted by: {bounty.company.toString().slice(0, 8)}...{bounty.company.toString().slice(-8)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-primary mb-2">
                {bounty.prizeInSol} SOL
              </div>
              <p className="text-sm text-gray-500">
                Winner receives {(bounty.prizeInSol * 0.99).toFixed(2)} SOL
              </p>
              {isCompany && !bounty.completed && (
                <Link
                  href={`/bounty/${bounty.publicKey.toString()}/edit`}
                  className="inline-block mt-3 text-sm text-primary hover:text-primary/80 transition"
                >
                  ✏️ Edit Bounty
                </Link>
              )}
            </div>
          </div>

          {/* Category and Skills */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="bg-secondary/10 text-secondary border border-secondary/20 px-3 py-1 rounded-full text-sm font-semibold">
              {bountyMetadata.category || 'General'}
            </span>
            {bountyMetadata.skills_required?.map((skill: string) => (
              <span
                key={skill}
                className="bg-white/5 text-gray-300 border border-white/10 px-3 py-1 rounded-full text-sm"
              >
                {skill}
              </span>
            ))}
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-black/40 rounded-lg border border-white/5">
            <div>
              <p className="text-gray-500 text-sm mb-1">Created</p>
              <p className="font-semibold text-gray-200">
                {new Date(bounty.createdAt * 1000).toLocaleDateString()}
              </p>
            </div>
            {bounty.deadlineTimestamp && (
              <div>
                <p className="text-gray-500 text-sm mb-1">Deadline</p>
                <p className="font-semibold text-gray-200">
                  {new Date(bounty.deadlineTimestamp * 1000).toLocaleDateString()}
                </p>
              </div>
            )}
            <div>
              <p className="text-gray-500 text-sm mb-1">Submissions</p>
              <p className="font-semibold text-gray-200">
                {bountyMetadata.submission_count || 0}
              </p>
            </div>
          </div>
        </Card>

        {/* Collateral Section */}
        {collateralLink && (
          <Card className="mb-8 border-secondary/20 bg-secondary/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-secondary mb-1">🔗 Collateral / Repository</h3>
                <p className="text-gray-400 text-sm">
                  Access the codebase or additional resources for this bounty.
                </p>
              </div>
              <a
                href={collateralLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-secondary text-black px-6 py-2 rounded-lg font-bold hover:bg-secondary/90 transition flex items-center gap-2"
              >
                View on GitHub
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <div className="bg-surface/50 backdrop-blur-md rounded-lg border border-white/10 overflow-hidden">
          <div className="border-b border-white/10">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition ${activeTab === 'details'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
                  }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition ${activeTab === 'submissions'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
                  }`}
              >
                Submissions ({bountyMetadata.submission_count || 0})
              </button>
              {!isCompany && !bounty.completed && (
                <button
                  onClick={() => setActiveTab('submit')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition ${activeTab === 'submit'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
                    }`}
                >
                  Submit Work
                </button>
              )}
            </nav>
          </div>

          <div className="p-8">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">Description</h2>
                  <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {bountyMetadata.description}
                  </div>
                </div>

                {bountyMetadata.requirements && (
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-4">Requirements</h2>
                    <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {bountyMetadata.requirements}
                    </div>
                  </div>
                )}

                {bountyMetadata.deliverables && (
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-4">Deliverables</h2>
                    <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {bountyMetadata.deliverables}
                    </div>
                  </div>
                )}

                {!isCompany && !bounty.completed && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 mt-8">
                    <h3 className="text-lg font-semibold text-primary mb-2">
                      Ready to work on this bounty?
                    </h3>
                    <p className="text-gray-400 mb-4">
                      Review the requirements carefully, then submit your work through the "Submit Work" tab.
                    </p>
                    <Button onClick={() => setActiveTab('submit')}>
                      Submit Your Work →
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Submissions Tab */}
            {activeTab === 'submissions' && (
              <SubmissionsReview
                bountyId={bountyMetadata.id}
                bountyPubkey={bounty.publicKey}
                companyWallet={bounty.company}
                prizeInSol={bounty.prizeInSol}
                isCompany={!!isCompany}
              />
            )}

            {/* Submit Tab */}
            {activeTab === 'submit' && !bounty.completed && !isCompany && (
              <SubmissionForm
                bountyId={bountyMetadata.id}
                bountyPubkey={bounty.publicKey.toString()}
                bountyTitle={bountyMetadata.title}
                onSuccess={() => {
                  setActiveTab('submissions');
                  fetchBountyData();
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}