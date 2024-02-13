import { Provider, utils } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// load env file
import dotenv from "dotenv";
dotenv.config();

// load contract artifact. Make sure to compile first!
import * as ContractArtifact from "../artifacts-zk/contracts/utils/Greeter.sol/Greeter.json";

const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || "";

if (!PRIVATE_KEY)
  throw "⛔️ Private key not detected! Add it to the .env file!";

// Put the address of the deployed paymaster here
const PAYMASTER_ADDRESS = "0xf51003FdF4C24a2a205c6030AA691808bfc7dA85";

// Address of the greeter contract on zksync
const CONTRACT_ADDRESS = "0xe9aaA9CD8dE0A5D3245e5F4eFf4befCbc7e19A37";

if (!CONTRACT_ADDRESS) throw "⛔️ Contract address not provided";

// An example of a deploy script that will deploy and call a simple contract.
export default async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Running script to interact with contract ${CONTRACT_ADDRESS}`);

  // Initialize the provider.
  // @ts-ignore
  const provider = new Provider(hre.userConfig.networks?.zkSyncMainnet?.url);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  let paymasterBalance = await provider.getBalance(PAYMASTER_ADDRESS);
  console.log(`Paymaster ETH balance is ${paymasterBalance.toString()}`);

  // Initialise contract instance
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    ContractArtifact.abi,
    signer,
  );

  // Read message from contract
  console.log(`The message is ${await contract.greet()}`);

  // send transaction to update the message via paymaster
  const gasPrice = await provider.getGasPrice();
  const newMessage = "still not gasless : (";
  const paymasterParams = utils.getPaymasterParams(PAYMASTER_ADDRESS, {
    type: "General",
    innerInput: new Uint8Array(), // empty bytes as paymaster does not use innerInput
  });

  const tx = await contract
    .connect(signer)
    .setGreeting(newMessage, {
      maxPriorityFeePerGas: ethers.BigNumber.from(0),
      maxFeePerGas: gasPrice,
      gasLimit: 600000, // hardhcoded
      customData: {
        gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
        paymasterParams,
      },
    });

  console.log(`Transaction to change the message is ${tx.hash}`);
  await tx.wait();

  // Read message after transaction
  console.log(`The message now is ${await contract.greet()}`);
}
