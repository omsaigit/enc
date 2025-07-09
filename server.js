const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const speakeasy = require('speakeasy');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static('.'));

// Proxy endpoint for Zerodha API
app.get('/api/profile', async (req, res) => {
    try {
        const response = await fetch('https://kite.zerodha.com/oms/user/profile', {
            method: 'GET',
            headers: {
                'x-kite-version': '3',
                'Authorization': 'enctoken kvntotnWo3TFLGey/kwufjRc7fBKvrCJ5gU9z/wsRe+6ZaR7xxIlQ30ghQTxwtrkUtVmcIMiPmfz9vrV3rRcMnkr+y+QF4WVbF0yMZbhsyPqZGHfJlmxlA=='
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log(data);
            res.json(data);
        } else {
            res.status(response.status).json({
                error: `HTTP ${response.status}: ${response.statusText}`
            });
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({
            error: 'Failed to fetch profile data',
            details: error.message
        });
    }
});

// TOTP generation endpoint
app.post('/api/totp/generate', (req, res) => {
    try {
        const { secret_key } = req.body;
        
        if (!secret_key) {
            return res.status(400).json({
                error: 'secret_key is required'
            });
        }

        // Generate TOTP token
        const token = speakeasy.totp({
            secret: secret_key,
            encoding: 'base32',
            digits: 6,
            step: 30 // 30 seconds window
        });

        // Get current timestamp
        const timestamp = Math.floor(Date.now() / 1000);
        const timeStep = Math.floor(timestamp / 30);

        res.json({
            success: true,
            token: token,
            timestamp: timestamp,
            timeStep: timeStep,
            remainingSeconds: 30 - (timestamp % 30)
        });

    } catch (error) {
        console.error('Error generating TOTP:', error);
        res.status(500).json({
            error: 'Failed to generate TOTP',
            details: error.message
        });
    }
});

// TOTP verification endpoint
app.post('/api/totp/verify', (req, res) => {
    try {
        const { secret_key, token } = req.body;
        
        if (!secret_key || !token) {
            return res.status(400).json({
                error: 'Both secret_key and token are required'
            });
        }

        // Verify TOTP token
        const verified = speakeasy.totp.verify({
            secret: secret_key,
            encoding: 'base32',
            token: token,
            window: 1, // Allow 1 time step before/after for clock skew
            digits: 6,
            step: 30
        });

        res.json({
            success: true,
            verified: verified
        });

    } catch (error) {
        console.error('Error verifying TOTP:', error);
        res.status(500).json({
            error: 'Failed to verify TOTP',
            details: error.message
        });
    }
});

// Get enctoken endpoint
app.post('/api/get-enctoken', async (req, res) => {
    try {
        const { userid, password, twofa } = req.body;
        
        if (!userid || !password || !twofa) {
            return res.status(400).json({
                error: 'userid, password, and twofa are required'
            });
        }

        const enctoken = await getEnctoken(userid, password, twofa);
        
        res.json({
            success: true,
            enctoken: enctoken
        });

    } catch (error) {
        console.error('Error getting enctoken:', error);
        res.status(500).json({
            error: 'Failed to get enctoken',
            details: error.message
        });
    }
});

// Function to get enctoken (converted from Python)
async function getEnctoken(userid, password, twofa) {
    try {
        // First request - login
        const loginResponse = await fetch('https://kite.zerodha.com/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'user_id': userid,
                'password': password
            })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
        }

        const loginData = await loginResponse.json();
        
        if (!loginData.data || !loginData.data.request_id || !loginData.data.user_id) {
            throw new Error('Invalid login response structure');
        }

        // Second request - 2FA
        const twofaResponse = await fetch('https://kite.zerodha.com/api/twofa', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'request_id': loginData.data.request_id,
                'twofa_value': twofa,
                'user_id': loginData.data.user_id
            })
        });

        if (!twofaResponse.ok) {
            throw new Error(`2FA failed: ${twofaResponse.status} ${twofaResponse.statusText}`);
        }

        console.log("Response Status Code:", twofaResponse.status);
        console.log("Cookies:", twofaResponse.headers.get('set-cookie'));

        // Get enctoken from cookies
        const cookies = twofaResponse.headers.get('set-cookie');
        let enctoken = null;

        if (cookies) {
            console.log("Processing cookies:", cookies);
            // Split multiple cookies if present
            const cookieArray = cookies.split(',');
            console.log("Cookie array:", cookieArray);
            
            for (const cookie of cookieArray) {
                console.log("Checking cookie:", cookie);
                // Find the enctoken cookie
                if (cookie.includes('enctoken=')) {
                    const enctokenMatch = cookie.match(/enctoken=([^;]+)/);
                    if (enctokenMatch) {
                        enctoken = enctokenMatch[1];
                        console.log("Found enctoken:", enctoken);
                        break;
                    }
                }
            }
        }

        console.log("Final enctoken:", enctoken);

        if (enctoken) {
            // Save to config.json
            try {
                let configData = {};
                if (fs.existsSync('config.json')) {
                    const configContent = fs.readFileSync('config.json', 'utf8');
                    configData = JSON.parse(configContent);
                }
                
                configData.enctoken = enctoken;
                fs.writeFileSync('config.json', JSON.stringify(configData, null, 2));
                console.log('Enctoken saved to config.json');
            } catch (fileError) {
                console.error('Error saving to config.json:', fileError);
            }

            console.log('Enctoken:', enctoken);
            return enctoken;
        } else {
            throw new Error('Enter valid details !!!!');
        }

    } catch (error) {
        console.error('Error in getEnctoken:', error);
        throw error;
    }
}

// Serve the HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve the TOTP test page
app.get('/totp', (req, res) => {
    res.sendFile(path.join(__dirname, 'totp-test.html'));
});

// Serve the enctoken test page
app.get('/enctoken', (req, res) => {
    res.sendFile(path.join(__dirname, 'enctoken-test.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Open your browser and navigate to the URL above');
}); 