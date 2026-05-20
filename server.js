require('dotenv').config()

const express = require('express')
const axios = require('axios')
const qrcode = require('qrcode-terminal')

const {
  Client,
  LocalAuth
} = require('whatsapp-web.js')

const app = express()

app.use(express.json())

// ====================================
// CONFIG
// ====================================

const API_URL =
  process.env.API_URL

const PORT =
  process.env.PORT || 3000

// ====================================
// STORAGE
// ====================================

const sessions = {}

const qrCodes = {}

// ====================================
// CREATE SESSION
// ====================================

function createSession(assistantId) {

  if (sessions[assistantId]) {

    return sessions[assistantId]

  }

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

  })

  // ====================================
  // QR
  // ====================================

  client.on('qr', (qr) => {

    qrCodes[assistantId] = qr

    console.log('\n====================================')
    console.log('QR CODE GENERATED')
    console.log('====================================\n')

    qrcode.generate(qr, {
      small: true
    })

  })

  // ====================================
  // READY
  // ====================================

  client.on('ready', () => {

    console.log('\n====================================')
    console.log(`ASSISTANT CONNECTED : ${assistantId}`)
    console.log('====================================\n')

  })

  // ====================================
  // MESSAGE
  // ====================================

  client.on('message', async (message) => {

    try {

      if (message.fromMe) {
        return
      }

      if (message.from.includes('@g.us')) {
        return
      }

      const phone =
        message.from

      const userMessage =
        message.body

      console.log('\n====================================')
      console.log('NEW MESSAGE')
      console.log('====================================\n')

      console.log(userMessage)

      // ====================================
      // CALL AI API
      // ====================================

      const response =
        await axios.post(

          `${API_URL}/ai-response`,

          {

            assistant_id: assistantId,

            phone: phone,

            message: userMessage

          }

        )

      console.log('\n====================================')
      console.log('AI RESPONSE')
      console.log('====================================\n')

      console.log(response.data)

      // ====================================
      // ASSISTANT OFF
      // ====================================

      if (!response.data.assistant_status) {

        return

      }

      // ====================================
      // SEND MESSAGE
      // ====================================

      await client.sendMessage(

        phone,

        response.data.reply

      )

    } catch (error) {

      console.log('\n====================================')
      console.log('ERROR')
      console.log('====================================\n')

      console.log(

        error.response?.data ||

        error.message

      )

    }

  })

  client.initialize()

  sessions[assistantId] = client

  return client

}

// ====================================
// HOME
// ====================================

app.get('/', (req, res) => {

  res.json({

    status:
      'ChatGLN WhatsApp Engine Online 🚀'

  })

})

// ====================================
// START ASSISTANT
// ====================================

app.get('/start/:assistantId', async (req, res) => {

  const assistantId =
    req.params.assistantId

  createSession(assistantId)

  res.json({

    success: true,

    assistant_id: assistantId,

    qr_url:
      `${req.protocol}://${req.get('host')}/qr/${assistantId}`

  })

})

// ====================================
// QR PAGE
// ====================================

app.get('/qr/:assistantId', async (req, res) => {

  const assistantId =
    req.params.assistantId

  const qr =
    qrCodes[assistantId]

  if (!qr) {

    return res.send(`

      <html>

        <body style="

          background:black;

          color:white;

          display:flex;

          justify-content:center;

          align-items:center;

          height:100vh;

          font-family:sans-serif;

          flex-direction:column;

        ">

          <h1>

            QR en cours de génération...

          </h1>

        </body>

      </html>

    `)

  }

  res.send(`

    <html>

      <body style="

        background:black;

        color:white;

        display:flex;

        justify-content:center;

        align-items:center;

        height:100vh;

        font-family:sans-serif;

        flex-direction:column;

      ">

        <h1>

          Scanner WhatsApp

        </h1>

        <img
          src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}"
        />

        <h2>

          Assistant :

          ${assistantId}

        </h2>

      </body>

    </html>

  `)

})

// ====================================
// SERVER
// ====================================

app.listen(PORT, () => {

  console.log('\n====================================')
  console.log(`CHATGLN ENGINE RUNNING ON ${PORT}`)
  console.log('====================================\n')

})
