pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/cryptography/ECDSA.sol';

/**
@title Ocean-Fitchain Driver Contract
@author  Ahmed Ali
*/

contract FitchainConditions {

    // Proof of Training
    struct Proof {
        bytes32 message;    // hash of PoT
        bytes signatures; // signatures
        address [] validators; //  public key
    }

    struct Model {
        bool status;
        uint256 k; // number of validators
        address consumer;
        address mlProvider;
        address dataProvider;
        bytes32 result; // result key on ipfs
        bytes32 service;    // service agreement ID
        bytes32 proof;// proof of training
    }

    // condition id in ocean is the model ID in Fitchain
    mapping (bytes32 => Model) models;
    mapping (bytes32 => Proof) proofs;

    event InvokeFitchainPoT(bytes32 modelId, address consumer, address mlProvider, address dataProvider, bytes32 mlAsset, bytes32 dataAsset);
    event PublishResult(bytes32 condition, bytes32 service, bytes32 proofId, bytes32 result);

    function invoke(bytes32 condition,
                    uint256 k,
                    bytes32 service,
                    address consumer,
                    address mlProvider,
                    address dataProvider,
                    bytes32 mlAsset,
                    bytes32 dataAsset) public {
        // TODO: check condition ID (model ID) is exist from service agreement
        Model memory m = Model(false, k, consumer, mlProvider, dataProvider, bytes32(0), service, bytes32(0));
        models[condition] = m;
        emit InvokeFitchainPoT(condition, consumer, mlProvider, dataProvider, mlAsset, dataAsset);
    }

    function isValidSignature(bytes32 message, address validator, bytes memory signature, uint256 index) public pure returns (bool) {
        return getSignerAddress(message, signature, index) == validator;
    }

    function getProof(bytes32 modelId, bytes32 message, bytes memory sigs, address [] validators, bytes32 result) public {
        // verify Proof of training
        // require(models[modelId].k == validators.length);
        bool  status = true;
        for (uint256 i =0 ; i < validators.length; i++) {
            if(!isValidSignature(message, validators[i], sigs, i)) {
                status = false;
            }
        }
        bytes32  proofId = keccak256(abi.encodePacked(msg.sender, message, sigs));
        proofs[proofId] = Proof(message, sigs, validators);
        models[modelId].status = status;
        models[modelId].result = result;

        // TODO: fulfill condition in service agreement

        // publish result hash on ipfs
        emit PublishResult(modelId, models[modelId].service, proofId, result);
    }

    function getStatus(bytes32 modelId) public view returns (bool status) {
        return models[modelId].status;
    }

    function getResult(bytes32 modelId) public view returns (bytes32 result) {
        return models[modelId].result;
    }

}
