pragma solidity >0.5.0 <0.9.0;

// SPDX-License-Identifier: GPL-3.0-only

interface RocketDAOProtocolSettingsProposalsInterface {
    function getCooldownTime() external view returns(uint256);
    function getVoteTime() external view returns(uint256);
    function getVoteDelayTime() external view returns(uint256);
    function getExecuteTime() external view returns(uint256);
    function getActionTime() external view returns(uint256);
    function getProposalBond() external view returns(uint256);
    function getChallengeBond() external view returns(uint256);
    function getChallengePeriod() external view returns(uint256);
}