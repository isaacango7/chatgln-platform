require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const QRCode = require('qrcode');

const {
    Client,
    LocalAuth,
    MessageMedia
} = require('whatsapp-web.js');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3000;

// =========================
// MEMORY
// =========================

const sessions = {};
const qrCodes = {};
const connectedSessions = {};

// =========================
// CREATE SESSION
// =========================

async function createSession(assistantId) {

    // éviter doublon

    if (sessions[assistantId]) {

        return;

    }

    console.log(`
====================================
STARTING SESSION:
${assistantId}
====================================
`);

    const client = new Client({

        authStrategy: new LocalAuth({

            clientId: assistantId

        }),

        puppeteer: {

            headless: true,

            args: [

                '--no-sandbox',

                '--disable-setuid-sandbox',

                '--disable-dev-shm-usage'

            ]

        }

    });

    // =========================
    // QR EVENT
    // =========================

    client.on('qr', async (qr) => {

        console.log(`
QR GENERATED:
${assistantId}
`);

        try {

            const qrImage = await QRCode.toDataURL(qr);

            qrCodes[assistantId] = qrImage;

        } catch (err) {

            console.log(`
QR ERROR
`);

            console.log(err);

        }

    });

    // =========================
    // READY EVENT
    // =========================

    client.on('ready', () => {

        console.log(`
====================================
CHATGLN CONNECTED:
${assistantId}
====================================
`);

        connectedSessions[assistantId] = true;

    });

    // =========================
    // AUTHENTICATED
    // =========================

    client.on('authenticated', () => {

        console.log(`
AUTHENTICATED:
${assistantId}
`);

    });

    // =========================
    // AUTH FAILURE
    // =========================

    client.on('auth_failure', (msg) => {

        console.log(`
AUTH FAILURE:
${assistantId}
`);

        console.log(msg);

    });

    // =========================
    // DISCONNECTED
    // =========================

    client.on('disconnected', (reason) => {

        console.log(`
DISCONNECTED:
${assistantId}
`);

        console.log(reason);

        delete sessions[assistantId];
        delete connectedSessions[assistantId];

    });

    // =========================
    // MESSAGE EVENT
    // =========================

    client.on('message', async (message) => {

        try {

            // =========================
            // FILTERS
            // =========================

            if (!message.body) {

                return;

            }

            if (message.from.includes('status')) {

                return;

            }

            if (message.from.includes('@g.us')) {

                return;

            }

            console.log(`
====================================
NEW MESSAGE
====================================
`);

            console.log(message.body);

            // =========================
            // CALL AI BACKEND
            // =========================

            const response = await axios.post(

                'http://127.0.0.1:8000/ai-response',

                {

                    assistant_id: assistantId,

                    phone: message.from,

                    message: message.body

                }

            );

            const ai = response.data;

            console.log(`
====================================
AI RESPONSE
====================================
`);

            console.log(ai);

            // =========================
            // ASSISTANT OFF
            // =========================

            if (ai.assistant_status === false) {

                console.log(`
ASSISTANT DISABLED
`);

                return;

            }

            // =========================
            // SEND PRODUCTS
            // =========================

            if (

                ai.products &&

                ai.products.length > 0

            ) {

                console.log(`
====================================
SENDING PRODUCTS
====================================
`);

                for (const product of ai.products) {

                    try {

                        console.log(product);

                        if (!product.image_url) {

                            continue;

                        }

                        const media =
                        await MessageMedia.fromUrl(

                            product.image_url,

                            {

                                unsafeMime: true

                            }

                        );

                        await client.sendMessage(

                            message.from,

                            media,

                            {

                                caption:
                                `${product.product_name}`

                            }

                        );

                    } catch (err) {

                        console.log(`
MEDIA ERROR
`);

                        console.log(err);

                    }

                }

            }

            // =========================
            // SEND REPLY
            // =========================

            if (ai.reply) {

                await client.sendMessage(

                    message.from,

                    ai.reply

                );

            }

        } catch (error) {

            console.log(`
====================================
GLOBAL ERROR
====================================
`);

            console.log(error);

        }

    });

    // =========================
    // INITIALIZE
    // =========================

    client.initialize();

    sessions[assistantId] = client;

}

