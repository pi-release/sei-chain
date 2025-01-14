const { execSync } = require('child_process');
const { expect } = require("chai");
const fs = require('fs');
const path = require('path');

const { expectRevert } = require('@openzeppelin/test-helpers');

describe("EVM Test", function () {
    describe("EVM Precompile Tester", function () {
        describe("EVM Bank Precompile Tester", function () {
            let contractAddress;
            let erc20;
            let owner;
            let owner2;
            let signer;
            let signer2
            before(async function() {
                contractAddress = readDeploymentOutput('erc20_deploy_addr.txt');
                console.log("ERC20 address is:");
                console.log(contractAddress);
                await sleep(1000);

                // Create a signer
                [signer, signer2] = await ethers.getSigners();
                owner = await signer.getAddress();
                owner2 = await signer2.getAddress();

                const contractABIPath = path.join(__dirname, '../../precompiles/common/erc20_abi.json');
                const contractABI = require(contractABIPath);

                // Get a contract instance
                erc20 = new ethers.Contract(contractAddress, contractABI, signer);

                // force association on owner2
                const tx1 = await signer.sendTransaction({
                    to: owner2,
                    value: 100000000000000
                });
                const receipt1 = await tx1.wait();
                expect(receipt1.status).to.equal(1);
                const tx2 = await signer2.sendTransaction({
                    to: owner,
                    value: 1
                });
                const receipt2 = await tx2.wait();
                expect(receipt2.status).to.equal(1);
            });

            it("Transfer function", async function() {
                const beforeBalance = await erc20.balanceOf(owner);
                const tx = await erc20.transfer(owner2, 1);
                const receipt = await tx.wait();
                expect(receipt.status).to.equal(1);
                const afterBalance = await erc20.balanceOf(owner);
                const diff = beforeBalance - afterBalance;
                expect(diff).to.equal(1);
            });

            it("Transfer function with insufficient balance fails", async function() {
                const receiver = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
                await expectRevert.unspecified(erc20.transfer(receiver, 10000));
            });

            it("No Approve and TransferFrom fails", async function() {
                const receiver = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
                const erc20AsOwner2 = erc20.connect(signer2);

                await expectRevert.unspecified(erc20AsOwner2.transferFrom(owner, receiver, 100));
            });

            it("Approve and TransferFrom functions", async function() {
                // lets have owner approve the transfer and have owner2 do the transferring
                const approvalAmount = await erc20.allowance(owner, owner2);
                expect(approvalAmount).to.equal(0);
                const approveTx = await erc20.approve(owner2, 100);
                const approveReceipt = await approveTx.wait();
                expect(approveReceipt.status).to.equal(1);
                expect(await erc20.allowance(owner, owner2)).to.equal(100);

                const erc20AsOwner2 = erc20.connect(signer2);


                // transfer from owner to owner2
                const balanceBefore = await erc20.balanceOf(owner2);
                const transferFromTx = await erc20AsOwner2.transferFrom(owner, owner2, 100);

                // await sleep(3000);
                const transferFromReceipt = await transferFromTx.wait();
                expect(transferFromReceipt.status).to.equal(1);
                const balanceAfter = await erc20.balanceOf(owner2);
                const diff = balanceAfter - balanceBefore;
                expect(diff).to.equal(100);
            });

            it("Balance of function", async function() {
                const balance = await erc20.balanceOf(owner);
                expect(balance).to.be.greaterThan(Number(0));
            });

            it("Name function", async function () {
                const name = await erc20.name()
                expect(name).to.equal('UATOM');
            });

            it("Symbol function", async function () {
                const symbol = await erc20.symbol()
                // expect symbol to be 'UATOM'
                expect(symbol).to.equal('UATOM');
            });
        });

        // TODO: Update when we add gov query precompiles
        describe("EVM Gov Precompile Tester", function () {
            let govProposal;
            // TODO: Import this
            const GovPrecompileContract = '0x0000000000000000000000000000000000001006';
            before(async function() {
                govProposal = readDeploymentOutput('gov_proposal_output.txt');
                await sleep(1000);

                // Create a proposal
                const [signer, _] = await ethers.getSigners();
                owner = await signer.getAddress();

                const contractABIPath = path.join(__dirname, '../../precompiles/gov/abi.json');
                const contractABI = require(contractABIPath);
                // Get a contract instance
                gov = new ethers.Contract(GovPrecompileContract, contractABI, signer);
            });

            it("Gov deposit", async function () {
                const depositAmount = ethers.parseEther('0.01');
                const deposit = await gov.deposit(govProposal, {
                    value: depositAmount,
                })
                const receipt = await deposit.wait();
                expect(receipt.status).to.equal(1);
                // TODO: Add gov query precompile here
            });
        });

        // TODO: Update when we add distribution query precompiles
        describe("EVM Distribution Precompile Tester", function () {
            // TODO: Import this
            const DistributionPrecompileContract = '0x0000000000000000000000000000000000001007';
            before(async function() {
                const [signer, signer2] = await ethers.getSigners();
                owner = await signer.getAddress();
                owner2 = await signer2.getAddress();

                const contractABIPath = path.join(__dirname, '../../precompiles/distribution/abi.json');
                const contractABI = require(contractABIPath);
                // Get a contract instance
                distribution = new ethers.Contract(DistributionPrecompileContract, contractABI, signer);
            });

            it("Distribution set withdraw address", async function () {
                const setWithdraw = await distribution.setWithdrawAddress(owner)
                const receipt = await setWithdraw.wait();
                expect(receipt.status).to.equal(1);
                // TODO: Add distribution query precompile here
            });
        });

        // TODO: Update when we add staking query precompiles
        describe("EVM Staking Precompile Tester", function () {
            const StakingPrecompileContract = '0x0000000000000000000000000000000000001005';
            before(async function() {
                validatorAddr = readDeploymentOutput('validator_address.txt');
                await sleep(1000);
                const [signer, _] = await ethers.getSigners();
                owner = await signer.getAddress();

                const contractABIPath = path.join(__dirname, '../../precompiles/staking/abi.json');
                const contractABI = require(contractABIPath);
                // Get a contract instance
                staking = new ethers.Contract(StakingPrecompileContract, contractABI, signer);
            });

            it("Staking delegate", async function () {
                const delegateAmount = ethers.parseEther('0.01');
                const delegate = await staking.delegate(validatorAddr, {
                    value: delegateAmount,
                });
                const receipt = await delegate.wait();
                expect(receipt.status).to.equal(1);
                // TODO: Add staking query precompile here
            });
        });

        describe("EVM Oracle Precompile Tester", function () {
            const OraclePrecompileContract = '0x0000000000000000000000000000000000001008';
            before(async function() {
                const exchangeRatesContent = readDeploymentOutput('oracle_exchange_rates.json');
                const twapsContent = readDeploymentOutput('oracle_twaps.json');

                exchangeRatesJSON = JSON.parse(exchangeRatesContent).denom_oracle_exchange_rate_pairs;
                twapsJSON = JSON.parse(twapsContent).oracle_twaps;

                const [signer, _] = await ethers.getSigners();
                owner = await signer.getAddress();

                const contractABIPath = path.join(__dirname, '../../precompiles/oracle/abi.json');
                const contractABI = require(contractABIPath);
                // Get a contract instance
                oracle = new ethers.Contract(OraclePrecompileContract, contractABI, signer);
            });

            it("Oracle Exchange Rates", async function () {
                const exchangeRates = await oracle.getExchangeRates();
                const exchangeRatesLen = exchangeRatesJSON.length;
                expect(exchangeRates.length).to.equal(exchangeRatesLen);

                for (let i = 0; i < exchangeRatesLen; i++) {
                    expect(exchangeRates[i].denom).to.equal(exchangeRatesJSON[i].denom);
                    expect(exchangeRates[i].oracleExchangeRateVal.exchangeRate).to.be.a('string').and.to.not.be.empty;
                    expect(exchangeRates[i].oracleExchangeRateVal.exchangeRate).to.be.a('string').and.to.not.be.empty;
                    expect(exchangeRates[i].oracleExchangeRateVal.lastUpdateTimestamp).to.exist.and.to.be.gt(0);
                }
            });

            it("Oracle Twaps", async function () {
                const twaps = await oracle.getOracleTwaps(3600);
                const twapsLen = twapsJSON.length
                expect(twaps.length).to.equal(twapsLen);

                for (let i = 0; i < twapsLen; i++) {
                    expect(twaps[i].denom).to.equal(twapsJSON[i].denom);
                    expect(twaps[i].twap).to.be.a('string').and.to.not.be.empty;
                    expect(twaps[i].lookbackSeconds).to.exist.and.to.be.gt(0);
                }
            });
        });

        describe("EVM Wasm Precompile Tester", function () {
            const WasmPrecompileContract = '0x0000000000000000000000000000000000001002';
            before(async function() {
                wasmContractAddress = readDeploymentOutput('wasm_contract_addr.txt');
                wasmCodeID = parseInt(readDeploymentOutput('wasm_code_id.txt'));

                const [signer, _] = await ethers.getSigners();
                owner = await signer.getAddress();

                const contractABIPath = path.join(__dirname, '../../precompiles/wasmd/abi.json');
                const contractABI = require(contractABIPath);
                // Get a contract instance
                wasmd = new ethers.Contract(WasmPrecompileContract, contractABI, signer);
            });

            it("Wasm Precompile Instantiate", async function () {
                encoder = new TextEncoder();

                queryCountMsg = {get_count: {}};
                queryStr = JSON.stringify(queryCountMsg);
                queryBz = encoder.encode(queryStr);

                instantiateMsg = {count: 2};
                instantiateStr = JSON.stringify(instantiateMsg);
                instantiateBz = encoder.encode(instantiateStr);

                coins = [];
                coinsStr = JSON.stringify(coins);
                coinsBz = encoder.encode(coinsStr);

                instantiate = await wasmd.instantiate(wasmCodeID, "", instantiateBz, "counter-contract", coinsBz);
                const receipt = await instantiate.wait();
                expect(receipt.status).to.equal(1);
                // TODO: is there any way to get the instantiate results for contract address - or in events?
            });

            it("Wasm Precompile Execute", async function () {
                expect(wasmContractAddress).to.not.be.empty;
                encoder = new TextEncoder();

                queryCountMsg = {get_count: {}};
                queryStr = JSON.stringify(queryCountMsg);
                queryBz = encoder.encode(queryStr);
                initialCountBz = await wasmd.query(wasmContractAddress, queryBz);
                initialCount = parseHexToJSON(initialCountBz)

                incrementMsg = {increment: {}};
                incrementStr = JSON.stringify(incrementMsg);
                incrementBz = encoder.encode(incrementStr);

                coins = [];
                coinsStr = JSON.stringify(coins);
                coinsBz = encoder.encode(coinsStr);

                execute = await wasmd.execute(wasmContractAddress, incrementBz, coinsBz);
                const receipt = await execute.wait();
                expect(receipt.status).to.equal(1);

                finalCountBz = await wasmd.query(wasmContractAddress, queryBz);
                finalCount = parseHexToJSON(finalCountBz)
                expect(finalCount.count).to.equal(initialCount.count + 1);
            });

            it("Wasm Precompile Batch Execute", async function () {
                expect(wasmContractAddress).to.not.be.empty;
                encoder = new TextEncoder();

                queryCountMsg = {get_count: {}};
                queryStr = JSON.stringify(queryCountMsg);
                queryBz = encoder.encode(queryStr);
                initialCountBz = await wasmd.query(wasmContractAddress, queryBz);
                initialCount = parseHexToJSON(initialCountBz)

                incrementMsg = {increment: {}};
                incrementStr = JSON.stringify(incrementMsg);
                incrementBz = encoder.encode(incrementStr);

                coins = [];
                coinsStr = JSON.stringify(coins);
                coinsBz = encoder.encode(coinsStr);

                executeBatch = [
                    {
                        contractAddress: wasmContractAddress,
                        msg: incrementBz,
                        coins: coinsBz,
                    },
                    {
                        contractAddress: wasmContractAddress,
                        msg: incrementBz,
                        coins: coinsBz,
                    },
                    {
                        contractAddress: wasmContractAddress,
                        msg: incrementBz,
                        coins: coinsBz,
                    },
                    {
                        contractAddress: wasmContractAddress,
                        msg: incrementBz,
                        coins: coinsBz,
                    },
                ];

                executeBatch = await wasmd.execute_batch(executeBatch);
                const receipt = await executeBatch.wait();
                expect(receipt.status).to.equal(1);

                finalCountBz = await wasmd.query(wasmContractAddress, queryBz);
                finalCount = parseHexToJSON(finalCountBz)
                expect(finalCount.count).to.equal(initialCount.count + 4);
            });

        });

    });
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function readDeploymentOutput(fileName) {
    let fileContent;
    try {
        if (fs.existsSync(fileName)) {
            fileContent = fs.readFileSync(fileName, 'utf8').trim();
        } else {
            console.error("File not found:", fileName);
        }
    } catch (error) {
        console.error(`Error reading file: ${error}`);
    }
    return fileContent;
}

function parseHexToJSON(hexStr) {
    // Remove the 0x prefix
    hexStr = hexStr.slice(2);
    // Convert to bytes
    const bytes = Buffer.from(hexStr, 'hex');
    // Convert to JSON
    return JSON.parse(bytes.toString());
}