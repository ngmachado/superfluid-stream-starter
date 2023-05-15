require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const ethers = require('ethers');
const metadata = require("@superfluid-finance/metadata/networks.json");

const ISuperfluid = require("@superfluid-finance/ethereum-contracts/build/contracts/ISuperfluid");
const IConstantFlowAgreementV1 = require("@superfluid-finance/ethereum-contracts/build/contracts/IConstantFlowAgreementV1");
const cfaInterface = new ethers.Interface(IConstantFlowAgreementV1.abi);

const privateKey = process.env.PRIVATE_KEY;
const jwtSecret = process.env.JWT_SECRET;
const allowedUsers = [
    { username: process.env.USERNAME, password: process.env.PASSWORD },
    // Add more users as needed
];

const allowedNetworks = ['100', '5'];

const tokensByNetwork = {
    '100': '0xF2d68898557cCb2Cf4C10c3Ef2B034b2a69DAD00',
    '5': '0xF2d68898557cCb2Cf4C10c3Ef2B034b2a69DAD00'
};

// Initialize the Express app
const app = express();

app.use(bodyParser.json());
app.use(cors());

app.use(session({
    secret: 'YOUR_SECRET', // replace this with your own secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // set this to true if you're using HTTPS
}));

app.use(express.static('public'));
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    const user = allowedUsers.find(u => u.username === username && u.password === password);

    if (user) {
        req.session.user = user;
        res.json({ authenticated: true });
    } else {
        res.status(401).json({ error: 'Incorrect username or password.' });
    }
});

app.get('/streamer', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'streamer.html'));
    } else {
        res.redirect('/');
    }
});


app.post('/api/startstream', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { address, network } = req.body;
    console.log(`Address: ${address}, Network: ${network}`);

    if (!validateRequest(address, network, res)) return;

    try {
        const networkData = getNetworkData(network);
        if (!networkData) {
            return res.status(400).json({ error: 'Invalid network configuration.' });
        }

        const log = await createFlow(networkData, address, network);
        const link = `https://app.superfluid.finance/stream/${networkData.shortName}/${log.from}-${address}-${tokensByNetwork[network]}`;
        console.log("link: ", link);
        res.status(200).json({ message: link});

    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: 'Transaction error.' });
    }
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`Username: ${username}, Password: ${password}`)
    // check if username and password are correct using allowedUsers object
    const user = allowedUsers.find(u => u.username === username && u.password === password);
    if (user) {
        // generate token and return it
        const token = jwt.sign({ sub: user.username }, jwtSecret);
        res.json({ token });
    } else {
        // return 401 not authorised if user details are not correct
        res.status(401).json({ error: 'Incorrect username or password.' });
    }
});
// Utility functions
function validateRequest(address, network, res) {
    if (!address || !network) {
        res.status(400).json({ error: 'Address and network are required.' });
        return false;
    }

    try {
        ethers.getAddress(address);
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Invalid address.' });
        return false;
    }

    if (!allowedNetworks.includes(network)) {
        res.status(400).json({ error: 'Invalid network.' });
        return false;
    }

    return true;
}

function getNetworkData(network) {
    return metadata.find(x => x.chainId === Number(network));
}

async function createFlow(networkData, address, network) {
    console.log("createFlow");
    const provider = new ethers.JsonRpcProvider(networkData.publicRPCs[0]);
    const wallet = new ethers.Wallet(privateKey, provider);
    const host = new ethers.Contract(networkData.contractsV1.host, ISuperfluid.abi, wallet);

    console.log("wallet: ", wallet.address);

    const txData = cfaInterface.encodeFunctionData("createFlow", [
        tokensByNetwork[network],
        address,
        "1000000",
        "0x",
    ]);

    const tx = await host.callAgreement(networkData.contractsV1.cfaV1, txData, "0x");
    console.log("tx: ", tx)
    const log = await tx.wait();
    console.log(JSON.stringify(log));
    return log;
}

// Start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
