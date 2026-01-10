const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentEscrow", function () {
  let agentEscrow;
  let owner, verifier, payer, payee;

  beforeEach(async function () {
    // Get signers
    [owner, verifier, payer, payee] = await ethers.getSigners();

    // Deploy contract
    const AgentEscrow = await ethers.getContractFactory("AgentEscrow");
    agentEscrow = await AgentEscrow.deploy(verifier.address);
    await agentEscrow.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await agentEscrow.owner()).to.equal(owner.address);
    });

    it("Should set the correct verifier", async function () {
      expect(await agentEscrow.verifier()).to.equal(verifier.address);
    });

    it("Should start with task counter at 0", async function () {
      expect(await agentEscrow.taskCounter()).to.equal(0);
    });
  });

  describe("Task Creation", function () {
    it("Should create a task with correct parameters", async function () {
      const description = "Test task";
      const amount = ethers.parseEther("0.1");

      const tx = await agentEscrow.connect(payer).createTask(
        payee.address,
        description,
        { value: amount }
      );

      await expect(tx)
        .to.emit(agentEscrow, "TaskCreated")
        .withArgs(0, payer.address, payee.address, amount, description);

      const task = await agentEscrow.getTask(0);
      expect(task[0]).to.equal(payer.address); // payer
      expect(task[1]).to.equal(payee.address); // payee
      expect(task[2]).to.equal(amount); // amount
      expect(task[3]).to.equal(description); // description
      expect(task[4]).to.equal(0); // status (Created)
    });

    it("Should revert if no funds are sent", async function () {
      await expect(
        agentEscrow.connect(payer).createTask(payee.address, "Test", { value: 0 })
      ).to.be.revertedWith("Must deposit funds");
    });

    it("Should revert if payee is zero address", async function () {
      await expect(
        agentEscrow.connect(payer).createTask(
          ethers.ZeroAddress,
          "Test",
          { value: ethers.parseEther("0.1") }
        )
      ).to.be.revertedWith("Invalid payee address");
    });

    it("Should revert if payer and payee are the same", async function () {
      await expect(
        agentEscrow.connect(payer).createTask(
          payer.address,
          "Test",
          { value: ethers.parseEther("0.1") }
        )
      ).to.be.revertedWith("Cannot pay yourself");
    });
  });

  describe("Submit Deliverable", function () {
    beforeEach(async function () {
      await agentEscrow.connect(payer).createTask(
        payee.address,
        "Test task",
        { value: ethers.parseEther("0.1") }
      );
    });

    it("Should allow payee to submit deliverable", async function () {
      const deliverableHash = "ipfs://QmTest";

      await expect(
        agentEscrow.connect(payee).submitDeliverable(0, deliverableHash)
      )
        .to.emit(agentEscrow, "TaskSubmitted")
        .withArgs(0, deliverableHash);

      const task = await agentEscrow.getTask(0);
      expect(task[4]).to.equal(1); // status (Submitted)
      expect(task[7]).to.equal(deliverableHash); // deliverableHash
    });

    it("Should revert if non-payee tries to submit", async function () {
      await expect(
        agentEscrow.connect(payer).submitDeliverable(0, "ipfs://QmTest")
      ).to.be.revertedWith("Only payee can submit");
    });

    it("Should revert if deliverable hash is empty", async function () {
      await expect(
        agentEscrow.connect(payee).submitDeliverable(0, "")
      ).to.be.revertedWith("Deliverable hash required");
    });

    it("Should revert if task already submitted", async function () {
      await agentEscrow.connect(payee).submitDeliverable(0, "ipfs://QmTest1");

      await expect(
        agentEscrow.connect(payee).submitDeliverable(0, "ipfs://QmTest2")
      ).to.be.revertedWith("Task not in Created status");
    });
  });

  describe("Score and Resolve", function () {
    beforeEach(async function () {
      await agentEscrow.connect(payer).createTask(
        payee.address,
        "Test task",
        { value: ethers.parseEther("1.0") }
      );
      await agentEscrow.connect(payee).submitDeliverable(0, "ipfs://QmTest");
    });

    it("Should resolve with correct proportional payment", async function () {
      const score = 75; // 75%
      const amount = ethers.parseEther("1.0");
      const expectedPayeeAmount = (amount * BigInt(score)) / BigInt(100);
      const expectedRefundAmount = amount - expectedPayeeAmount;

      const payeeBefore = await ethers.provider.getBalance(payee.address);
      const payerBefore = await ethers.provider.getBalance(payer.address);

      await expect(
        agentEscrow.connect(verifier).scoreAndResolve(0, score)
      )
        .to.emit(agentEscrow, "TaskScored")
        .withArgs(0, score)
        .to.emit(agentEscrow, "TaskResolved")
        .withArgs(0, expectedPayeeAmount, expectedRefundAmount);

      const payeeAfter = await ethers.provider.getBalance(payee.address);
      const payerAfter = await ethers.provider.getBalance(payer.address);

      expect(payeeAfter - payeeBefore).to.equal(expectedPayeeAmount);
      expect(payerAfter - payerBefore).to.equal(expectedRefundAmount);

      const task = await agentEscrow.getTask(0);
      expect(task[4]).to.equal(2); // status (Resolved)
      expect(task[8]).to.equal(score); // score
      expect(task[9]).to.equal(true); // resolved
    });

    it("Should handle 100% score correctly", async function () {
      const score = 100;
      const amount = ethers.parseEther("1.0");

      await expect(
        agentEscrow.connect(verifier).scoreAndResolve(0, score)
      )
        .to.emit(agentEscrow, "TaskResolved")
        .withArgs(0, amount, 0);
    });

    it("Should handle 0% score correctly", async function () {
      const score = 0;
      const amount = ethers.parseEther("1.0");

      await expect(
        agentEscrow.connect(verifier).scoreAndResolve(0, score)
      )
        .to.emit(agentEscrow, "TaskResolved")
        .withArgs(0, 0, amount);
    });

    it("Should revert if non-verifier tries to score", async function () {
      await expect(
        agentEscrow.connect(payer).scoreAndResolve(0, 50)
      ).to.be.revertedWith("Only verifier can call this");
    });

    it("Should revert if score is over 100", async function () {
      await expect(
        agentEscrow.connect(verifier).scoreAndResolve(0, 101)
      ).to.be.revertedWith("Score must be 0-100");
    });

    it("Should revert if task not submitted", async function () {
      await agentEscrow.connect(payer).createTask(
        payee.address,
        "Test task 2",
        { value: ethers.parseEther("0.1") }
      );

      await expect(
        agentEscrow.connect(verifier).scoreAndResolve(1, 50)
      ).to.be.revertedWith("Task not submitted");
    });

    it("Should revert if already resolved", async function () {
      await agentEscrow.connect(verifier).scoreAndResolve(0, 50);

      await expect(
        agentEscrow.connect(verifier).scoreAndResolve(0, 75)
      ).to.be.revertedWith("Task already resolved");
    });
  });

  describe("Cancel Task", function () {
    beforeEach(async function () {
      await agentEscrow.connect(payer).createTask(
        payee.address,
        "Test task",
        { value: ethers.parseEther("0.5") }
      );
    });

    it("Should allow payer to cancel before submission", async function () {
      const payerBefore = await ethers.provider.getBalance(payer.address);
      const amount = ethers.parseEther("0.5");

      const tx = await agentEscrow.connect(payer).cancelTask(0);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      await expect(tx)
        .to.emit(agentEscrow, "TaskCancelled")
        .withArgs(0, amount);

      const payerAfter = await ethers.provider.getBalance(payer.address);
      expect(payerAfter - payerBefore + gasUsed).to.equal(amount);

      const task = await agentEscrow.getTask(0);
      expect(task[4]).to.equal(3); // status (Cancelled)
      expect(task[9]).to.equal(true); // resolved
    });

    it("Should revert if non-payer tries to cancel", async function () {
      await expect(
        agentEscrow.connect(payee).cancelTask(0)
      ).to.be.revertedWith("Only payer can cancel");
    });

    it("Should revert if task already submitted", async function () {
      await agentEscrow.connect(payee).submitDeliverable(0, "ipfs://QmTest");

      await expect(
        agentEscrow.connect(payer).cancelTask(0)
      ).to.be.revertedWith("Can only cancel before submission");
    });
  });

  describe("Update Verifier", function () {
    it("Should allow owner to update verifier", async function () {
      const newVerifier = payee.address;

      await expect(
        agentEscrow.connect(owner).updateVerifier(newVerifier)
      )
        .to.emit(agentEscrow, "VerifierUpdated")
        .withArgs(verifier.address, newVerifier);

      expect(await agentEscrow.verifier()).to.equal(newVerifier);
    });

    it("Should revert if non-owner tries to update", async function () {
      await expect(
        agentEscrow.connect(payer).updateVerifier(payee.address)
      ).to.be.revertedWith("Only owner can call this");
    });

    it("Should revert if new verifier is zero address", async function () {
      await expect(
        agentEscrow.connect(owner).updateVerifier(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid verifier address");
    });
  });
});
