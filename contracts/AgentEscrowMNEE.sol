// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AgentEscrowMNEE
 * @notice AI-native payment escrow system using MNEE stablecoin
 * @dev Enables trustless payments between autonomous agents with AI-powered verification
 * 
 * Key Features:
 * - MNEE (ERC-20) stablecoin support for agent-to-agent payments
 * - AI verifier scoring (0-100) with automatic partial/full refunds
 * - Time-locked refunds with configurable timeout
 * - Role-based access control for verifiers
 * - Reentrancy protection and pausability
 * 
 * Flow:
 * 1. Payer creates task with MNEE deposit
 * 2. Payee submits deliverable (IPFS hash)
 * 3. AI Verifier scores output (0-100)
 * 4. Contract auto-settles: (score/100)*amount to payee, remainder refunded
 */
contract AgentEscrowMNEE is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Roles ============
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // ============ State ============
    IERC20 public immutable mneeToken;
    
    // Configuration
    uint256 public defaultTimeout = 7 days;
    uint256 public minTaskAmount = 1e6; // 1 MNEE (6 decimals)
    uint256 public maxTaskAmount = 1e12; // 1M MNEE
    uint8 public constant MIN_SCORE = 0;
    uint8 public constant MAX_SCORE = 100;

    // Task states
    enum TaskStatus { Created, Submitted, Resolved, Cancelled, TimedOut }

    struct Task {
        address payer;
        address payee;
        uint256 amount;
        string description;
        string deliverableHash;
        uint8 score;
        TaskStatus status;
        uint256 createdAt;
        uint256 submittedAt;
        uint256 timeout;
        uint256 payeeAmount;
        uint256 refundAmount;
    }

    mapping(uint256 => Task) public tasks;
    uint256 public taskCount;

    // Reputation tracking (for future use)
    mapping(address => uint256) public payerTaskCount;
    mapping(address => uint256) public payeeTaskCount;
    mapping(address => uint256) public payeeSuccessCount;
    mapping(address => uint256) public totalEarned;
    mapping(address => uint256) public totalSpent;

    // ============ Events ============
    event TaskCreated(
        uint256 indexed taskId,
        address indexed payer,
        address indexed payee,
        uint256 amount,
        string description,
        uint256 timeout
    );
    
    event TaskSubmitted(
        uint256 indexed taskId,
        string deliverableHash,
        uint256 submittedAt
    );
    
    event TaskScored(
        uint256 indexed taskId,
        uint8 score,
        address indexed verifier
    );
    
    event TaskResolved(
        uint256 indexed taskId,
        uint256 payeeAmount,
        uint256 refundAmount,
        uint8 score
    );
    
    event TaskCancelled(
        uint256 indexed taskId,
        uint256 refundAmount,
        string reason
    );
    
    event TaskTimedOut(
        uint256 indexed taskId,
        uint256 refundAmount
    );

    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    event TimeoutUpdated(uint256 oldTimeout, uint256 newTimeout);

    // ============ Errors ============
    error InvalidPayee();
    error InvalidAmount();
    error InvalidScore();
    error InvalidTaskId();
    error InvalidStatus();
    error NotPayer();
    error NotPayee();
    error TaskNotSubmitted();
    error TaskAlreadySubmitted();
    error TaskAlreadyResolved();
    error TimeoutNotReached();
    error InsufficientAllowance();
    error EmptyDeliverable();
    error EmptyDescription();

    // ============ Constructor ============
    constructor(address _mneeToken, address _admin) {
        require(_mneeToken != address(0), "Invalid token address");
        require(_admin != address(0), "Invalid admin address");
        
        mneeToken = IERC20(_mneeToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(VERIFIER_ROLE, _admin);
    }

    // ============ Core Functions ============

    /**
     * @notice Create a new task with MNEE deposit
     * @param _payee Address to receive payment on successful completion
     * @param _description Task description (stored on-chain for transparency)
     * @param _amount Amount of MNEE to escrow
     * @param _customTimeout Custom timeout in seconds (0 for default)
     * @return taskId The ID of the created task
     */
    function createTask(
        address _payee,
        string calldata _description,
        uint256 _amount,
        uint256 _customTimeout
    ) external whenNotPaused nonReentrant returns (uint256 taskId) {
        // Validations
        if (_payee == address(0) || _payee == msg.sender) revert InvalidPayee();
        if (_amount < minTaskAmount || _amount > maxTaskAmount) revert InvalidAmount();
        if (bytes(_description).length == 0) revert EmptyDescription();

        // Check allowance
        if (mneeToken.allowance(msg.sender, address(this)) < _amount) {
            revert InsufficientAllowance();
        }

        // Transfer MNEE to escrow
        mneeToken.safeTransferFrom(msg.sender, address(this), _amount);

        // Create task
        taskId = taskCount++;
        uint256 timeout = _customTimeout > 0 ? _customTimeout : defaultTimeout;
        
        tasks[taskId] = Task({
            payer: msg.sender,
            payee: _payee,
            amount: _amount,
            description: _description,
            deliverableHash: "",
            score: 0,
            status: TaskStatus.Created,
            createdAt: block.timestamp,
            submittedAt: 0,
            timeout: timeout,
            payeeAmount: 0,
            refundAmount: 0
        });

        // Update stats
        payerTaskCount[msg.sender]++;
        payeeTaskCount[_payee]++;

        emit TaskCreated(taskId, msg.sender, _payee, _amount, _description, timeout);
    }

    /**
     * @notice Submit deliverable for a task
     * @param _taskId The task ID
     * @param _deliverableHash IPFS hash or URI of the deliverable
     */
    function submitDeliverable(
        uint256 _taskId,
        string calldata _deliverableHash
    ) external whenNotPaused nonReentrant {
        if (_taskId >= taskCount) revert InvalidTaskId();
        
        Task storage task = tasks[_taskId];
        
        if (msg.sender != task.payee) revert NotPayee();
        if (task.status != TaskStatus.Created) revert InvalidStatus();
        if (bytes(_deliverableHash).length == 0) revert EmptyDeliverable();

        // Check if timed out before submission
        if (block.timestamp > task.createdAt + task.timeout) {
            _handleTimeout(_taskId);
            return;
        }

        task.deliverableHash = _deliverableHash;
        task.status = TaskStatus.Submitted;
        task.submittedAt = block.timestamp;

        emit TaskSubmitted(_taskId, _deliverableHash, block.timestamp);
    }

    /**
     * @notice Score and resolve a task (verifier only)
     * @param _taskId The task ID
     * @param _score Quality score (0-100)
     */
    function scoreAndResolve(
        uint256 _taskId,
        uint8 _score
    ) external whenNotPaused nonReentrant onlyRole(VERIFIER_ROLE) {
        if (_taskId >= taskCount) revert InvalidTaskId();
        if (_score > MAX_SCORE) revert InvalidScore();
        
        Task storage task = tasks[_taskId];
        
        if (task.status != TaskStatus.Submitted) revert TaskNotSubmitted();

        task.score = _score;
        emit TaskScored(_taskId, _score, msg.sender);

        // Calculate splits
        uint256 payeeAmount = (task.amount * _score) / 100;
        uint256 refundAmount = task.amount - payeeAmount;

        task.payeeAmount = payeeAmount;
        task.refundAmount = refundAmount;
        task.status = TaskStatus.Resolved;

        // Transfer funds
        if (payeeAmount > 0) {
            mneeToken.safeTransfer(task.payee, payeeAmount);
            totalEarned[task.payee] += payeeAmount;
            if (_score >= 70) {
                payeeSuccessCount[task.payee]++;
            }
        }
        if (refundAmount > 0) {
            mneeToken.safeTransfer(task.payer, refundAmount);
        }
        totalSpent[task.payer] += payeeAmount;

        emit TaskResolved(_taskId, payeeAmount, refundAmount, _score);
    }

    /**
     * @notice Cancel a task before submission (payer only)
     * @param _taskId The task ID
     * @param _reason Reason for cancellation
     */
    function cancelTask(
        uint256 _taskId,
        string calldata _reason
    ) external nonReentrant {
        if (_taskId >= taskCount) revert InvalidTaskId();
        
        Task storage task = tasks[_taskId];
        
        if (msg.sender != task.payer) revert NotPayer();
        if (task.status != TaskStatus.Created) revert TaskAlreadySubmitted();

        task.status = TaskStatus.Cancelled;
        task.refundAmount = task.amount;

        // Refund payer
        mneeToken.safeTransfer(task.payer, task.amount);

        emit TaskCancelled(_taskId, task.amount, _reason);
    }

    /**
     * @notice Claim refund for timed out task (payer only)
     * @param _taskId The task ID
     */
    function claimTimeout(uint256 _taskId) external nonReentrant {
        if (_taskId >= taskCount) revert InvalidTaskId();
        
        Task storage task = tasks[_taskId];
        
        if (msg.sender != task.payer) revert NotPayer();
        if (task.status != TaskStatus.Created) revert InvalidStatus();
        if (block.timestamp <= task.createdAt + task.timeout) revert TimeoutNotReached();

        _handleTimeout(_taskId);
    }

    // ============ Internal Functions ============

    function _handleTimeout(uint256 _taskId) internal {
        Task storage task = tasks[_taskId];
        
        task.status = TaskStatus.TimedOut;
        task.refundAmount = task.amount;

        mneeToken.safeTransfer(task.payer, task.amount);

        emit TaskTimedOut(_taskId, task.amount);
    }

    // ============ View Functions ============

    /**
     * @notice Get full task details
     */
    function getTask(uint256 _taskId) external view returns (Task memory) {
        if (_taskId >= taskCount) revert InvalidTaskId();
        return tasks[_taskId];
    }

    /**
     * @notice Check if task can be claimed for timeout
     */
    function canClaimTimeout(uint256 _taskId) external view returns (bool) {
        if (_taskId >= taskCount) return false;
        Task storage task = tasks[_taskId];
        return task.status == TaskStatus.Created && 
               block.timestamp > task.createdAt + task.timeout;
    }

    /**
     * @notice Get time remaining until timeout
     */
    function timeUntilTimeout(uint256 _taskId) external view returns (uint256) {
        if (_taskId >= taskCount) return 0;
        Task storage task = tasks[_taskId];
        uint256 deadline = task.createdAt + task.timeout;
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }

    /**
     * @notice Get agent reputation stats
     */
    function getAgentStats(address _agent) external view returns (
        uint256 tasksAsPayer,
        uint256 tasksAsPayee,
        uint256 successfulTasks,
        uint256 earned,
        uint256 spent
    ) {
        return (
            payerTaskCount[_agent],
            payeeTaskCount[_agent],
            payeeSuccessCount[_agent],
            totalEarned[_agent],
            totalSpent[_agent]
        );
    }

    // ============ Admin Functions ============

    /**
     * @notice Add a new verifier
     */
    function addVerifier(address _verifier) external onlyRole(ADMIN_ROLE) {
        grantRole(VERIFIER_ROLE, _verifier);
        emit VerifierAdded(_verifier);
    }

    /**
     * @notice Remove a verifier
     */
    function removeVerifier(address _verifier) external onlyRole(ADMIN_ROLE) {
        revokeRole(VERIFIER_ROLE, _verifier);
        emit VerifierRemoved(_verifier);
    }

    /**
     * @notice Update default timeout
     */
    function setDefaultTimeout(uint256 _timeout) external onlyRole(ADMIN_ROLE) {
        require(_timeout >= 1 hours && _timeout <= 30 days, "Invalid timeout");
        emit TimeoutUpdated(defaultTimeout, _timeout);
        defaultTimeout = _timeout;
    }

    /**
     * @notice Update task amount limits
     */
    function setAmountLimits(uint256 _min, uint256 _max) external onlyRole(ADMIN_ROLE) {
        require(_min > 0 && _max > _min, "Invalid limits");
        minTaskAmount = _min;
        maxTaskAmount = _max;
    }

    /**
     * @notice Pause contract (emergency)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Recover accidentally sent tokens (not MNEE in active escrows)
     */
    function recoverTokens(
        address _token,
        uint256 _amount
    ) external onlyRole(ADMIN_ROLE) {
        require(_token != address(mneeToken), "Cannot recover MNEE");
        IERC20(_token).safeTransfer(msg.sender, _amount);
    }
}
