'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input, TextArea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function EditProfilePage() {
  const { publicKey } = useWallet();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    avatarUrl: '',
    skills: '',
    college: '',
    location: '',
    websiteUrl: '',
    githubUrl: '',
    linkedinUrl: '',
    twitterUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (publicKey) {
      fetchProfile();
    }
  }, [publicKey]);

  async function fetchProfile() {
    if (!publicKey) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/profiles?wallet=${publicKey.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setFormData({
            name: data.profile.name || '',
            bio: data.profile.bio || '',
            avatarUrl: data.profile.avatar_url || '',
            skills: data.profile.skills?.join(', ') || '',
            college: data.profile.college || '',
            location: data.profile.location || '',
            websiteUrl: data.profile.website_url || '',
            githubUrl: data.profile.github_url || '',
            linkedinUrl: data.profile.linkedin_url || '',
            twitterUrl: data.profile.twitter_url || '',
          });
        }
      }
    } catch (err) {
      console.log('No existing profile found, creating new one');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!publicKey) {
      setError('Please connect your wallet');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          name: formData.name,
          bio: formData.bio,
          avatarUrl: formData.avatarUrl,
          skills: formData.skills
            ? formData.skills.split(',').map(s => s.trim()).filter(s => s)
            : [],
          college: formData.college,
          location: formData.location,
          websiteUrl: formData.websiteUrl,
          githubUrl: formData.githubUrl,
          linkedinUrl: formData.linkedinUrl,
          twitterUrl: formData.twitterUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save profile');
      }

      setSuccess('Profile saved successfully!');

      // Redirect to profile page after 1.5 seconds
      setTimeout(() => {
        router.push(`/profile/${publicKey.toString()}`);
      }, 1500);

    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  if (!publicKey) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center py-12">
          <h2 className="text-2xl font-bold mb-4 text-white">Connect Your Wallet</h2>
          <p className="text-gray-400">
            Please connect your wallet to edit your profile
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight">Edit Profile</h1>
          <Button
            variant="ghost"
            onClick={() => router.push(`/profile/${publicKey.toString()}`)}
          >
            Cancel
          </Button>
        </div>

        <Card className="border-primary/20 shadow-[0_0_50px_rgba(59,130,246,0.1)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading profile...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input
                    label="Name *"
                    required
                    maxLength={100}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your full name"
                  />
                </div>

                <div className="sm:col-span-2">
                  <TextArea
                    label="Bio"
                    rows={4}
                    maxLength={500}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell companies about yourself and your experience..."
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {formData.bio.length} / 500 characters
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Profile Picture
                  </label>
                  <div className="flex items-center space-x-4">
                    {formData.avatarUrl && (
                      <img
                        src={formData.avatarUrl}
                        alt="Preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                      />
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Check file size (max 2MB)
                            if (file.size > 2 * 1024 * 1024) {
                              alert('Image must be less than 2MB');
                              return;
                            }

                            // Convert to base64
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData({ ...formData, avatarUrl: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="block w-full text-sm text-gray-400
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-lg file:border-0
                          file:text-sm file:font-semibold
                          file:bg-primary/10 file:text-primary
                          hover:file:bg-primary/20 file:cursor-pointer
                          cursor-pointer border border-white/10 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Upload an image (max 2MB). JPG, PNG, or GIF.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <Input
                    label="Skills"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    placeholder="e.g., React, Solana, Web3, Design (comma separated)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separate skills with commas
                  </p>
                </div>

                <Input
                  label="College/University"
                  maxLength={200}
                  value={formData.college}
                  onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                  placeholder="e.g., MIT, Stanford"
                />

                <Input
                  label="Location"
                  maxLength={100}
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., San Francisco, CA"
                />
              </div>

              <div className="border-t border-white/10 pt-8">
                <h3 className="text-lg font-semibold text-white mb-6">Social Links</h3>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Input
                    label="🌐 Portfolio Website"
                    type="url"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    placeholder="https://yourwebsite.com"
                  />

                  <Input
                    label="💻 GitHub Profile"
                    type="url"
                    value={formData.githubUrl}
                    onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                    placeholder="https://github.com/yourusername"
                  />

                  <Input
                    label="💼 LinkedIn Profile"
                    type="url"
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/yourusername"
                  />

                  <Input
                    label="🐦 Twitter/X Profile"
                    type="url"
                    value={formData.twitterUrl}
                    onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                    placeholder="https://twitter.com/yourusername"
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h4 className="font-semibold text-primary mb-2">💡 Profile Tips</h4>
                <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                  <li>Add your skills so companies can find you for relevant bounties</li>
                  <li>A good bio helps companies understand your background</li>
                  <li>Link your GitHub to showcase your code</li>
                  <li>Your on-chain reputation updates automatically when you win bounties</li>
                </ul>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-green-400">{success}</p>
                </div>
              )}

              <div className="flex space-x-4 pt-4">
                <Button
                  type="submit"
                  disabled={saving}
                  isLoading={saving}
                  className="w-full sm:w-auto"
                >
                  Save Profile
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/profile/${publicKey.toString()}`)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </div>

              <p className="text-sm text-gray-500 text-center mt-4">
                Your profile is stored off-chain. On-chain reputation (bounties won) updates automatically.
              </p>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}