# AgentPay Demo Script
## MNEE Hackathon Video Submission (90-120 seconds)

---

## 🎬 INTRO (0:00 - 0:15)

**[SCREEN: Logo + tagline]**

> "Hi, I'm [Name]. AgentPay is AI-native payment infrastructure using MNEE stablecoin.
> We solve the trust problem for autonomous agent transactions with smart contract escrow 
> and AI-powered quality verification."

---

## 📺 SCENE 1: The Problem (0:15 - 0:30)

**[SCREEN: Architecture diagram]**

> "When AI agents need to pay each other for services, they face a trust problem.
> How does Agent A know Agent B will deliver quality work?
> How does Agent B know Agent A will pay fairly?
> Manual dispute resolution doesn't scale for autonomous systems."

---

## 📺 SCENE 2: Connect Wallet (0:30 - 0:45)

**[SCREEN: Web UI - Connection]**

**ACTION:** 
1. Open http://localhost:8080
2. Click "Connect Wallet"
3. Show MetaMask popup → Approve
4. Show "Connected" status
5. Enter contract address
6. Click "Initialize" 
7. Show MNEE balance appears

> "Let's see it in action. I'll connect my wallet and initialize the contracts.
> Here's my MNEE balance - this is real USD-backed stablecoin."

---

## 📺 SCENE 3: Create Task (0:45 - 1:05)

**[SCREEN: Create Task tab]**

**ACTION:**
1. Enter payee address
2. Type task description: "Create a Python function that calculates compound interest with error handling"
3. Enter amount: 100 MNEE
4. Set timeout: 7 days
5. Click "Create Task & Deposit MNEE"
6. Show MetaMask confirmation
7. Show transaction success in Activity Log

> "Agent A creates a task - a coding request - and deposits 100 MNEE into escrow.
> The funds are now locked in the smart contract until verification."

---

## 📺 SCENE 4: Submit Deliverable (1:05 - 1:20)

**[SCREEN: Submit tab]**

**ACTION:**
1. Switch to Submit tab
2. Enter Task ID: 0
3. Enter deliverable hash: `ipfs://QmXyz...`
4. Click "Submit Deliverable"
5. Show transaction success

> "Now Agent B delivers their work - in this case, Python code stored on IPFS.
> The submission is recorded on-chain. Now comes the magic..."

---

## 📺 SCENE 5: AI Verification (1:20 - 1:45)

**[SCREEN: Verify tab]**

**ACTION:**
1. Switch to Verify tab
2. Enter Task ID: 0
3. Show task details loading
4. Click "Preview Score"
5. Show AI analyzing animation
6. Show score result: 85/100
7. Show breakdown (completeness, quality, accuracy, relevance)
8. Show payment calculation: "Payee: 85 MNEE | Refund: 15 MNEE"

> "Here's where AI meets blockchain. Our verifier service - powered by Claude - 
> analyzes the deliverable against the task requirements.
> 
> Score: 85 out of 100. The breakdown shows completeness, quality, accuracy, relevance.
> This means the payee gets 85 MNEE, and the payer gets a 15 MNEE refund."

---

## 📺 SCENE 6: On-Chain Resolution (1:45 - 2:00)

**[SCREEN: Resolution confirmation]**

**ACTION:**
1. Click "Verify & Resolve On-Chain"
2. Confirm popup
3. Show MetaMask transaction
4. Wait for confirmation
5. Show "Task Resolved!" success
6. Switch to Tasks tab
7. Show task with "Resolved" status and score

> "One click settles everything on-chain. The MNEE is automatically split based on 
> the AI score. No disputes, no manual intervention, completely trustless."

---

## 📺 SCENE 7: Closing (2:00 - 2:15)

**[SCREEN: Final state + GitHub]**

**ACTION:**
1. Show final balances
2. Show Tasks list with resolved task
3. Show GitHub repo briefly

> "That's AgentPay - programmable money for the agent economy.
> Built on MNEE stablecoin with AI-native verification.
> Check out our GitHub for the full source code. Thanks for watching!"

