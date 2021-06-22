pragma solidity 0.7.6;

// SPDX-License-Identifier: GPL-3.0-only

import "../RocketBase.sol";
import "../../interface/node/RocketNodeManagerInterface.sol";
import "../../interface/rewards/claims/RocketClaimNodeInterface.sol";
import "../../interface/dao/protocol/settings/RocketDAOProtocolSettingsNodeInterface.sol"; 
import "../../interface/util/AddressSetStorageInterface.sol";


// Node registration and management 
contract RocketNodeManager is RocketBase, RocketNodeManagerInterface {

    // Events
    event NodeRegistered(address indexed node, uint256 time);
    event NodeWithdrawalAddressSet(address indexed node, address indexed withdrawalAddress, uint256 time);
    event NodeTimezoneLocationSet(address indexed node, uint256 time);

    // Construct
    constructor(RocketStorageInterface _rocketStorageAddress) RocketBase(_rocketStorageAddress) {
        version = 1;
    }

    // Get the number of nodes in the network
    function getNodeCount() override external view returns (uint256) {
        AddressSetStorageInterface addressSetStorage = AddressSetStorageInterface(getContractAddress("addressSetStorage"));
        return addressSetStorage.getCount(keccak256(abi.encodePacked("nodes.index")));
    }

    // Get a node address by index
    function getNodeAt(uint256 _index) override external view returns (address) {
        AddressSetStorageInterface addressSetStorage = AddressSetStorageInterface(getContractAddress("addressSetStorage"));
        return addressSetStorage.getItem(keccak256(abi.encodePacked("nodes.index")), _index);
    }

    // Check whether a node exists
    function getNodeExists(address _nodeAddress) override external view returns (bool) {
        return getBool(keccak256(abi.encodePacked("node.exists", _nodeAddress)));
    }

    // Get a node's current withdrawal address
    function getNodeWithdrawalAddress(address _nodeAddress) override public view returns (address) {
        return getAddress(keccak256(abi.encodePacked("node.withdrawal.address", _nodeAddress)));
    }

    // Get a node's pending withdrawal address
    function getNodePendingWithdrawalAddress(address _nodeAddress) override public view returns (address) {
        return getAddress(keccak256(abi.encodePacked("node.withdrawal.address.pending", _nodeAddress)));
    }

    // Get a node's timezone location
    function getNodeTimezoneLocation(address _nodeAddress) override external view returns (string memory) {
        return getString(keccak256(abi.encodePacked("node.timezone.location", _nodeAddress)));
    }

    // Register a new node with Rocket Pool
    function registerNode(string calldata _timezoneLocation) override external onlyLatestContract("rocketNodeManager", address(this)) {
        // Load contracts
        RocketClaimNodeInterface rocketClaimNode = RocketClaimNodeInterface(getContractAddress("rocketClaimNode"));
        RocketDAOProtocolSettingsNodeInterface rocketDAOProtocolSettingsNode = RocketDAOProtocolSettingsNodeInterface(getContractAddress("rocketDAOProtocolSettingsNode"));
        AddressSetStorageInterface addressSetStorage = AddressSetStorageInterface(getContractAddress("addressSetStorage"));
        // Check node settings
        require(rocketDAOProtocolSettingsNode.getRegistrationEnabled(), "Rocket Pool node registrations are currently disabled");
        // Check timezone location
        require(bytes(_timezoneLocation).length >= 4, "The timezone location is invalid");
        // Initialise node data
        setBool(keccak256(abi.encodePacked("node.exists", msg.sender)), true);
        setAddress(keccak256(abi.encodePacked("node.withdrawal.address", msg.sender)), msg.sender);
        setString(keccak256(abi.encodePacked("node.timezone.location", msg.sender)), _timezoneLocation);
        // Add node to index
        addressSetStorage.addItem(keccak256(abi.encodePacked("nodes.index")), msg.sender);
        // Register node for RPL claims
        rocketClaimNode.register(msg.sender, true);
        // Emit node registered event
        emit NodeRegistered(msg.sender, block.timestamp);
    }

    // Set a node's withdrawal address
    function setWithdrawalAddress(address _nodeAddress, address _newWithdrawalAddress, bool _confirm) override external onlyLatestContract("rocketNodeManager", address(this)) {
        // Check new withdrawal address
        require(_newWithdrawalAddress != address(0x0), "Invalid withdrawal address");
        // Confirm the transaction is from the node's current withdrawal address
        address withdrawalAddress = getNodeWithdrawalAddress(_nodeAddress);
        require(withdrawalAddress == msg.sender, "Only a tx from a node's withdrawal address can update it");
        // Update immediately if confirmed
        if (_confirm) {
            updateWithdrawalAddress(_nodeAddress, _newWithdrawalAddress);
        }
        // Set pending withdrawal address if not confirmed
        else {
            setAddress(keccak256(abi.encodePacked("node.withdrawal.address.pending", _nodeAddress)), _newWithdrawalAddress);
        }
    }

    // Confirm a node's new withdrawal address
    function confirmWithdrawalAddress(address _nodeAddress) override external onlyLatestContract("rocketNodeManager", address(this)) {
        // Get node by pending withdrawal address
        address pendingWithdrawalAddress = getNodePendingWithdrawalAddress(_nodeAddress);
        require(pendingWithdrawalAddress == msg.sender, "Confirmation must come from the pending withdrawal address");
        // Deregister pending withdrawal address
        deleteAddress(keccak256(abi.encodePacked("node.withdrawal.address.pending", _nodeAddress)));
        // Update withdrawal address
        updateWithdrawalAddress(_nodeAddress, msg.sender);
    }

    // Set a node's timezone location
    // Only accepts calls from registered nodes
    function setTimezoneLocation(string calldata _timezoneLocation) override external onlyLatestContract("rocketNodeManager", address(this)) onlyRegisteredNode(msg.sender) {
        // Check timezone location
        require(bytes(_timezoneLocation).length >= 4, "The timezone location is invalid");
        // Set timezone location
        setString(keccak256(abi.encodePacked("node.timezone.location", msg.sender)), _timezoneLocation);
        // Emit node timezone location set event
        emit NodeTimezoneLocationSet(msg.sender, block.timestamp);
    }

    // Update a node's withdrawal address
    function updateWithdrawalAddress(address _nodeAddress, address _newWithdrawalAddress) private {
        // Set new withdrawal address
        setAddress(keccak256(abi.encodePacked("node.withdrawal.address", _nodeAddress)), _newWithdrawalAddress);
        // Emit withdrawal address set event
        emit NodeWithdrawalAddressSet(_nodeAddress, _newWithdrawalAddress, block.timestamp);
    }

}
