const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Merchant = require('../modals/metchantmodel');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { merchantEmail, password } = req.body;

        const merchantId = crypto.randomUUID().toString();
        const { privateKey, publicKey } = await crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
        const privateHex = Buffer.from(privateKey, 'utf-8').toString('hex');
        const publicHex = Buffer.from(publicKey, 'utf-8').toString('hex');
        
        const merchantSecretKey = privateKey
        console.log(merchantSecretKey)
        const merchantPublicKey = publicKey
        console.log(merchantPublicKey)


        const merchant = new Merchant({
            merchantId,
            merchantEmail,
            merchantKey: merchantPublicKey.toString(),
            merchantSecretKey,
            merchantPublicKey,
            password: password,
            xrpaddr: req.body.xrpaddr
        });

        await merchant.save();
        res.status(201).send('Merchant registered successfully.');
    } catch (error) {
        console.log(error)
        res.status(500).send('Error registering merchant.');
    }
});

router.post('/login', async (req, res) => {
    try {
        const { merchantEmail, password } = req.body;

        const merchant = await Merchant.findOne({ merchantEmail });

        if (!merchant) {
            return res.status(401).send('Authentication failed.');
        }

        const isMatch = (merchant.password == password)

        if (!isMatch) {
            return res.status(401).send('Authentication failed.');
        }

        const token = jwt.sign({ merchantId: merchant._id }, 'yourSecretKey', { expiresIn: '1h' });

        res.json({ token });
    } catch (error) {
        res.status(500).send('Error logging in.');
    }
});

const jwtMiddleware = (req, res, next) => {
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(401).send('No token, authorization denied.');
    }

    try {
        const decoded = jwt.verify(token, 'yourSecretKey');
        req.merchantId = decoded.merchantId;
        next();
    } catch (error) {
        res.status(401).send('Token is not valid.');
    }
};

router.get('/getkey', jwtMiddleware, async (req, res) => {
    try {
        const merchant = await Merchant.findById(req.merchantId);

        if (!merchant) {
            return res.status(404).send('Merchant not found.');
        }

        // Only return keys if the authenticated merchant is requesting their own keys
        if (merchant._id.toString() !== req.merchantId.toString()) {
            return res.status(403).send('Access denied.');
        }

        const { merchantSecretKey, merchantKey,merchantId,xrpaddr,merchantEmail } = merchant;
        res.json({ merchantSecretKey, merchantKey,merchantId,xrpaddr,merchantEmail});
    } catch (error) {
        console.log(error)
        res.status(500).send('Error getting keys.');
    }
});


module.exports = { router, jwtMiddleware };
