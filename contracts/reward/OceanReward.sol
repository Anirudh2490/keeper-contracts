pragma solidity 0.4.25;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

import '../token/OceanToken.sol';
import '../SLA/ServiceAgreement.sol';

contract OceanReward is Ownable {

    using SafeMath for uint256;
    using SafeMath for uint;



    // struct
    struct Submission {
        address explorer;                     // the user who explore the dataset & model
        uint256 stake;                        // stake amount
        bool    isWhitelisted;                // boolean value to flag isWhitelisted or not
        bytes32 dataset;                      // the hash of dataset or hash of URL to model
        bytes32 model;                        // the hash of model or hash of URL to model
        address[] verifiers;                  // the verifiers who validate the submission
        uint256 nYep;                         // number of supporters
        mapping (address => bool) votes;      // votes of verifiers regarding this submission
        mapping (address => uint256) vStakes; // stake from voters
    }
    mapping(bytes32 => Submission) private mSubmission;
    mapping (address => uint256) private mStakes;   // the deposited stakes from each user including explorer

    // global variables
    uint256 public stakes = 0;              // total amount stakes deposited in this contract
    uint256 public voteQuorum = 50;         // percentage of majority votes to win (default 50%)
    uint public dispensationPct = 50;       // percentage of reward tokens to explorer
    uint256 public minStake = 100 * 10 ** 18;

    OceanToken  public  mToken;
    ServiceAgreement public SA;

    bytes32[] public candidates;            // list of submission hash
    address public winner;
    uint256 public payout;
    // events

    /**
    * @dev Query token amount as network rewards
    */

    function getRewardAmount() external view returns (uint256){
        uint256 balance = mToken.balanceOf(address(this));
        require(balance >= stakes, 'reward token amount should not be negative');
        return  balance.sub(stakes);
    }

    /**
    * @dev return current picked winner
    */
    function getWinnerAmount() external view returns (address, uint256){
        return (winner, payout);
    }

    // returns full list of candidate addresses - Fang
    function getCandidateList() public view returns (address[]) {
        address[] memory v = new address[](candidates.length);
        for (uint256 i = 0; i < candidates.length; i++) {
            v[i] = mSubmission[candidates[i]].explorer;
        }
        return v;
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
    * @dev Explorer submit findings (dataset & model)
    */
    function submit(bytes32 _submissionHash, bytes32 _data, bytes32 _model, uint256 _amount) public {
        uint256 amount = 0;
        if ( _amount == 0 ) {
            amount = minStake;
        } else {
            amount = _amount;
        }
        // first deposit stakes
        require(mToken.transferFrom(msg.sender, this, amount), 'tokens not transferred');
        // record stake for explorer
        mStakes[msg.sender] = mStakes[msg.sender].add(amount);
        // update global amount of stakes
        stakes = stakes.add(amount);
        // create submission struct
        mSubmission[_submissionHash] = Submission(msg.sender, amount, false, _data, _model, new address[](0), 0);
    }

    /**
    * @dev Verfier registers as the verifier of a specific submission
    */
    function registVerifier(bytes32 _submissionHash) external {
        mSubmission[_submissionHash].verifiers.push(msg.sender);
    }

    /**
    * @dev Verfier submit votes (true - reproduce claimed accuracy; false - cannot reproduce)
    */
    function submitVote(bytes32 _submissionHash, bool _vote, uint256 _amount) public {
        uint256 amount = 0;
        if ( _amount == 0 ) {
            amount = minStake;
        } else {
            amount = _amount;
        }
        // first deposit stakes
        require(mToken.transferFrom(msg.sender, this, amount), 'tokens not transferred');
        // record stake for explorer
        mStakes[msg.sender] = mStakes[msg.sender].add(amount);
        // update global amount of stakes
        stakes = stakes.add(amount);
        // submit votes
        mSubmission[_submissionHash].votes[msg.sender] = _vote;
        // record stake amount
        mSubmission[_submissionHash].vStakes[msg.sender] = amount;
    }

    /**
    * @dev resolve the validation of a submission
    */
    function resolve(bytes32 _submissionHash) external {
        // total number of voters
        uint256 nVotes = mSubmission[_submissionHash].verifiers.length;
        // count of YES
        uint256 nYep;
        for (uint256 i = 0; i < nVotes; i++) {
            address voter = mSubmission[_submissionHash].verifiers[i];
            if(mSubmission[_submissionHash].votes[voter] == true) {
                nYep = nYep.add(1);
            }
        }
        // update number of total Yes
        mSubmission[_submissionHash].nYep = nYep;
        // calcualte percentage of Yep
        if(nYep.mul(100).div(nVotes) >= voteQuorum) {
            // change status of submission
            mSubmission[_submissionHash].isWhitelisted = true;
            // add explorer into candidate list
            candidates.push(_submissionHash);
        }
    }

    /**
    * @dev process stakes and rewards
    */
    function handleStakes(bytes32 _submissionHash) external {
        // owner of submission
        address explorer = mSubmission[_submissionHash].explorer;
        // amount of stakes
        uint256 amount = mSubmission[_submissionHash].stake;
        // deduct stake of this submission from owner's total stake amount
        mStakes[explorer] = mStakes[explorer].sub(amount);
        // update global amount of stakes
        stakes = stakes.sub(amount);
        // upadte submission record
        mSubmission[_submissionHash].stake = 0;
        // process stakes and rewards
        if (mSubmission[_submissionHash].isWhitelisted == true) {
            // transfer stakes back to explorer only if submission is whitelisted
            require(mToken.transfer(explorer, amount), 'Token transfer failed.');
        }

        // handle verifiers stakes
        uint256 nVotes = mSubmission[_submissionHash].verifiers.length;
        // refund if vote == true for whitelisted submission
        for (uint256 i = 0; i < nVotes; i++) {
            // find voter
            address voter = mSubmission[_submissionHash].verifiers[i];
            // find amount of stake
            uint256 stake = mSubmission[_submissionHash].vStakes[voter];
            // deduct stake of this submission from owner's total stake amount
            mStakes[voter] = mStakes[voter].sub(stake);
            // update global amount of stakes
            stakes = stakes.sub(stake);
            // refund stakes if votes match the voting result
            if(mSubmission[_submissionHash].isWhitelisted == mSubmission[_submissionHash].votes[voter]) {
                // transfer stakes back to voter
                require(mToken.transfer(voter, stake), 'Token transfer failed.');
            }
        }
        // FALSE: do nothing and stakes become part of reward pool
    }

    /**
    * @dev send rewards to a randomly chosen winner
    */
    function sendRewards() public returns (bool) {
        // pick winner
        uint256 num = candidates.length;
        // generate random number
        uint256 index = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty)))%num;
        // find winner address
        bytes32 submissionHash = candidates[index];
        winner = mSubmission[submissionHash].explorer;
        // find reward amount (contract balance - stakes)
        uint256 balance = mToken.balanceOf(address(this)).sub(stakes);
        payout = balance.mul(dispensationPct).div(100);
        // send token rewards to explorer
        require(mToken.transfer(winner, payout), 'Token transfer failed.');

        // reward remaining tokens to verifiers for this submission
        uint256 numVerifier = mSubmission[submissionHash].verifiers.length;
        uint256 reward = balance.sub(payout).div(mSubmission[submissionHash].nYep);
        for (uint256 i = 0; i < numVerifier; i++) {
            address voter = mSubmission[submissionHash].verifiers[i];
            if(mSubmission[submissionHash].votes[voter] == true) {
                require(mToken.transfer(voter, reward), 'Token transfer failed.');
            }
        }
        // empty record
        delete candidates;

        return true;
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
        // find reward amount (contract balance - stakes)
        uint256 amount = mToken.balanceOf(address(this)).sub(stakes);
        // send token rewards
        require(mToken.transfer(winner, amount), 'Token transfer failed.');
        return true;
    }
}
