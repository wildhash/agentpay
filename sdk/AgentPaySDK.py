"""
AgentPay Python SDK
Simple Python wrapper for interacting with AgentEscrow contract
Requires: web3.py
Install: pip install web3
"""

from web3 import Web3
import json
import os

class AgentPaySDK:
    def __init__(self, provider_url, contract_address, private_key=None):
        """
        Initialize AgentPay SDK
        
        Args:
            provider_url (str): RPC endpoint URL (e.g., 'http://127.0.0.1:8545')
            contract_address (str): Deployed contract address
            private_key (str, optional): Private key for signing transactions
        """
        self.w3 = Web3(Web3.HTTPProvider(provider_url))
        self.contract_address = Web3.to_checksum_address(contract_address)
        
        # Load ABI
        abi_path = os.path.join(os.path.dirname(__file__), 'AgentEscrow.abi.json')
        with open(abi_path, 'r') as f:
            self.abi = json.load(f)
        
        self.contract = self.w3.eth.contract(address=self.contract_address, abi=self.abi)
        
        if private_key:
            self.set_signer(private_key)
        else:
            self.account = None
    
    def set_signer(self, private_key):
        """Set private key for signing transactions"""
        if not private_key.startswith('0x'):
            private_key = '0x' + private_key
        self.account = self.w3.eth.account.from_key(private_key)
    
    def create_task(self, payee_address, description, amount_eth):
        """
        Create a new task
        
        Args:
            payee_address (str): Address of payee agent
            description (str): Task description
            amount_eth (float): Payment amount in ETH
            
        Returns:
            dict: Transaction receipt with taskId
        """
        if not self.account:
            raise Exception("Signer required for creating tasks")
        
        payee_address = Web3.to_checksum_address(payee_address)
        amount_wei = self.w3.to_wei(amount_eth, 'ether')
        
        # Build transaction
        tx = self.contract.functions.createTask(
            payee_address,
            description
        ).build_transaction({
            'from': self.account.address,
            'value': amount_wei,
            'gas': 500000,
            'gasPrice': self.w3.eth.gas_price,
            'nonce': self.w3.eth.get_transaction_count(self.account.address)
        })
        
        # Sign and send
        signed_tx = self.w3.eth.account.sign_transaction(tx, self.account.key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        # Extract taskId from events
        task_created_event = self.contract.events.TaskCreated().process_receipt(receipt)
        task_id = task_created_event[0]['args']['taskId'] if task_created_event else None
        
        return {
            'taskId': task_id,
            'txHash': receipt.transactionHash.hex()
        }
    
    def submit_deliverable(self, task_id, deliverable_hash):
        """
        Submit deliverable for a task
        
        Args:
            task_id (int): Task ID
            deliverable_hash (str): Deliverable hash (e.g., IPFS hash)
            
        Returns:
            dict: Transaction receipt
        """
        if not self.account:
            raise Exception("Signer required for submitting deliverables")
        
        tx = self.contract.functions.submitDeliverable(
            task_id,
            deliverable_hash
        ).build_transaction({
            'from': self.account.address,
            'gas': 200000,
            'gasPrice': self.w3.eth.gas_price,
            'nonce': self.w3.eth.get_transaction_count(self.account.address)
        })
        
        signed_tx = self.w3.eth.account.sign_transaction(tx, self.account.key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return {
            'txHash': receipt.transactionHash.hex()
        }
    
    def score_and_resolve(self, task_id, score):
        """
        Score and resolve a task (verifier only)
        
        Args:
            task_id (int): Task ID
            score (int): Score from 0-100
            
        Returns:
            dict: Transaction receipt with payment details
        """
        if not self.account:
            raise Exception("Signer required for scoring tasks")
        
        if not 0 <= score <= 100:
            raise ValueError("Score must be between 0 and 100")
        
        tx = self.contract.functions.scoreAndResolve(
            task_id,
            score
        ).build_transaction({
            'from': self.account.address,
            'gas': 300000,
            'gasPrice': self.w3.eth.gas_price,
            'nonce': self.w3.eth.get_transaction_count(self.account.address)
        })
        
        signed_tx = self.w3.eth.account.sign_transaction(tx, self.account.key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        # Extract payment details from events
        task_resolved_event = self.contract.events.TaskResolved().process_receipt(receipt)
        if task_resolved_event:
            args = task_resolved_event[0]['args']
            payee_amount = self.w3.from_wei(args['payeeAmount'], 'ether')
            refund_amount = self.w3.from_wei(args['refundAmount'], 'ether')
        else:
            payee_amount = 0
            refund_amount = 0
        
        return {
            'txHash': receipt.transactionHash.hex(),
            'payeeAmount': float(payee_amount),
            'refundAmount': float(refund_amount)
        }
    
    def cancel_task(self, task_id):
        """
        Cancel a task (payer only, before submission)
        
        Args:
            task_id (int): Task ID
            
        Returns:
            dict: Transaction receipt
        """
        if not self.account:
            raise Exception("Signer required for cancelling tasks")
        
        tx = self.contract.functions.cancelTask(task_id).build_transaction({
            'from': self.account.address,
            'gas': 200000,
            'gasPrice': self.w3.eth.gas_price,
            'nonce': self.w3.eth.get_transaction_count(self.account.address)
        })
        
        signed_tx = self.w3.eth.account.sign_transaction(tx, self.account.key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return {
            'txHash': receipt.transactionHash.hex()
        }
    
    def get_task(self, task_id):
        """
        Get task details
        
        Args:
            task_id (int): Task ID
            
        Returns:
            dict: Task details
        """
        task = self.contract.functions.getTask(task_id).call()
        
        status_map = {0: 'Created', 1: 'Submitted', 2: 'Resolved', 3: 'Cancelled'}
        
        return {
            'payer': task[0],
            'payee': task[1],
            'amount': float(self.w3.from_wei(task[2], 'ether')),
            'description': task[3],
            'status': status_map.get(task[4], 'Unknown'),
            'createdAt': task[5],
            'submittedAt': task[6],
            'deliverableHash': task[7],
            'score': task[8],
            'resolved': task[9]
        }
    
    def get_balance(self, address):
        """
        Get balance of an address
        
        Args:
            address (str): Ethereum address
            
        Returns:
            float: Balance in ETH
        """
        address = Web3.to_checksum_address(address)
        balance_wei = self.w3.eth.get_balance(address)
        return float(self.w3.from_wei(balance_wei, 'ether'))


# Example usage
if __name__ == '__main__':
    # Initialize SDK
    sdk = AgentPaySDK(
        provider_url='http://127.0.0.1:8545',
        contract_address='0x5FbDB2315678afecb367f032d93F642f64180aa3',
        private_key='0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    )
    
    print("AgentPay Python SDK initialized")
    print(f"Connected to: {sdk.contract_address}")
    print(f"Account: {sdk.account.address if sdk.account else 'None'}")
