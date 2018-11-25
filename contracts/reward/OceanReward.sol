pragma solidity 0.4.25;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

import '../token/OceanToken.sol';
import '../SLA/ServiceAgreement.sol';

contract OceanReward is Ownable {

    using SafeMath for uint256;
    using SafeMath for uint;

    // global variables
    OceanToken  public  mToken;
    ServiceAgreement public SA;

    address public winner;
    // events

    /**
    * @dev Query token amount as network rewards
    */

    function getRewardAmount() external view returns (uint256){
        return mToken.balanceOf(address(this));
    }

    /**
    * @dev return current picked winner
    */
    function getWinner() external view returns (address){
        return winner;
    }

    /**
    * @dev OceanReward Constructor
    * @param _tokenAddress The deployed contract address of OceanToken
    * Runs only on initial contract creation.
    */
    constructor(address _tokenAddress, address _sa) public {
        require(_tokenAddress != address(0x0), 'Token address is 0x0.');
        // instantiate Ocean token contract
        mToken = OceanToken(_tokenAddress);
        // set the token receiver to be marketplace
        mToken.setRewardPool(address(this));
        // init SA
        SA = ServiceAgreement(_sa);
    }

    /**
    * @dev send rewards to a randomly chosen winner
    */
    function rewardWinner() public returns (bool) {
        // pick winner
        uint256 num = SA.getCount();
        // generate random number
        uint256 index = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty)))%num;
        // find winner address
        winner = SA.getCandidate(index);
        // find reward amount
        uint256 amount = mToken.balanceOf(address(this));
        // send token rewards
        require(mToken.transfer(winner, amount), 'Token transfer failed.');
        return true;
    }


}
