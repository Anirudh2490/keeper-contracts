pragma solidity 0.4.25;

import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

/**
@title Ocean Protocol ERC20 Token Contract
@author Team: Fang Gong
*/

contract OceanToken is ERC20 {

    using SafeMath for uint256;

    // ============
    // DATA STRUCTURES:
    // ============
    string public constant name = 'OceanToken';                      // Set the token name for display
    string public constant symbol = 'OCN';                           // Set the token symbol for display

    // initial receiver of tokens
    address public _receiver = address(0);                           // address to receive TOKENS
    address public _rewardPool = address(0);

    // constants
    uint8 public constant decimals = 18;                             // Set the number of decimals for display
    uint256 public totalSupply = 1400000000 * 10 ** 18;    // OceanToken total supply
    uint256 public currentSupply = totalSupply.mul(40).div(100);    // current available tokens

    // network reward parameters
    uint256 public rewardSupply = totalSupply.sub(currentSupply);   // token amount for rewards
    uint256 public halfLife = 30;                                   // number of blocks for half-life
    uint256 public rateLimiter = 0;                                 // need to wait for 5 blocks to mint new tokens
    uint256 public threshold = 1000 * 10 ** 18;                     // trigger distribution of rewards if amountReward > threshold
    uint256 public initBlockNum;
    uint256 public lastMintBlock;
    uint256 public amountReward = 0;

    // Events
    event tokenMinted(address indexed _miner, uint256 _amount, bool _status);

    /**
    * @dev OceanToken Constructor
    * Runs only on initial contract creation.
    */
    constructor() public {
        // log init block number
        initBlockNum = block.number;
        // log last mining block
        lastMintBlock = block.number;
    }

    /**
    * @dev setReceiver set the address (OeanMarket) to receive the emitted tokens
    * @param _to The address to send tokens
    * @return success setting is successful.
    */
    function setReceiver(address _to) public returns (bool success){
        // make sure receiver is not set already
        require(_receiver == address(0), 'Receiver address already set.');
        // Creator address is assigned initial available tokens
        super._mint(_to, currentSupply);
        // set receiver
        _receiver = _to;
        return true;
    }

    /**
    * @dev setRewardPool set the address (OceanReward) to receive the reward tokens
    * @param _to The address to send tokens
    * @return success setting is successful.
    */
    function setRewardPool(address _to) public returns (bool success){
        // make sure receiver is not set already
        require(_rewardPool == address(0), 'reward pool address already set.');
        // set _rewardPool
        _rewardPool = _to;
        return true;
    }

    /**
     * @dev emitTokens Ocean tokens according to schedule forumla
     * @return true if the mining of Ocean tokens is successful.
     */
    function mintTokens() public returns (bool success) {
        // check if all tokens have been minted
        if (currentSupply == totalSupply){
            emit tokenMinted(msg.sender, 0, false);
            return false;
      }

        require(block.number > initBlockNum, 'block.number < initi block number');
        uint256 tH = (block.number.sub(initBlockNum)).div( halfLife );   // half-life is 30 blocks: release 50% after 30 blocks (testing!)
        uint256 base = 2 ** tH;
        uint256 supply = rewardSupply.sub(rewardSupply.div(base));

        require(supply >= amountReward, 'tokenToMint is negative');
        uint256 tokenToMint = supply.sub(amountReward);
        if (tokenToMint == 0) {
            emit tokenMinted(msg.sender, 0, false);
            return false;
        }

        // mint new tokens and deposit in OceanReward contract
        super._mint(_rewardPool, tokenToMint);
        // log the block number
        lastMintBlock = block.number;
        // update current token reward amount
        amountReward = amountReward.add(tokenToMint);
        // update current token supply
        currentSupply = currentSupply.add(tokenToMint);
        emit tokenMinted(msg.sender, tokenToMint, true);
        return true;
    }

    /**
    * @dev Transfer token for a specified address when not paused
    * @param _to The address to transfer to.
    * @param _value The amount to be transferred.
    */
    function transfer(address _to, uint256 _value) public returns (bool) {
        require(_to != address(0), 'To address is 0x0.');
        return super.transfer(_to, _value);
    }

    /**
    * @dev Transfer tokens from one address to another when not paused
    * @param _from address The address which you want to send tokens from
    * @param _to address The address which you want to transfer to
    * @param _value uint256 the amount of tokens to be transferred
    */
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(_to != address(0), 'To address is 0x0.');
        return super.transferFrom(_from, _to, _value);
    }

    /**
    * @dev Aprove the passed address to spend the specified amount of tokens on behalf of msg.sender when not paused.
    * @param _spender The address which will spend the funds.
    * @param _value The amount of tokens to be spent.
    */
    function approve(address _spender, uint256 _value) public returns (bool) {
        return super.approve(_spender, _value);
    }

    /**
    * @dev Gets the allowance amount of the specified address.
    * @param _owner The address to query the the allowance of.
    * @return An uint256 representing the amount allowance of the passed address.
    */
    function allowance(address _owner, address _spender) public view returns (uint256) {
        return super.allowance(_owner, _spender);
    }

}
