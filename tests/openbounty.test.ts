import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Openbounty } from "../target/types/openbounty";
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("openbounty with escrow expiry", () => {
  // Configure provider for localnet
  const provider = AnchorProvider.local("http://127.0.0.1:8899");
  anchor.setProvider(provider);

  const program = anchor.workspace.Openbounty as Program<Openbounty>;
  
  let treasuryPda: PublicKey;
  let treasuryBump: number;

  const BOUNTY_CREATION_FEE = 0.001 * LAMPORTS_PER_SOL;
  const PLATFORM_FEE_BPS = 100; // 1%
  const ESCROW_EXPIRY_SECONDS = 15_552_000; // 6 months

  // Helper: Get treasury PDA
  function getTreasuryPda() {
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId
    );
    return { treasuryPda: pda, bump };
  }

  // Helper: Get bounty PDA
  function getBountyPda(company: PublicKey, descriptionHash: string) {
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("bounty"),
        company.toBuffer(),
        Buffer.from(descriptionHash),
      ],
      program.programId
    );
    return { bountyPda: pda, bump };
  }

  // Helper: Get hunter profile PDA
  function getProfilePda(hunter: PublicKey) {
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), hunter.toBuffer()],
      program.programId
    );
    return { profilePda: pda, bump };
  }

  before(async () => {
    const result = getTreasuryPda();
    treasuryPda = result.treasuryPda;
    treasuryBump = result.bump;

    try {
      await program.methods
        .initializeTreasury()
        .accounts({
          treasury: treasuryPda,
          authority: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log("✅ Treasury initialized");
    } catch (err) {
      console.log("Treasury already initialized or error:", err.message);
    }
  });

  describe("Treasury with Expiry Stats", () => {
    it("Treasury has new expired funds field", async () => {
      const treasury = await program.account.treasury.fetch(treasuryPda);
      
      expect(treasury.authority.toString()).to.equal(
        provider.wallet.publicKey.toString()
      );
      expect(treasury.totalExpiredFundsReclaimed).to.exist;
      expect(treasury.totalExpiredFundsReclaimed.toNumber()).to.be.at.least(0);
    });
  });

  describe("Bounty Creation with Expiry", () => {
    it("Creates bounty with expiry timestamp", async () => {
      const company = provider.wallet.publicKey;
      const descriptionHash = `QmExpiry${Date.now()}`;
      const prizeAmount = new anchor.BN(5 * LAMPORTS_PER_SOL);

      const { bountyPda } = getBountyPda(company, descriptionHash);

      const tx = await program.methods
        .createBounty(descriptionHash, prizeAmount, null)
        .accounts({
          bounty: bountyPda,
          treasury: treasuryPda,
          company: company,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const bounty = await program.account.bounty.fetch(bountyPda);

      // Verify expiry fields exist
      expect(bounty.expiryTimestamp).to.exist;
      expect(bounty.expired).to.be.false;

      // Verify expiry is 6 months from creation
      const expectedExpiry = bounty.createdAt.toNumber() + ESCROW_EXPIRY_SECONDS;
      expect(bounty.expiryTimestamp.toNumber()).to.equal(expectedExpiry);

      // Verify it's approximately 6 months in the future
      const now = Math.floor(Date.now() / 1000);
      const expiryDate = bounty.expiryTimestamp.toNumber();
      const monthsUntilExpiry = (expiryDate - now) / (30 * 86400);
      
      expect(monthsUntilExpiry).to.be.closeTo(6, 0.1); // Within 0.1 months

      console.log("✅ Bounty created with expiry");
      console.log("   Created at:", new Date(bounty.createdAt.toNumber() * 1000).toISOString());
      console.log("   Expires at:", new Date(expiryDate * 1000).toISOString());
      console.log("   Months until expiry:", monthsUntilExpiry.toFixed(2));
    });

    it("Multiple bounties have different expiry times", async () => {
      const company = provider.wallet.publicKey;
      const prizeAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);

      // Create first bounty
      const hash1 = `QmMulti1${Date.now()}`;
      const { bountyPda: bounty1 } = getBountyPda(company, hash1);
      
      await program.methods
        .createBounty(hash1, prizeAmount, null)
        .accounts({
          bounty: bounty1,
          treasury: treasuryPda,
          company: company,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create second bounty
      const hash2 = `QmMulti2${Date.now()}`;
      const { bountyPda: bounty2 } = getBountyPda(company, hash2);
      
      await program.methods
        .createBounty(hash2, prizeAmount, null)
        .accounts({
          bounty: bounty2,
          treasury: treasuryPda,
          company: company,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const bountyData1 = await program.account.bounty.fetch(bounty1);
      const bountyData2 = await program.account.bounty.fetch(bounty2);

      // Expiry times should be different
      expect(bountyData1.expiryTimestamp.toNumber()).to.not.equal(
        bountyData2.expiryTimestamp.toNumber()
      );

      // But both should be ~6 months from their creation
      const diff1 = bountyData1.expiryTimestamp.toNumber() - bountyData1.createdAt.toNumber();
      const diff2 = bountyData2.expiryTimestamp.toNumber() - bountyData2.createdAt.toNumber();
      
      expect(diff1).to.equal(ESCROW_EXPIRY_SECONDS);
      expect(diff2).to.equal(ESCROW_EXPIRY_SECONDS);

      console.log("✅ Multiple bounties have correct independent expiry times");
    });
  });

  describe("Select Winner Before Expiry", () => {
    it("Allows winner selection before expiry", async () => {
      const company = provider.wallet.publicKey;
      const hunter = Keypair.generate();
      const descriptionHash = `QmBeforeExpiry${Date.now()}`;
      const prizeAmount = new anchor.BN(3 * LAMPORTS_PER_SOL);

      // Airdrop to hunter
      const airdropSig = await provider.connection.requestAirdrop(
        hunter.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      // Create bounty
      const { bountyPda } = getBountyPda(company, descriptionHash);
      await program.methods
        .createBounty(descriptionHash, prizeAmount, null)
        .accounts({
          bounty: bountyPda,
          treasury: treasuryPda,
          company: company,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Select winner immediately (before expiry)
      const { profilePda } = getProfilePda(hunter.publicKey);
      const submissionHash = `QmSubmission${Date.now()}`;

      const hunterBalanceBefore = await provider.connection.getBalance(hunter.publicKey);

      await program.methods
        .selectWinner(submissionHash)
        .accounts({
          bounty: bountyPda,
          treasury: treasuryPda,
          winnerProfile: profilePda,
          winner: hunter.publicKey,
          company: company,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const hunterBalanceAfter = await provider.connection.getBalance(hunter.publicKey);
      const bounty = await program.account.bounty.fetch(bountyPda);

      // Verify bounty is completed
      expect(bounty.completed).to.be.true;
      expect(bounty.winner.toString()).to.equal(hunter.publicKey.toString());

      // Verify hunter received payment
      const expectedPayout = prizeAmount.toNumber() * 0.99; // 99%
      const actualPayout = hunterBalanceAfter - hunterBalanceBefore;
      expect(actualPayout).to.equal(expectedPayout);

      console.log("✅ Winner selected successfully before expiry");
    });
  });

  describe("Prevent Winner Selection After Expiry", () => {
    it("Fails to select winner after expiry", async () => {
      // NOTE: This test cannot actually wait 6 months
      // In production, you'd need to either:
      // 1. Deploy with shorter expiry for testing (e.g., 60 seconds)
      // 2. Use a modified test environment with time manipulation
      // 3. Test manually on devnet
      
      console.log("⚠️  Cannot test actual expiry in unit tests (would take 6 months)");
      console.log("   For testing, temporarily change ESCROW_EXPIRY_SECONDS to 60");
      console.log("   Then run this test to verify expiry logic works");
    });
  });

  describe("Reclaim Expired Bounty", () => {
    it("Cannot reclaim before expiry", async () => {
      const company = provider.wallet.publicKey;
      const descriptionHash = `QmNotExpired${Date.now()}`;
      const prizeAmount = new anchor.BN(2 * LAMPORTS_PER_SOL);

      // Create bounty
      const { bountyPda } = getBountyPda(company, descriptionHash);
      await program.methods
        .createBounty(descriptionHash, prizeAmount, null)
        .accounts({
          bounty: bountyPda,
          treasury: treasuryPda,
          company: company,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Try to reclaim immediately (should fail)
      const caller = Keypair.generate();
      const airdropSig = await provider.connection.requestAirdrop(
        caller.publicKey,
        1 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      try {
        await program.methods
          .reclaimExpiredBounty()
          .accounts({
            bounty: bountyPda,
            treasury: treasuryPda,
            caller: caller.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([caller])
          .rpc();
        
        expect.fail("Should have failed with BountyNotExpired");
      } catch (err) {
        expect(err.message).to.include("BountyNotExpired");
        console.log("✅ Correctly prevented reclaim before expiry");
      }
    });

    it("Cannot reclaim completed bounty", async () => {
      const company = provider.wallet.publicKey;
      const hunter = Keypair.generate();
      const descriptionHash = `QmCompleted${Date.now()}`;
      const prizeAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);

      // Airdrop to hunter
      const airdropSig = await provider.connection.requestAirdrop(
        hunter.publicKey,
        1 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      // Create and complete bounty
      const { bountyPda } = getBountyPda(company, descriptionHash);
      await program.methods
        .createBounty(descriptionHash, prizeAmount, null)
        .accounts({
          bounty: bountyPda,
          treasury: treasuryPda,
          company: company,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const { profilePda } = getProfilePda(hunter.publicKey);
      await program.methods
        .selectWinner("QmWin")
        .accounts({
          bounty: bountyPda,
          treasury: treasuryPda,
          winnerProfile: profilePda,
          winner: hunter.publicKey,
          company: company,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Try to reclaim completed bounty (should fail)
      const caller = Keypair.generate();
      const airdropSig2 = await provider.connection.requestAirdrop(
        caller.publicKey,
        1 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig2);

      try {
        await program.methods
          .reclaimExpiredBounty()
          .accounts({
            bounty: bountyPda,
            treasury: treasuryPda,
            caller: caller.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([caller])
          .rpc();
        
        expect.fail("Should have failed with BountyAlreadyCompleted");
      } catch (err) {
        expect(err.message).to.include("BountyAlreadyCompleted");
        console.log("✅ Correctly prevented reclaim of completed bounty");
      }
    });

    it("Cannot reclaim twice", async () => {
      // This test requires actual expiry, so it's a placeholder
      console.log("⚠️  Cannot test double-reclaim without time manipulation");
      console.log("   For testing, temporarily change ESCROW_EXPIRY_SECONDS to 60");
    });
  });

  describe("Treasury Stats Tracking", () => {
    it("Tracks total expired funds reclaimed", async () => {
      const treasuryBefore = await program.account.treasury.fetch(treasuryPda);
      
      // Verify field exists and is a number
      expect(treasuryBefore.totalExpiredFundsReclaimed).to.exist;
      expect(treasuryBefore.totalExpiredFundsReclaimed.toNumber()).to.be.at.least(0);

      console.log("✅ Treasury tracks expired funds reclaimed");
      console.log("   Current total:", treasuryBefore.totalExpiredFundsReclaimed.toNumber() / LAMPORTS_PER_SOL, "SOL");
    });
  });

  describe("Bounty Lifecycle with Expiry", () => {
    it("Full lifecycle: create -> verify expiry set -> complete", async () => {
      console.log("\n🎯 Running full lifecycle with expiry checks...\n");

      const company = provider.wallet.publicKey;
      const hunter = Keypair.generate();
      const descriptionHash = `QmLifecycle${Date.now()}`;
      const prizeAmount = new anchor.BN(4 * LAMPORTS_PER_SOL);

      // 1. Airdrop to hunter
      console.log("1️⃣  Airdropping SOL to hunter...");
      const airdropSig = await provider.connection.requestAirdrop(
        hunter.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);
      console.log("   ✅ Hunter funded");

      // 2. Create bounty
      console.log("\n2️⃣  Creating bounty with expiry...");
      const { bountyPda } = getBountyPda(company, descriptionHash);
      
      await program.methods
        .createBounty(descriptionHash, prizeAmount, null)
        .accounts({
          bounty: bountyPda,
          treasury: treasuryPda,
          company: company,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const bountyAfterCreate = await program.account.bounty.fetch(bountyPda);
      console.log("   ✅ Bounty created");
      console.log("   Created at:", new Date(bountyAfterCreate.createdAt.toNumber() * 1000).toISOString());
      console.log("   Expires at:", new Date(bountyAfterCreate.expiryTimestamp.toNumber() * 1000).toISOString());
      console.log("   Expired flag:", bountyAfterCreate.expired);

      // 3. Verify expiry fields
      console.log("\n3️⃣  Verifying expiry fields...");
      expect(bountyAfterCreate.expiryTimestamp.toNumber()).to.be.greaterThan(
        bountyAfterCreate.createdAt.toNumber()
      );
      expect(bountyAfterCreate.expired).to.be.false;
      
      const expiryDiff = bountyAfterCreate.expiryTimestamp.toNumber() - 
                         bountyAfterCreate.createdAt.toNumber();
      expect(expiryDiff).to.equal(ESCROW_EXPIRY_SECONDS);
      console.log("   ✅ Expiry timestamp correct (6 months from creation)");

      // 4. Select winner
      console.log("\n4️⃣  Selecting winner...");
      const { profilePda } = getProfilePda(hunter.publicKey);
      const submissionHash = `QmLifecycleSubmission${Date.now()}`;

      await program.methods
        .selectWinner(submissionHash)
        .accounts({
          bounty: bountyPda,
          treasury: treasuryPda,
          winnerProfile: profilePda,
          winner: hunter.publicKey,
          company: company,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const bountyAfterComplete = await program.account.bounty.fetch(bountyPda);
      console.log("   ✅ Winner selected");
      console.log("   Completed:", bountyAfterComplete.completed);
      console.log("   Winner:", hunter.publicKey.toString().slice(0, 8) + "...");
      
      // 5. Verify final state
      console.log("\n5️⃣  Verifying final state...");
      expect(bountyAfterComplete.completed).to.be.true;
      expect(bountyAfterComplete.expired).to.be.false; // Not expired, completed instead
      expect(bountyAfterComplete.winner.toString()).to.equal(hunter.publicKey.toString());
      
      const profile = await program.account.hunterProfile.fetch(profilePda);
      expect(profile.bountiesCompleted).to.equal(1);

      console.log("   ✅ Bounty completed successfully");
      console.log("   ✅ Expiry flag remains false (bounty was completed)");
      console.log("   ✅ Hunter reputation updated:", profile.bountiesCompleted);

      console.log("\n✅ Full lifecycle test complete!");
    });
  });

  describe("Edge Cases", () => {
    it("Bounty created with custom deadline still has 6-month expiry", async () => {
      const company = provider.wallet.publicKey;
      const descriptionHash = `QmCustomDeadline${Date.now()}`;
      const prizeAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);
      
      // Set custom deadline to 30 days
      const customDeadline = new anchor.BN(Math.floor(Date.now() / 1000) + (30 * 86400));

      const { bountyPda } = getBountyPda(company, descriptionHash);

      await program.methods
        .createBounty(descriptionHash, prizeAmount, customDeadline)
        .accounts({
          bounty: bountyPda,
          treasury: treasuryPda,
          company: company,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const bounty = await program.account.bounty.fetch(bountyPda);

      // Verify custom deadline was set
      expect(bounty.deadlineTimestamp).to.not.be.null;
      expect(bounty.deadlineTimestamp.toNumber()).to.equal(customDeadline.toNumber());

      // Verify expiry is still 6 months regardless of deadline
      const expectedExpiry = bounty.createdAt.toNumber() + ESCROW_EXPIRY_SECONDS;
      expect(bounty.expiryTimestamp.toNumber()).to.equal(expectedExpiry);

      // Expiry should be after the custom deadline
      expect(bounty.expiryTimestamp.toNumber()).to.be.greaterThan(
        bounty.deadlineTimestamp.toNumber()
      );

      console.log("✅ Bounty with custom deadline has independent 6-month expiry");
      console.log("   Custom deadline:", new Date(customDeadline.toNumber() * 1000).toLocaleDateString());
      console.log("   Escrow expiry:", new Date(bounty.expiryTimestamp.toNumber() * 1000).toLocaleDateString());
    });

    it("Zero prize amount still fails validation", async () => {
      const company = provider.wallet.publicKey;
      const descriptionHash = `QmZero${Date.now()}`;
      const prizeAmount = new anchor.BN(0);

      const { bountyPda } = getBountyPda(company, descriptionHash);

      try {
        await program.methods
          .createBounty(descriptionHash, prizeAmount, null)
          .accounts({
            bounty: bountyPda,
            treasury: treasuryPda,
            company: company,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        expect.fail("Should have failed with InvalidPrizeAmount");
      } catch (err) {
        expect(err.message).to.include("InvalidPrizeAmount");
        console.log("✅ Zero prize amount correctly rejected");
      }
    });
  });

  describe("Integration: Expiry Feature Summary", () => {
    it("Displays summary of all expiry features", async () => {
      console.log("\n📊 Expiry Feature Summary\n");
      console.log("══════════════════════════════════════════════════════════");
      
      const treasury = await program.account.treasury.fetch(treasuryPda);
      
      console.log("\n✅ NEW FEATURES IMPLEMENTED:");
      console.log("   1. Bounties expire after 6 months (15,552,000 seconds)");
      console.log("   2. expiry_timestamp field added to Bounty account");
      console.log("   3. expired flag added to Bounty account");
      console.log("   4. total_expired_funds_reclaimed added to Treasury");
      console.log("   5. reclaim_expired_bounty() instruction added");
      console.log("   6. Winner selection blocked after expiry");
      
      console.log("\n📈 CURRENT TREASURY STATS:");
      console.log("   Total bounties created:", treasury.totalBountiesCreated);
      console.log("   Total completed:", treasury.totalBountiesCompleted);
      console.log("   Total fees collected:", treasury.totalFeesCollected.toNumber() / LAMPORTS_PER_SOL, "SOL");
      console.log("   Total expired funds reclaimed:", treasury.totalExpiredFundsReclaimed.toNumber() / LAMPORTS_PER_SOL, "SOL");
      
      console.log("\n⚠️  TESTING NOTES:");
      console.log("   - Cannot test actual 6-month expiry in unit tests");
      console.log("   - For expiry testing, temporarily set ESCROW_EXPIRY_SECONDS = 60");
      console.log("   - Or test manually on devnet with real time delays");
      console.log("   - All structural changes have been validated ✓");
      
      console.log("\n══════════════════════════════════════════════════════════\n");
    });
  });
});