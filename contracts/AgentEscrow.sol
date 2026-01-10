// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentEscrow
 * @notice Smart contract escrow for agent-to-agent tasks with AI verification
 * @dev Implements MNEE (Multi-agent Native Economic Engine) with partial refund capability
 */
contract AgentEscrow {
    
    enum TaskStatus { Created, Submitted, Resolved, Cancelled }
    
    struct Task {
        address payer;
        address payee;
        uint256 amount;
        string description;
        TaskStatus status;
        uint256 createdAt;
        uint256 submittedAt;
        string deliverableHash; // IPFS hash or other reference
        uint8 score; // 0-100 score from AI verifier
        bool resolved;
    }
    
    // State variables
    mapping(uint256 => Task) public tasks;
    uint256 public taskCounter;
    address public verifier; // Address authorized to submit scores
    address public owner;
    
    // Events
    event TaskCreated(uint256 indexed taskId, address indexed payer, address indexed payee, uint256 amount, string description);
    event TaskSubmitted(uint256 indexed taskId, string deliverableHash);
    event TaskScored(uint256 indexed taskId, uint8 score);
    event TaskResolved(uint256 indexed taskId, uint256 payeeAmount, uint256 refundAmount);
    event TaskCancelled(uint256 indexed taskId, uint256 refundAmount);
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    
    // Modifiers
    modifier onlyVerifier() {
        require(msg.sender == verifier, "Only verifier can call this");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    constructor(address _verifier) {
        owner = msg.sender;
        verifier = _verifier;
    }
    
    /**
     * @notice Create a new escrow task
     * @param _payee Address of the agent who will complete the task
     * @param _description Description of the task
     */
    function createTask(address _payee, string calldata _description) external payable returns (uint256) {
        require(msg.value > 0, "Must deposit funds");
        require(_payee != address(0), "Invalid payee address");
        require(_payee != msg.sender, "Cannot pay yourself");
        
        uint256 taskId = taskCounter++;
        
        tasks[taskId] = Task({
            payer: msg.sender,
            payee: _payee,
            amount: msg.value,
            description: _description,
            status: TaskStatus.Created,
            createdAt: block.timestamp,
            submittedAt: 0,
            deliverableHash: "",
            score: 0,
            resolved: false
        });
        
        emit TaskCreated(taskId, msg.sender, _payee, msg.value, _description);
        
        return taskId;
    }
    
    /**
     * @notice Submit deliverable for a task
     * @param _taskId ID of the task
     * @param _deliverableHash Hash reference to the deliverable (e.g., IPFS hash)
     */
    function submitDeliverable(uint256 _taskId, string calldata _deliverableHash) external {
        Task storage task = tasks[_taskId];
        
        require(task.amount > 0, "Task does not exist");
        require(msg.sender == task.payee, "Only payee can submit");
        require(task.status == TaskStatus.Created, "Task not in Created status");
        require(bytes(_deliverableHash).length > 0, "Deliverable hash required");
        
        task.status = TaskStatus.Submitted;
        task.submittedAt = block.timestamp;
        task.deliverableHash = _deliverableHash;
        
        emit TaskSubmitted(_taskId, _deliverableHash);
    }
    
    /**
     * @notice AI verifier submits score and resolves payment
     * @param _taskId ID of the task
     * @param _score Score from 0-100
     */
    function scoreAndResolve(uint256 _taskId, uint8 _score) external onlyVerifier {
        Task storage task = tasks[_taskId];
        
        require(task.amount > 0, "Task does not exist");
        require(task.status == TaskStatus.Submitted, "Task not submitted");
        require(!task.resolved, "Task already resolved");
        require(_score <= 100, "Score must be 0-100");
        
        task.score = _score;
        task.status = TaskStatus.Resolved;
        task.resolved = true;
        
        emit TaskScored(_taskId, _score);
        
        // Calculate payout based on score
        // Score 0-100 determines percentage of payment
        uint256 payeeAmount = (task.amount * _score) / 100;
        uint256 refundAmount = task.amount - payeeAmount;
        
        // Transfer funds
        if (payeeAmount > 0) {
            payable(task.payee).transfer(payeeAmount);
        }
        
        if (refundAmount > 0) {
            payable(task.payer).transfer(refundAmount);
        }
        
        emit TaskResolved(_taskId, payeeAmount, refundAmount);
    }
    
    /**
     * @notice Cancel task before submission (payer only)
     * @param _taskId ID of the task
     */
    function cancelTask(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        
        require(task.amount > 0, "Task does not exist");
        require(msg.sender == task.payer, "Only payer can cancel");
        require(task.status == TaskStatus.Created, "Can only cancel before submission");
        require(!task.resolved, "Task already resolved");
        
        task.status = TaskStatus.Cancelled;
        task.resolved = true;
        
        uint256 refundAmount = task.amount;
        task.amount = 0;
        
        payable(task.payer).transfer(refundAmount);
        
        emit TaskCancelled(_taskId, refundAmount);
    }
    
    /**
     * @notice Update verifier address
     * @param _newVerifier New verifier address
     */
    function updateVerifier(address _newVerifier) external onlyOwner {
        require(_newVerifier != address(0), "Invalid verifier address");
        
        address oldVerifier = verifier;
        verifier = _newVerifier;
        
        emit VerifierUpdated(oldVerifier, _newVerifier);
    }
    
    /**
     * @notice Get task details
     * @param _taskId ID of the task
     */
    function getTask(uint256 _taskId) external view returns (
        address payer,
        address payee,
        uint256 amount,
        string memory description,
        TaskStatus status,
        uint256 createdAt,
        uint256 submittedAt,
        string memory deliverableHash,
        uint8 score,
        bool resolved
    ) {
        Task memory task = tasks[_taskId];
        return (
            task.payer,
            task.payee,
            task.amount,
            task.description,
            task.status,
            task.createdAt,
            task.submittedAt,
            task.deliverableHash,
            task.score,
            task.resolved
        );
    }
}
