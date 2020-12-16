import { takeSnapshot, revertSnapshot } from '../_utils/evm';
import { printTitle } from '../_utils/formatting';
import { shouldRevert } from '../_utils/testing';
import { registerNode } from '../_helpers/node';
import { setDaoNodeTrustedBootstrapMember, setDAONodeTrustedBootstrapSetting } from './scenario-dao-node-trusted-bootstrap';
import { daoNodeTrustedProposal } from './scenario-dao-node-trusted-proposal';

// Contracts
import { RocketDAONodeTrusted } from '../_utils/artifacts';

export default function() {
    contract('RocketDAONodeTrusted', async (accounts) => {


        // Accounts
        const [
            owner,
            userOne,
            userTwo,
            registeredNode1,
            registeredNode2,
            registeredNode3,
            registeredNodeTrusted1,
            registeredNodeTrusted2,
            registeredNodeTrusted3,
        ] = accounts;


        // State snapshotting
        let snapshotId;
        beforeEach(async () => { snapshotId = await takeSnapshot(web3); });
        afterEach(async () => { await revertSnapshot(web3, snapshotId); });


        // Setup
        before(async () => {

            // Register nodes
            await registerNode({from: registeredNode1});
            await registerNode({from: registeredNode2});
            await registerNode({from: registeredNode3});
            await registerNode({from: registeredNodeTrusted1});
            await registerNode({from: registeredNodeTrusted2});
            await registerNode({from: registeredNodeTrusted3});
            // Enable last node to be trusted
            await setDaoNodeTrustedBootstrapMember('rocketpool', 'node@home.com', registeredNodeTrusted1, {from: owner});
            await setDaoNodeTrustedBootstrapMember('rocketpool', 'node@home.com', registeredNodeTrusted2, {from: owner});
            // await setDaoNodeTrustedBootstrapMember('rocketpool', 'node@home.com', 'Node Number 3', registeredNodeTrusted3, {from: owner});

        });


        //
        // Start Tests
        //


        it(printTitle('userOne', 'fails to be added as a trusted node dao member as they are not a registered node'), async () => {
            // Set as trusted dao member via bootstrapping
            await shouldRevert(setDaoNodeTrustedBootstrapMember('rocketpool', 'node@home.com', userOne, {
                from: owner
            }), 'Non registered node added to trusted node DAO', 'Invalid node');
        });


        it(printTitle('userOne', 'fails to add a bootstrap trusted node DAO member as non owner'), async () => {
            // Set as trusted dao member via bootstrapping
            await shouldRevert(setDaoNodeTrustedBootstrapMember('rocketpool', 'node@home.com', registeredNode1, {
                from: userOne
            }), 'Non owner registered node to trusted node DAO', 'Account is not Rocket Pool or the DAO');
        });

        it(printTitle('owner', 'cannot add the same member twice'), async () => {
            // Set as trusted dao member via bootstrapping
            await shouldRevert(setDaoNodeTrustedBootstrapMember('rocketpool', 'node@home.com', registeredNodeTrusted2, {
                from: owner
            }), 'Owner the same DAO member twice', 'This node is already part of the trusted node DAO');
        });

  
        it(printTitle('owner', 'fails to add more than the 3 min required bootstrap trusted node dao members'), async () => {
            // Add our 3rd member
            await setDaoNodeTrustedBootstrapMember('rocketpool', 'node@home.com', registeredNodeTrusted3, {from: owner});
            // Set as trusted dao member via bootstrapping
            await shouldRevert(setDaoNodeTrustedBootstrapMember('rocketpool', 'node@home.com', registeredNode3, {
                from: owner
            }), 'Owner added more than 3 bootstrap trusted node dao members', 'Bootstrap mode not engaged, min DAO member count has been met');
        });
        

        it(printTitle('owner', 'updates quorum setting while bootstrap mode is enabled'), async () => {
            // Set as trusted dao member via bootstrapping
            await setDAONodeTrustedBootstrapSetting('quorum', web3.utils.toWei('0.55'), {
                from: owner
            });
        });


        it(printTitle('owner', 'updates RPL bond setting while bootstrap mode is enabled'), async () => {
            // Set RPL Bond at 10K RPL
            await setDAONodeTrustedBootstrapSetting('rplbond', web3.utils.toWei('10000'), {
                from: owner
            });
        });

        it(printTitle('userOne', 'fails to update RPL bond setting while bootstrap mode is enabled as they are not the owner'), async () => {
            // Update setting
            await shouldRevert(setDAONodeTrustedBootstrapSetting('rplbond', web3.utils.toWei('10000'), {
                from: userOne
            }), 'UserOne changed RPL bond setting', 'Account is not Rocket Pool or the DAO');
        });


        it(printTitle('owner', 'fails to update setting after bootstrap mode is disabled'), async () => {
            // Add our 3rd member
            await setDaoNodeTrustedBootstrapMember('rocketpool', 'node@home.com', registeredNodeTrusted3, {from: owner});
            // Update setting
            await shouldRevert(setDAONodeTrustedBootstrapSetting('quorum', web3.utils.toWei('0.55'), {
                from: owner
            }), 'Owner updated setting after bootstrap mode is disabled', 'Bootstrap mode not engaged, min DAO member count has been met');
        });


        it(printTitle('owner', 'fails to set quorum setting below 51% while bootstrap mode is enabled'), async () => {
            // Update setting
            await shouldRevert(setDAONodeTrustedBootstrapSetting('quorum', web3.utils.toWei('0.50'), {
                from: owner
            }), 'Owner changed quorum setting to invalid value', 'Quorum setting must be >= 51% and <= 90%');
        });


        it(printTitle('owner', 'fails to set quorum setting above 90% while bootstrap mode is enabled'), async () => {
            // Update setting
            await shouldRevert(setDAONodeTrustedBootstrapSetting('quorum', web3.utils.toWei('0.91'), {
                from: owner
            }), 'Owner changed quorum setting to invalid value', 'Quorum setting must be >= 51% and <= 90%');
        });
        

        it(printTitle('registeredNode1', 'verify trusted node quorum votes required is correct'), async () => {
            // Load contracts
            const rocketDAONodeTrusted = await RocketDAONodeTrusted.deployed();
            // How many trusted nodes do we have?
            let trustedNodeCount =  await rocketDAONodeTrusted.getMemberCount({
                from: registeredNode1,
            });
            // Get the current quorum threshold
            let quorumThreshold = await rocketDAONodeTrusted.getSettingUint('quorum', {
                from: registeredNode1,
            });
            // Calculate the expected vote threshold
            let expectedVotes = (Number(web3.utils.fromWei(quorumThreshold)) * Number(trustedNodeCount)).toFixed(2);
            // Calculate it now on the contracts
            let quorumVotes = await rocketDAONodeTrusted.getProposalQuorumVotesRequired({
                from: registeredNode1,
            });
            // Verify
            assert(expectedVotes == Number(web3.utils.fromWei(quorumVotes)).toFixed(2), "Expected vote threshold does not match contracts");         
        });
        

        it(printTitle('registeredNodeTrusted1', 'creates a proposal for registeredNode1 to join as a new member, registeredNodeTrusted1 & registeredNodeTrusted2 vote for it'), async () => {
            // Encode the calldata for the proposal
            let proposalCalldata = web3.eth.abi.encodeFunctionCall(
                {name: 'invite', type: 'function', inputs: [{type: 'string', name: '_id'},{type: 'string', name: '_email'}, {type: 'address', name: '_nodeAddress'}]},
                ['SaaS_Provider', 'test@sass.com', registeredNode1]
            );
            // Add the proposal
            await daoNodeTrustedProposal('hey guys, can we add this cool SaaS member please?', proposalCalldata, {
                from: registeredNodeTrusted1
            });

        });
        

    });
}