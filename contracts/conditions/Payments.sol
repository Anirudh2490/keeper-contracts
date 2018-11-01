pragma solidity 0.4.25;

import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';

import '../token/OCNToken.sol';
import '../sla/ServiceAgreement.sol';

contract Payments {

    struct Payment {
        address sender;
        address receiver;
        uint256 amount;
    }

    ServiceAgreement private serviceAgreementStorage;
    ERC20 private token;

    constructor(address _serviceAgreementAddress, address _tokenAddress) public {
        require(_serviceAgreementAddress != address(0), 'invalid contract address');
        require(_tokenAddress != address(0), 'invalid token address');

        serviceAgreementStorage = ServiceAgreement(_serviceAgreementAddress);
        token = OCNToken(_tokenAddress);
    }

    mapping(bytes32 => Payment) private payments;

    event PaymentLocked(
        bytes32 indexed serviceId,
        address sender,
        address receiver,
        uint256 amount
    );
    event PaymentReleased(
        bytes32 indexed serviceId,
        address sender,
        address receiver,
        uint256 amount
    );
    event PaymentRefund(
        bytes32 indexed serviceId,
        address sender,
        address receiver,
        uint256 amount
    );

    function lockPayment(bytes32 serviceId, bytes32 assetId, uint256 price) public returns (bool) {
        require(serviceAgreementStorage.getServiceAgreementConsumer(serviceId) == msg.sender, 'Only consumer can trigger releasePayment.');
        bytes32 condition = serviceAgreementStorage.getConditionByFingerprint(serviceId, address(this), this.lockPayment.selector);

        if (serviceAgreementStorage.hasUnfulfilledDependencies(serviceId, condition))
            return false;

        if (serviceAgreementStorage.getConditionStatus(serviceId, condition) == 1)
            return true;

        bytes32 valueHash = keccak256(abi.encodePacked(assetId, price));
        address sender = msg.sender;
        address receiver = address(this);
        serviceAgreementStorage.fulfillCondition(serviceId, this.lockPayment.selector, valueHash);

        require(token.transferFrom(sender, receiver, price), 'Can not lock payment');
        payments[serviceId] = Payment(sender, receiver, price);
        emit PaymentLocked(serviceId, payments[serviceId].sender, payments[serviceId].receiver, payments[serviceId].amount);
    }

    function releasePayment(bytes32 serviceId, bytes32 assetId, uint256 price) public returns (bool) {
        require(serviceAgreementStorage.getAgreementOwner(serviceId) == msg.sender, 'Only service provider can trigger releasePayment.');
        bytes32 condition = serviceAgreementStorage.getConditionByFingerprint(serviceId, address(this), this.releasePayment.selector);
        if (serviceAgreementStorage.hasUnfulfilledDependencies(serviceId, condition))
            return false;

        if (serviceAgreementStorage.getConditionStatus(serviceId, condition) == 1)
            return true;

        bytes32 valueHash = keccak256(abi.encodePacked(assetId, price));

        serviceAgreementStorage.fulfillCondition(serviceId, this.releasePayment.selector, valueHash);

        require(token.approve(address(this), payments[serviceId].amount), 'Can not approve token operation');
        require(token.transferFrom(payments[serviceId].receiver, msg.sender, payments[serviceId].amount), 'Can not release payment');
        emit PaymentReleased(serviceId, payments[serviceId].receiver, msg.sender, payments[serviceId].amount);
    }

    function refundPayment(bytes32 serviceId, bytes32 assetId, uint256 price) public returns (bool) {
        require(payments[serviceId].sender == msg.sender, 'Only consumer can trigger refundPayment.');
        bytes32 condition = serviceAgreementStorage.getConditionByFingerprint(serviceId, address(this), this.refundPayment.selector);
        if (serviceAgreementStorage.hasUnfulfilledDependencies(serviceId, condition))
            return false;

        if (serviceAgreementStorage.getConditionStatus(serviceId, condition) == 1)
            return true;

        bytes32 valueHash = keccak256(abi.encodePacked(assetId, price));

        serviceAgreementStorage.fulfillCondition(serviceId, this.refundPayment.selector, valueHash);
        // transfer from this contract to consumer/msg.sender
        require(token.approve(address(this), payments[serviceId].amount), 'Can not approve token operation');
        require(
            token.transferFrom(payments[serviceId].receiver, payments[serviceId].sender, payments[serviceId].amount),
            'Can not refund payment'
        );
        emit PaymentRefund(serviceId, payments[serviceId].receiver, payments[serviceId].sender, payments[serviceId].amount);
    }
}
