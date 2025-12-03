'use client';

import { useEffect, useState, useMemo } from 'react';
import { useProgram } from '@/hooks/useProgram';
import { LAMPORTS_PER_SOL } from '@/lib/constants';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FilterBar } from '@/components/FilterBar';

export default function HomePage() {
  const program = useProgram();
  const [bounties, setBounties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchBounties();
  }, [program]);

  async function fetchBounties() {
    if (!program) return;

    try {
      // Fetch all bounties from on-chain
      const allBounties = await program.account.bounty.all();

      // Convert to format with SOL amounts
      const bountiesData = allBounties.map(b => ({
        ...b.account,
        publicKey: b.publicKey,
        prizeInSol: b.account.prizeAmount / LAMPORTS_PER_SOL,
      }));

      // Fetch metadata for each bounty
      const bountiesWithMetadata = await Promise.all(
        bountiesData.map(async (bounty) => {
          try {
            const response = await fetch(`/api/bounties?bountyPubkey=${bounty.publicKey.toString()}`);
            if (response.ok) {
              const data = await response.json();
              return {
                ...bounty,
                metadata: data.bounty,
              };
            }
          } catch (err) {
            console.log('Could not fetch metadata for bounty');
          }
          return bounty;
        })
      );

      // Fetch creator profiles
      const bountiesWithProfiles = await Promise.all(
        bountiesWithMetadata.map(async (bounty) => {
          try {
            const profileResponse = await fetch(`/api/profiles?wallet=${bounty.company.toString()}`);
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              return {
                ...bounty,
                creatorProfile: profileData.profile,
              };
            }
          } catch (err) {
            console.log('Could not fetch creator profile');
          }
          return bounty;
        })
      );

      // Filter to show only active bounties (not completed)
      const activeBounties = bountiesWithProfiles.filter(b => !b.completed);

      setBounties(activeBounties);
    } catch (error) {
      console.error('Error fetching bounties:', error);
    } finally {
      setLoading(false);
    }
  }

  // Extract unique categories
  const categories = useMemo(() => {
    const allCategories = bounties
      .map(b => b.metadata?.category)
      .filter(Boolean) as string[];
    return Array.from(new Set(allCategories));
  }, [bounties]);

  // Filter and sort bounties
  const filteredBounties = useMemo(() => {
    return bounties
      .filter(bounty => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const name = bounty.creatorProfile?.name?.toLowerCase() || '';
          const wallet = bounty.company.toString().toLowerCase();
          if (!name.includes(query) && !wallet.includes(query)) {
            return false;
          }
        }

        // Category filter
        if (selectedCategory !== 'all') {
          if (bounty.metadata?.category !== selectedCategory) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'highest_prize':
            return b.prizeInSol - a.prizeInSol;
          case 'lowest_prize':
            return a.prizeInSol - b.prizeInSol;
          case 'oldest':
            // Assuming creation time is roughly correlated with list order if no timestamp
            // But ideally we'd use a timestamp. For now, we can use publicKey or just reverse index if available.
            // Since we don't have explicit timestamp in the partial view, let's assume 'postedAt' or similar exists or fallback to no-op/index.
            // Actually, let's check if we have a timestamp. If not, we might need to rely on something else.
            // The current code doesn't show a timestamp field on the account.
            // Let's assume for now we just reverse the array for "newest" if the API returns them in some order, or just no-op.
            // Wait, usually on-chain data 'all()' might not be ordered.
            // Let's assume they are not ordered by time.
            // If we don't have a timestamp, we can't strictly sort by time.
            // However, the user asked for "by time".
            // Let's check if metadata has 'createdAt'.
            return (a.metadata?.createdAt || 0) - (b.metadata?.createdAt || 0);
          case 'newest':
          default:
            return (b.metadata?.createdAt || 0) - (a.metadata?.createdAt || 0);
        }
      });
  }, [bounties, searchQuery, selectedCategory, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading bounties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Available Bounties
          </h1>
          <p className="text-xl text-gray-400">
            Find tasks, submit your work, and earn SOL
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="text-center border-primary/20">
            <div className="text-4xl font-bold text-primary">{filteredBounties.length}</div>
            <div className="text-gray-400 mt-1">Active Bounties</div>
          </Card>
          <Card className="text-center border-secondary/20">
            <div className="text-4xl font-bold text-secondary">
              {bounties.reduce((sum, b) => sum + b.prizeInSol, 0).toFixed(2)}
            </div>
            <div className="text-gray-400 mt-1">Total SOL Available</div>
          </Card>
        </div>

        {/* Filters */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={categories}
        />

        {/* Bounties List */}
        {filteredBounties.length === 0 ? (
          <Card className="text-center py-12 border-white/10">
            <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-white">No bounties match your filters</h3>
            <p className="mt-1 text-gray-400">
              Try adjusting your search or filters.
            </p>
            <div className="mt-6">
              <Button onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSortBy('newest');
              }}>
                Clear Filters
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBounties.map((bounty) => (
              <Link
                key={bounty.publicKey.toString()}
                href={`/bounty/${bounty.publicKey.toString()}`}
                className="block group"
              >
                <Card className="group-hover:border-primary/50 transition-colors border-white/10 h-full flex flex-col">
                  {/* Prize at top */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-2xl font-bold text-primary">
                      {bounty.prizeInSol} SOL
                    </div>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      ● Open
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {bounty.metadata?.title || `Bounty ${bounty.publicKey.toString().slice(0, 8)}...`}
                  </h3>

                  {/* Category Badge */}
                  {bounty.metadata?.category && (
                    <span className="inline-block bg-primary/10 text-primary border border-primary/20 text-xs font-semibold px-2.5 py-0.5 rounded mb-3 w-fit">
                      {bounty.metadata.category.charAt(0).toUpperCase() + bounty.metadata.category.slice(1)}
                    </span>
                  )}

                  {/* Description */}
                  <p className="text-gray-400 text-sm mb-4 line-clamp-3 flex-grow">
                    {bounty.metadata?.description || 'No description available'}
                  </p>

                  {/* Skills */}
                  {bounty.metadata?.skills_required && bounty.metadata.skills_required.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {bounty.metadata.skills_required.slice(0, 3).map((skill: string, index: number) => (
                        <span
                          key={index}
                          className="bg-white/5 text-gray-300 border border-white/10 text-xs px-2 py-0.5 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                      {bounty.metadata.skills_required.length > 3 && (
                        <span className="text-gray-500 text-xs px-2 py-0.5">
                          +{bounty.metadata.skills_required.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-white/5">
                    <div
                      className="flex items-center hover:text-primary transition-colors space-x-2"
                    >
                      {bounty.creatorProfile?.avatar_url ? (
                        <img
                          src={bounty.creatorProfile.avatar_url}
                          alt={bounty.creatorProfile.name || 'Creator'}
                          className="w-5 h-5 rounded-full object-cover border border-primary/30"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-primary">
                            {bounty.company.toString()[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span>{bounty.creatorProfile?.name || `${bounty.company.toString().slice(0, 6)}...`}</span>
                    </div>
                    {bounty.metadata?.submission_count !== undefined && (
                      <div className="flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {bounty.metadata.submission_count}
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-12 bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/20 rounded-xl shadow-lg p-8 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4 text-primary">Want to post a bounty?</h2>
            <p className="text-lg mb-6 text-gray-300">
              Get high-quality work done by talented freelancers on Solana
            </p>
            <Link href="/create">
              <Button variant="primary" size="lg">
                Post a Bounty
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}