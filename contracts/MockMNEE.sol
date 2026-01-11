// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockMNEE
 * @notice Mock MNEE stablecoin for testing
 * @dev Mainnet MNEE: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
 */
contract MockMNEE is ERC20, Ownable {
    uint8 private constant DECIMALS = 6; // USDC-style decimals

    constructor() ERC20("Mock MNEE Stablecoin", "MNEE") Ownable(msg.sender) {
        // Mint 1M MNEE to deployer for testing
        _mint(msg.sender, 1_000_000 * 10**DECIMALS);
    }

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @notice Mint tokens (for testing only)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Faucet for testnet - anyone can mint 1000 MNEE
     */
    function faucet() external {
        _mint(msg.sender, 1000 * 10**DECIMALS);
    }
}