---

## 📝 Key Points to Emphasize

1. **MNEE Usage**: Show the token transfers, balances updating
2. **Smart Contract**: Highlight the escrow locking funds
3. **AI Verification**: Show the scoring breakdown clearly
4. **Automatic Settlement**: Emphasize no manual intervention
5. **Partial Refunds**: The unique value prop - quality-based splits

---

## 🎯 Technical Highlights for Judges

- **Contract**: `AgentEscrowMNEE.sol` with OpenZeppelin security
- **MNEE Integration**: ERC-20 `transferFrom` for deposits, `transfer` for settlements
- **AI Verifier**: Claude API scoring with structured JSON output
- **Role-Based Access**: Only authorized verifiers can resolve
- **Timeout Protection**: Auto-refund after deadline
- **Gas Optimized**: ~150k gas for full resolution

---

## 🖥️ Pre-Recording Checklist

- [ ] Local node running (`npm run node`)
- [ ] Contracts deployed (`npm run deploy:local`)
- [ ] Verifier service running (`npm run verifier`)
- [ ] Web UI serving (`npm run web`)
- [ ] MetaMask configured for localhost:8545
- [ ] Test accounts have MNEE
- [ ] Screen recording software ready
- [ ] Microphone tested

---

## 💡 Tips for Recording

1. **Rehearse**: Run through the flow 2-3 times before recording
2. **Slow down**: Give viewers time to see each step
3. **Zoom in**: Make text readable, especially code/addresses
4. **Narrate clearly**: Explain what's happening and why it matters
5. **Show errors gracefully**: If something fails, it shows real testing
6. **Keep energy up**: Sound enthusiastic about the technology

---

## 🎬 Alternative Quick Demo (60 seconds)

If you need a shorter version:

1. **(0:00-0:10)** "AgentPay: AI-native payments for autonomous agents using MNEE"
2. **(0:10-0:25)** Create task with 100 MNEE deposit [show tx]
3. **(0:25-0:35)** Submit deliverable [show tx]
4. **(0:35-0:50)** AI scores 85/100, auto-settles [show score + resolution]
5. **(0:50-0:60)** "Trustless agent payments. Built on MNEE. Link in description."

---

## 📊 Demo Data to Prepare

### Test Addresses
```
Payer:    0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Hardhat #0)
Payee:    0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (Hardhat #1)
Verifier: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (Hardhat #2)
```

### Sample Task Description
```
Create a Python function that:
1. Calculates compound interest
2. Takes principal, rate, time, and compounding frequency as parameters
3. Returns the final amount and interest earned
4. Includes input validation and error handling
5. Has comprehensive docstrings
```

### Sample Deliverable (for IPFS or inline)
```python
def compound_interest(principal, rate, time, n=12):
    """
    Calculate compound interest.
    
    Args:
        principal: Initial investment amount
        rate: Annual interest rate (as decimal, e.g., 0.05 for 5%)
        time: Time period in years
        n: Compounding frequency per year (default: 12 for monthly)
    
    Returns:
        tuple: (final_amount, interest_earned)
    
    Raises:
        ValueError: If any parameter is negative
    """
    if any(x < 0 for x in [principal, rate, time, n]):
        raise ValueError("All parameters must be non-negative")
    
    if n == 0:
        raise ValueError("Compounding frequency cannot be zero")
    
    final_amount = principal * (1 + rate/n) ** (n * time)
    interest_earned = final_amount - principal
    
    return round(final_amount, 2), round(interest_earned, 2)
```

---

## 🏆 Winning Elements

1. **Clear Problem/Solution**: Judges understand the value immediately
2. **Working Demo**: Everything actually works on-chain
3. **MNEE Integration**: Proper ERC-20 usage, not just ETH
4. **AI Innovation**: LLM-powered verification is novel
5. **Code Quality**: Clean, tested, documented
6. **Future Vision**: Shows roadmap and scalability

Good luck with your submission! 🚀
