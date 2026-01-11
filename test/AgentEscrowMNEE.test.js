const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("AgentEscrowMNEE", function () {
  // Test constants
  const TASK_AMOUNT = ethers.parseUnits("100", 6); // 100 MNEE
  const SMALL_AMOUNT = ethers.parseUnits("10", 6);  // 10 MNEE
  const ONE_DAY = 24 * 60 * 60;
  const SEVEN_DAYS = 7 * ONE_DAY;

  async function deployFixture() {
    const [owner, payer, payee, verifier, other] = await ethers.getSigners();

    // Deploy Mock MNEE
    const MockMNEE = await ethers.getContractFactory("MockMNEE");
    const mnee = await MockMNEE.deploy();
    await mnee.waitForDeployment();

    // Deploy Escrow
    const AgentEscrow = await ethers.getContractFactory("AgentEscrowMNEE");
    const escrow = await AgentEscrow.deploy(await mnee.getAddress(), owner.address);
    await escrow.waitForDeployment();

    // Setup: Give payer some MNEE and approve escrow
    await mnee.mint(payer.address, ethers.parseUnits("10000", 6));
    await mnee.connect(payer).approve(await escrow.getAddress(), ethers.MaxUint256);

    // Add verifier role
    await escrow.addVerifier(verifier.address);

    return { escrow, mnee, owner, payer, payee, verifier, other };
  }

  // ============ Deployment Tests ============
  describe("Deployment", function () {
    it("Should set the correct MNEE token address", async function () {
      const { escrow, mnee } = await loadFixture(deployFixture);
      expect(await escrow.mneeToken()).to.equal(await mnee.getAddress());
    });

    it("Should grant admin role to deployer", async function () {
      const { escrow, owner } = await loadFixture(deployFixture);
      const ADMIN_ROLE = await escrow.ADMIN_ROLE();
      expect(await escrow.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should set default timeout to 7 days", async function () {
      const { escrow } = await loadFixture(deployFixture);
      expect(await escrow.defaultTimeout()).to.equal(SEVEN_DAYS);
    });
  });

  // ============ Task Creation Tests ============
  describe("Task Creation", function () {
    it("Should create a task successfully", async function () {
      const { escrow, mnee, payer, payee } = await loadFixture(deployFixture);

      const payerBalanceBefore = await mnee.balanceOf(payer.address);

      await expect(escrow.connect(payer).createTask(
        payee.address,
        "Test task description",
        TASK_AMOUNT,
        0 // default timeout
      ))
        .to.emit(escrow, "TaskCreated")
        .withArgs(0, payer.address, payee.address, TASK_AMOUNT, "Test task description", SEVEN_DAYS);

      // Check MNEE transferred
      expect(await mnee.balanceOf(payer.address)).to.equal(payerBalanceBefore - TASK_AMOUNT);
      expect(await mnee.balanceOf(await escrow.getAddress())).to.equal(TASK_AMOUNT);

      // Check task state
      const task = await escrow.getTask(0);
      expect(task.payer).to.equal(payer.address);
      expect(task.payee).to.equal(payee.address);
      expect(task.amount).to.equal(TASK_AMOUNT);
      expect(task.status).to.equal(0); // Created
    });

    it("Should reject zero payee address", async function () {
      const { escrow, payer } = await loadFixture(deployFixture);
      
      await expect(escrow.connect(payer).createTask(
        ethers.ZeroAddress,
        "Test",
        TASK_AMOUNT,
        0
      )).to.be.revertedWithCustomError(escrow, "InvalidPayee");
    });

    it("Should reject self as payee", async function () {
      const { escrow, payer } = await loadFixture(deployFixture);
      
      await expect(escrow.connect(payer).createTask(
        payer.address,
        "Test",
        TASK_AMOUNT,
        0
      )).to.be.revertedWithCustomError(escrow, "InvalidPayee");
    });

    it("Should reject amount below minimum", async function () {
      const { escrow, payer, payee } = await loadFixture(deployFixture);
      
      await expect(escrow.connect(payer).createTask(
        payee.address,
        "Test",
        100, // Too small
        0
      )).to.be.revertedWithCustomError(escrow, "InvalidAmount");
    });

    it("Should reject amount above maximum", async function () {
      const { escrow, payer, payee } = await loadFixture(deployFixture);
      
      await expect(escrow.connect(payer).createTask(
        payee.address,
        "Test",
        ethers.parseUnits("2000000", 6), // 2M MNEE > max
        0
      )).to.be.revertedWithCustomError(escrow, "InvalidAmount");
    });

    it("Should reject empty description", async function () {
      const { escrow, payer, payee } = await loadFixture(deployFixture);
      
      await expect(escrow.connect(payer).createTask(
        payee.address,
        "",
        TASK_AMOUNT,
        0
      )).to.be.revertedWithCustomError(escrow, "EmptyDescription");
    });

    it("Should allow custom timeout", async function () {
      const { escrow, payer, payee } = await loadFixture(deployFixture);
      const customTimeout = 3 * ONE_DAY;

      await escrow.connect(payer).createTask(
        payee.address,
        "Custom timeout task",
        TASK_AMOUNT,
        customTimeout
      );

      const task = await escrow.getTask(0);
      expect(task.timeout).to.equal(customTimeout);
    });
  });

  // ============ Deliverable Submission Tests ============
  describe("Deliverable Submission", function () {
    it("Should submit deliverable successfully", async function () {
      const { escrow, payer, payee } = await loadFixture(deployFixture);

      await escrow.connect(payer).createTask(payee.address, "Test", TASK_AMOUNT, 0);

      const deliverableHash = "ipfs://QmTest123456789";
      
      await expect(escrow.connect(payee).submitDeliverable(0, deliverableHash))
        .to.emit(escrow, "TaskSubmitted")
        .withArgs(0, deliverableHash, await time.latest() + 1);

      const task = await escrow.getTask(0);
      expect(task.deliverableHash).to.equal(deliverableHash);
      expect(task.status).to.equal(1); // Submitted
    });

    it("Should reject submission from non-payee", async function () {
      const { escrow, payer, payee, other } = await loadFixture(deployFixture);

      await escrow.connect(payer).createTask(payee.address, "Test", TASK_AMOUNT, 0);

      await expect(escrow.connect(other).submitDeliverable(0, "ipfs://test"))
        .to.be.revertedWithCustomError(escrow, "NotPayee");
    });

    it("Should reject empty deliverable hash", async function () {
      const { escrow, payer, payee } = await loadFixture(deployFixture);

      await escrow.connect(payer).createTask(payee.address, "Test", TASK_AMOUNT, 0);

      await expect(escrow.connect(payee).submitDeliverable(0, ""))
        .to.be.revertedWithCustomError(escrow, "EmptyDeliverable");
    });

    it("Should reject submission for non-existent task", async function () {
      const { escrow, payee } = await loadFixture(deployFixture);

      await expect(escrow.connect(payee).submitDeliverable(999, "ipfs://test"))
        .to.be.revertedWithCustomError(escrow, "InvalidTaskId");
    });
  });

  // ============ Score and Resolve Tests ============
  describe("Score and Resolve", function () {
    async function createAndSubmitFixture() {
      const fixture = await deployFixture();
      const { escrow, payer, payee } = fixture;

      await escrow.connect(payer).createTask(payee.address, "Test", TASK_AMOUNT, 0);
      await escrow.connect(payee).submitDeliverable(0, "ipfs://QmTest");

      return fixture;
    }

    it("Should resolve with full payment (score 100)", async function () {
      const { escrow, mnee, payer, payee, verifier } = await loadFixture(createAndSubmitFixture);

      const payeeBalanceBefore = await mnee.balanceOf(payee.address);
      const payerBalanceBefore = await mnee.balanceOf(payer.address);

      await expect(escrow.connect(verifier).scoreAndResolve(0, 100))
        .to.emit(escrow, "TaskScored").withArgs(0, 100, verifier.address)
        .to.emit(escrow, "TaskResolved").withArgs(0, TASK_AMOUNT, 0, 100);

      // Payee gets full amount
      expect(await mnee.balanceOf(payee.address)).to.equal(payeeBalanceBefore + TASK_AMOUNT);
      // Payer gets no refund
      expect(await mnee.balanceOf(payer.address)).to.equal(payerBalanceBefore);

      const task = await escrow.getTask(0);
      expect(task.status).to.equal(2); // Resolved
      expect(task.score).to.equal(100);
      expect(task.payeeAmount).to.equal(TASK_AMOUNT);
      expect(task.refundAmount).to.equal(0);
    });

    it("Should resolve with full refund (score 0)", async function () {
      const { escrow, mnee, payer, payee, verifier } = await loadFixture(createAndSubmitFixture);

      const payeeBalanceBefore = await mnee.balanceOf(payee.address);
      const payerBalanceBefore = await mnee.balanceOf(payer.address);

      await expect(escrow.connect(verifier).scoreAndResolve(0, 0))
        .to.emit(escrow, "TaskResolved").withArgs(0, 0, TASK_AMOUNT, 0);

      // Payee gets nothing
      expect(await mnee.balanceOf(payee.address)).to.equal(payeeBalanceBefore);
      // Payer gets full refund
      expect(await mnee.balanceOf(payer.address)).to.equal(payerBalanceBefore + TASK_AMOUNT);
    });

    it("Should resolve with partial payment (score 85)", async function () {
      const { escrow, mnee, payer, payee, verifier } = await loadFixture(createAndSubmitFixture);

      const expectedPayee = (TASK_AMOUNT * 85n) / 100n;
      const expectedRefund = TASK_AMOUNT - expectedPayee;

      const payeeBalanceBefore = await mnee.balanceOf(payee.address);
      const payerBalanceBefore = await mnee.balanceOf(payer.address);

      await escrow.connect(verifier).scoreAndResolve(0, 85);

      expect(await mnee.balanceOf(payee.address)).to.equal(payeeBalanceBefore + expectedPayee);
      expect(await mnee.balanceOf(payer.address)).to.equal(payerBalanceBefore + expectedRefund);
    });

    it("Should reject score above 100", async function () {
      const { escrow, verifier } = await loadFixture(createAndSubmitFixture);

      await expect(escrow.connect(verifier).scoreAndResolve(0, 101))
        .to.be.revertedWithCustomError(escrow, "InvalidScore");
    });

    it("Should reject scoring from non-verifier", async function () {
      const { escrow, other } = await loadFixture(createAndSubmitFixture);

      await expect(escrow.connect(other).scoreAndResolve(0, 85))
        .to.be.reverted; // AccessControl reverts
    });

    it("Should reject scoring unsubmitted task", async function () {
      const { escrow, payer, payee, verifier } = await loadFixture(deployFixture);

      await escrow.connect(payer).createTask(payee.address, "Test", TASK_AMOUNT, 0);

      await expect(escrow.connect(verifier).scoreAndResolve(0, 85))
        .to.be.revertedWithCustomError(escrow, "TaskNotSubmitted");
    });

    it("Should update reputation stats on success", async function () {
      const { escrow, payee, verifier } = await loadFixture(createAndSubmitFixture);

      await escrow.connect(verifier).scoreAndResolve(0, 85);

      const stats = await escrow.getAgentStats(payee.address);
      expect(stats.tasksAsPayee).to.equal(1);
      expect(stats.successfulTasks).to.equal(1); // 85 >= 70 threshold
      expect(stats.earned).to.equal((TASK_AMOUNT * 85n) / 100n);
    });
  });

  // ============ Task Cancellation Tests ============
  describe("Task Cancellation", function () {
    it("Should cancel task before submission", async function () {
      const { escrow, mnee, payer, payee } = await loadFixture(deployFixture);

      await escrow.connect(payer).createTask(payee.address, "Test", TASK_AMOUNT, 0);

      const payerBalanceBefore = await mnee.balanceOf(payer.address);

      await expect(escrow.connect(payer).cancelTask(0, "Changed requirements"))
        .to.emit(escrow, "TaskCancelled")
        .withArgs(0, TASK_AMOUNT, "Changed requirements");

      expect(await mnee.balanceOf(payer.address)).to.equal(payerBalanceBefore + TASK_AMOUNT);

      const task = await escrow.getTask(0);
      expect(task.status).to.equal(3); // Cancelled
    });

    it("Should reject cancellation from non-payer", async function () {
      const { escrow, payer, payee, other } = await loadFixture(deployFixture);

      await escrow.connect(payer).createTask(payee.address, "Test", TASK_AMOUNT, 0);

      await expect(escrow.connect(other).cancelTask(0, "reason"))
        .to.be.revertedWithCustomError(escrow, "NotPayer");
    });

    it("Should reject cancellation after submission", async function () {
      const { escrow, payer, payee } = await loadFixture(deployFixture);

      await escrow.connect(payer).createTask(payee.address, "Test", TASK_AMOUNT, 0);
      await escrow.connect(payee).submitDeliverable(0, "ipfs://test");

      await expect(escrow.connect(payer).cancelTask(0, "reason"))
        .to.be.revertedWithCustomError(escrow, "TaskAlreadySubmitted");
    });
  });

  // ============ Timeout Tests ============
  describe("Timeout Handling", function () {
    it("Should allow claiming timeout after deadline", async function () {
      const { escrow, mnee, payer, payee } = await loadFixture(deployFixture);

      await escrow.connect(payer).createTask(payee.address, "Test", TASK_AMOUNT, ONE_DAY);

      // Advance time past timeout
      await time.increase(ONE_DAY + 1);

      const payerBalanceBefore = await mnee.balanceOf(payer.address);

      await expect(escrow.connect(payer).claimTimeout(0))
        .to.emit(escrow, "TaskTimedOut")
        .withArgs(0, TASK_AMOUNT);

      expect(await mnee.balanceOf(payer.address)).to.equal(payerBalanceBefore + TASK_AMOUNT);
    });

    it("Should reject timeout claim before deadline", async function () {
      const { escrow, payer, payee } = await loadFixture(deployFixture);

      await escrow.connect(payer).createTask(payee.address, "Test", TASK_AMOUNT, ONE_DAY);

      await expect(escrow.connect(payer).claimTimeout(0))
        .to.be.revertedWithCustomError(escrow, "TimeoutNotReached");
    });

    it("Should auto-timeout on late submission attempt", async function () {
      const { escrow, mnee, payer, payee } = await loadFixture(deployFixture);

      await escrow.connect(payer).createTask(payee.address, "Test", TASK_AMOUNT, ONE_DAY);

      // Advance time past timeout
      await time.increase(ONE_DAY + 1);

      const payerBalanceBefore = await mnee.balanceOf(payer.address);

      // Payee tries to submit late
      await escrow.connect(payee).submitDeliverable(0, "ipfs://late");

      // Should have triggered timeout instead
      expect(await mnee.balanceOf(payer.address)).to.equal(payerBalanceBefore + TASK_AMOUNT);

      const task = await escrow.getTask(0);
      expect(task.status).to.equal(4); // TimedOut
    });

    it("Should return correct time until timeout", async function () {
      const { escrow, payer, payee } = await loadFixture(deployFixture);

      await escrow.connect(payer).createTask(payee.address, "Test", TASK_AMOUNT, ONE_DAY);

      const remaining = await escrow.timeUntilTimeout(0);
      expect(remaining).to.be.closeTo(BigInt(ONE_DAY), 5n);
    });
  });

  // ============ Admin Function Tests ============
  describe("Admin Functions", function () {
    it("Should add and remove verifiers", async function () {
      const { escrow, owner, other } = await loadFixture(deployFixture);
      const VERIFIER_ROLE = await escrow.VERIFIER_ROLE();

      await escrow.connect(owner).addVerifier(other.address);
      expect(await escrow.hasRole(VERIFIER_ROLE, other.address)).to.be.true;

      await escrow.connect(owner).removeVerifier(other.address);
      expect(await escrow.hasRole(VERIFIER_ROLE, other.address)).to.be.false;
    });

    it("Should update timeout", async function () {
      const { escrow, owner } = await loadFixture(deployFixture);

      await expect(escrow.connect(owner).setDefaultTimeout(14 * ONE_DAY))
        .to.emit(escrow, "TimeoutUpdated");

      expect(await escrow.defaultTimeout()).to.equal(14 * ONE_DAY);
    });

    it("Should pause and unpause", async function () {
      const { escrow, owner, payer, payee } = await loadFixture(deployFixture);

      await escrow.connect(owner).pause();

      await expect(escrow.connect(payer).createTask(payee.address, "Test", TASK_AMOUNT, 0))
        .to.be.reverted;

      await escrow.connect(owner).unpause();

      await expect(escrow.connect(payer).createTask(payee.address, "Test", TASK_AMOUNT, 0))
        .to.not.be.reverted;
    });
  });

  // ============ Edge Cases and Fuzz-like Tests ============
  describe("Edge Cases", function () {
    it("Should handle minimum valid amount", async function () {
      const { escrow, payer, payee, verifier } = await loadFixture(deployFixture);
      const minAmount = await escrow.minTaskAmount();

      await escrow.connect(payer).createTask(payee.address, "Test", minAmount, 0);
      await escrow.connect(payee).submitDeliverable(0, "ipfs://test");
      await escrow.connect(verifier).scoreAndResolve(0, 50);

      const task = await escrow.getTask(0);
      expect(task.status).to.equal(2); // Resolved
    });

    it("Should handle multiple concurrent tasks", async function () {
      const { escrow, payer, payee, verifier } = await loadFixture(deployFixture);

      // Create 5 tasks
      for (let i = 0; i < 5; i++) {
        await escrow.connect(payer).createTask(payee.address, `Task ${i}`, SMALL_AMOUNT, 0);
      }

      expect(await escrow.taskCount()).to.equal(5);

      // Submit and resolve them with different scores
      const scores = [100, 75, 50, 25, 0];
      for (let i = 0; i < 5; i++) {
        await escrow.connect(payee).submitDeliverable(i, `ipfs://task${i}`);
        await escrow.connect(verifier).scoreAndResolve(i, scores[i]);
      }

      // Verify all resolved
      for (let i = 0; i < 5; i++) {
        const task = await escrow.getTask(i);
        expect(task.status).to.equal(2);
        expect(task.score).to.equal(scores[i]);
      }
    });

    it("Should track reputation across multiple tasks", async function () {
      const { escrow, payer, payee, verifier } = await loadFixture(deployFixture);

      // Complete 3 tasks with varying scores
      for (let i = 0; i < 3; i++) {
        await escrow.connect(payer).createTask(payee.address, `Task ${i}`, TASK_AMOUNT, 0);
        await escrow.connect(payee).submitDeliverable(i, `ipfs://task${i}`);
      }

      await escrow.connect(verifier).scoreAndResolve(0, 90);
      await escrow.connect(verifier).scoreAndResolve(1, 50);
      await escrow.connect(verifier).scoreAndResolve(2, 80);

      const stats = await escrow.getAgentStats(payee.address);
      expect(stats.tasksAsPayee).to.equal(3);
      expect(stats.successfulTasks).to.equal(2); // 90 and 80 >= 70
    });

    // Boundary score tests
    const boundaryScores = [0, 1, 49, 50, 51, 69, 70, 71, 99, 100];
    boundaryScores.forEach(score => {
      it(`Should handle boundary score: ${score}`, async function () {
        const { escrow, payer, payee, verifier } = await loadFixture(deployFixture);

        await escrow.connect(payer).createTask(payee.address, "Test", TASK_AMOUNT, 0);
        await escrow.connect(payee).submitDeliverable(0, "ipfs://test");
        await escrow.connect(verifier).scoreAndResolve(0, score);

        const task = await escrow.getTask(0);
        const expectedPayee = (TASK_AMOUNT * BigInt(score)) / 100n;
        expect(task.payeeAmount).to.equal(expectedPayee);
        expect(task.refundAmount).to.equal(TASK_AMOUNT - expectedPayee);
      });
    });
  });

  // ============ Gas Benchmarks ============
  describe("Gas Benchmarks", function () {
    it("Should report gas for createTask", async function () {
      const { escrow, payer, payee } = await loadFixture(deployFixture);

      const tx = await escrow.connect(payer).createTask(
        payee.address,
        "Benchmark task",
        TASK_AMOUNT,
        0
      );
      const receipt = await tx.wait();
      console.log(`    createTask gas: ${receipt.gasUsed}`);
    });

    it("Should report gas for submitDeliverable", async function () {
      const { escrow, payer, payee } = await loadFixture(deployFixture);

      await escrow.connect(payer).createTask(payee.address, "Test", TASK_AMOUNT, 0);

      const tx = await escrow.connect(payee).submitDeliverable(0, "ipfs://QmBenchmark");
      const receipt = await tx.wait();
      console.log(`    submitDeliverable gas: ${receipt.gasUsed}`);
    });

    it("Should report gas for scoreAndResolve", async function () {
      const { escrow, payer, payee, verifier } = await loadFixture(deployFixture);

      await escrow.connect(payer).createTask(payee.address, "Test", TASK_AMOUNT, 0);
      await escrow.connect(payee).submitDeliverable(0, "ipfs://test");

      const tx = await escrow.connect(verifier).scoreAndResolve(0, 85);
      const receipt = await tx.wait();
      console.log(`    scoreAndResolve gas: ${receipt.gasUsed}`);
    });
  });
});
