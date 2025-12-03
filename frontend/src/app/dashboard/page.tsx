'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';
import Link from 'next/link';
import { LAMPORTS_PER_SOL } from '@/lib/constants';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const { publicKey } = useWallet();
  const program = useProgram();

  const [myBounties, setMyBounties] = useState<any[]>([]);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bounties' | 'submissions'>('bounties');

  useEffect(() => {
    if (publicKey) {
      fetchData();
    }
  }, [publicKey, program]);

  async function fetchData() {
    if (!publicKey || !program) return;

    setLoading(true);
    try {
      // Fetch all bounties created by this wallet
      const allBounties = await program.account.bounty.all();
      const myBountiesData = allBounties
        .filter(b => b.account.company.toString() === publicKey.toString())
        .map(b => ({
          ...b.account,
          publicKey: b.publicKey,
          prizeInSol: b.account.prizeAmount / LAMPORTS_PER_SOL,
        }));

      setMyBounties(myBountiesData);

      // Fetch metadata for each bounty
      const bountiesWithMetadata = await Promise.all(
        myBountiesData.map(async (bounty) => {
          try {
            const response = await fetch(`/api/bounties?bountyPubkey=${bounty.publicKey.toString()}`);
            if (response.ok) {
              const data = await response.json();
              return { ...bounty, metadata: data.bounty };
            }
          } catch (err) {
            console.log('Could not fetch metadata for bounty');
          }
          return bounty;
        })
      );

      setMyBounties(bountiesWithMetadata);

      // Fetch submissions made by this wallet
      try {
        const submissionsResponse = await fetch(`/api/submissions?hunterWallet=${publicKey.toString()}`);
        if (submissionsResponse.ok) {
          const submissionsData = await submissionsResponse.json();
          setMySubmissions(submissionsData.submissions || []);
        }
      } catch (err) {
        console.log('Could not fetch submissions');
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!publicKey) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-6xl mx-auto">
          <Card className="text-center py-12 border-white/10">
            <h2 className="text-2xl font-bold mb-4 text-white">Connect Your Wallet</h2>
            <p className="text-gray-400">
              Please connect your wallet to view your dashboard
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = {
    totalBounties: myBounties.length,
    activeBounties: myBounties.filter(b => !b.completed).length,
    completedBounties: myBounties.filter(b => b.completed).length,
    totalSpent: myBounties.reduce((sum, b) => sum + b.prizeInSol, 0),
    totalSubmissions: mySubmissions.length,
    acceptedSubmissions: mySubmissions.filter(s => s.status === 'accepted').length,
    pendingSubmissions: mySubmissions.filter(s => s.status === 'pending').length,
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">Dashboard</h1>
          <Link href="/create">
            <Button variant="primary" size="lg">
              + Post New Bounty
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="text-center border-primary/20">
            <div className="text-3xl font-bold text-primary">{stats.totalBounties}</div>
            <div className="text-gray-400 mt-1">Total Bounties</div>
          </Card>
          <Card className="text-center border-secondary/20">
            <div className="text-3xl font-bold text-secondary">{stats.activeBounties}</div>
            <div className="text-gray-400 mt-1">Active</div>
          </Card>
          <Card className="text-center border-primary/20">
            <div className="text-3xl font-bold text-primary">{stats.completedBounties}</div>
            <div className="text-gray-400 mt-1">Completed</div>
          </Card>
          <Card className="text-center border-secondary/20">
            <div className="text-3xl font-bold text-secondary">{stats.totalSpent.toFixed(2)}</div>
            <div className="text-gray-400 mt-1">Total SOL Spent</div>
          </Card>
        </div>

        {/* Tabs */}
        <Card className="border-white/10 overflow-hidden">
          <div className="border-b border-white/10">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('bounties')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition ${activeTab === 'bounties'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-white/20'
                  }`}
              >
                My Bounties ({stats.totalBounties})
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition ${activeTab === 'submissions'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-white/20'
                  }`}
              >
                My Submissions ({stats.totalSubmissions})
              </button>
            </nav>
          </div>

          <div className="p-8">
            {/* My Bounties Tab */}
            {activeTab === 'bounties' && (
              <div>
                {myBounties.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-white">No bounties yet</h3>
                    <p className="mt-1 text-gray-400">
                      Get started by posting your first bounty!
                    </p>
                    <div className="mt-6">
                      <Link href="/create">
                        <Button>Post a Bounty</Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myBounties.map((bounty) => (
                      <Link
                        key={bounty.publicKey.toString()}
                        href={`/bounty/${bounty.publicKey.toString()}`}
                        className="block"
                      >
                        <Card className="border-white/10 hover:border-primary/50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-semibold text-white">
                                  {bounty.metadata?.title || `Bounty ${bounty.publicKey.toString().slice(0, 8)}...`}
                                </h3>
                                {bounty.completed ? (
                                  <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-sm font-semibold">
                                    ✓ Completed
                                  </span>
                                ) : (
                                  <span className="bg-secondary/10 text-secondary border border-secondary/20 px-3 py-1 rounded-full text-sm font-semibold">
                                    ● Open
                                  </span>
                                )}
                              </div>

                              {bounty.metadata?.description && (
                                <p className="text-gray-400 mb-3 line-clamp-2">
                                  {bounty.metadata.description}
                                </p>
                              )}

                              <div className="flex items-center space-x-6 text-sm text-gray-500">
                                <div>
                                  <span className="font-medium">Prize:</span>{' '}
                                  <span className="text-primary font-semibold">{bounty.prizeInSol} SOL</span>
                                </div>
                                <div>
                                  <span className="font-medium">Created:</span>{' '}
                                  {new Date(bounty.createdAt * 1000).toLocaleDateString()}
                                </div>
                                {bounty.metadata?.submission_count !== undefined && (
                                  <div>
                                    <span className="font-medium">Submissions:</span>{' '}
                                    <span className="text-primary font-semibold">
                                      {bounty.metadata.submission_count}
                                    </span>
                                  </div>
                                )}
                                {bounty.completed && bounty.winner && (
                                  <div>
                                    <span className="font-medium">Winner:</span>{' '}
                                    {bounty.winner.toString().slice(0, 8)}...
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="ml-4">
                              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* My Submissions Tab */}
            {activeTab === 'submissions' && (
              <div>
                {mySubmissions.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-white">No submissions yet</h3>
                    <p className="mt-1 text-gray-400">
                      Browse bounties and submit your work to get started!
                    </p>
                    <div className="mt-6">
                      <Link href="/">
                        <Button>Browse Bounties</Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <Card className="text-center border-yellow-500/20 bg-yellow-500/5">
                        <div className="text-2xl font-bold text-yellow-500">{stats.pendingSubmissions}</div>
                        <div className="text-sm text-yellow-400">Pending Review</div>
                      </Card>
                      <Card className="text-center border-primary/20 bg-primary/5">
                        <div className="text-2xl font-bold text-primary">{stats.acceptedSubmissions}</div>
                        <div className="text-sm text-primary">Won</div>
                      </Card>
                      <Card className="text-center border-white/10">
                        <div className="text-2xl font-bold text-white">
                          {stats.totalSubmissions > 0
                            ? Math.round((stats.acceptedSubmissions / stats.totalSubmissions) * 100)
                            : 0}%
                        </div>
                        <div className="text-sm text-gray-400">Win Rate</div>
                      </Card>
                    </div>

                    {mySubmissions.map((submission) => (
                      <Card
                        key={submission.id}
                        className="border-white/10"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-2">
                              Submission
                            </h3>
                            <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                              {submission.description}
                            </p>
                            <div className="flex items-center space-x-4 text-sm">
                              {submission.github_url && (
                                <a
                                  href={submission.github_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  🔗 Code
                                </a>
                              )}
                              {submission.demo_url && (
                                <a
                                  href={submission.demo_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  🌐 Demo
                                </a>
                              )}
                              <span className="text-gray-500">
                                {new Date(submission.submitted_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ml-4 ${submission.status === 'accepted'
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : submission.status === 'rejected'
                                  ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                  : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                              }`}
                          >
                            {submission.status === 'accepted' ? '✓ Won' :
                              submission.status === 'rejected' ? 'Not Selected' :
                                'Pending'}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}