// =========================
// START SESSION
// =========================

app.get('/start/:assistantId', async (req, res) => {

    try {

        const assistantId = req.params.assistantId;

        await createSession(assistantId);

        res.json({

            success: true,

            assistant_id: assistantId,

            qr_page:

            `http://localhost:${PORT}/qr/${assistantId}`

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

});

// =========================
// QR PAGE
// =========================

app.get('/qr/:assistantId', async (req, res) => {

    const assistantId = req.params.assistantId;

    // connecté

    if (connectedSessions[assistantId]) {

        return res.send(`

<html>

<head>

<title>
ChatGLN Connected
</title>

<style>

body {

    margin:0;

    background:#020617;

    color:white;

    font-family:sans-serif;

    display:flex;

    justify-content:center;

    align-items:center;

    flex-direction:column;

    height:100vh;

}

.card {

    background:#111827;

    padding:50px;

    border-radius:25px;

    text-align:center;

    box-shadow:
    0 0 40px rgba(
        0,
        0,
        0,
        0.5
    );

}

h1 {

    color:#22c55e;

}

</style>

</head>

<body>

<div class="card">

<h1>
✅ ChatGLN connecté à WhatsApp
</h1>

<p>
Assistant:
${assistantId}
</p>

</div>

</body>

</html>

`);

    }

    const qr = qrCodes[assistantId];

    // QR pas encore prêt

    if (!qr) {

        return res.send(`

<html>

<head>

<meta
http-equiv="refresh"
content="2"
/>

<style>

body {

    margin:0;

    background:#020617;

    color:white;

    font-family:sans-serif;

    display:flex;

    justify-content:center;

    align-items:center;

    height:100vh;

}

.card {

    background:#111827;

    padding:50px;

    border-radius:25px;

}

</style>

</head>

<body>

<div class="card">

<h1>
QR en cours de génération...
</h1>

</div>

</body>

</html>

`);

    }

    // QR READY

    res.send(`

<html>

<head>

<title>
ChatGLN QR
</title>

<meta
http-equiv="refresh"
content="3"
/>

<style>

body {

    margin:0;

    background:#020617;

    color:white;

    font-family:sans-serif;

    display:flex;

    justify-content:center;

    align-items:center;

    flex-direction:column;

    height:100vh;

}

.container {

    background:#111827;

    padding:40px;

    border-radius:25px;

    box-shadow:
    0 0 40px rgba(
        0,
        0,
        0,
        0.5
    );

    text-align:center;

}

img {

    background:white;

    padding:15px;

    border-radius:20px;

    margin-top:20px;

}

h1 {

    margin-bottom:10px;

}

p {

    opacity:0.7;

}

button {

    margin-top:20px;

    border:none;

    background:#22c55e;

    color:white;

    padding:15px 25px;

    border-radius:12px;

    cursor:pointer;

    font-size:16px;

}

</style>

</head>

<body>

<div class="container">

<h1>
Scanner WhatsApp
</h1>

<p>
Assistant:
${assistantId}
</p>

<img
src="${qr}"
width="320"
/>

<p>
Le QR se met à jour automatiquement
</p>

<button onclick="downloadQR()">
Télécharger QR
</button>

</div>

<script>

function downloadQR() {

    const a =
    document.createElement('a');

    a.href =
    "${qr}";

    a.download =
    "chatgln-qr.png";

    a.click();

}

</script>

</body>

</html>

`);

});

// =========================
// STATUS
// =========================

app.get('/status/:assistantId', (req, res) => {

    const assistantId = req.params.assistantId;

    res.json({

        assistant_id: assistantId,

        connected:

        connectedSessions[assistantId]
        || false

    });

});

// =========================
// ROOT
// =========================

app.get('/', (req, res) => {

    res.send(`

<h1>
ChatGLN WhatsApp Engine Running
</h1>

`);

});

// =========================
// START SERVER
// =========================

app.listen(PORT, () => {

    console.log(`
====================================
CHATGLN WHATSAPP ENGINE
RUNNING ON PORT ${PORT}
====================================
`);

});
