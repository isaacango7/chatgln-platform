const qrcode = require('qrcode-terminal')

const express = require('express')

const axios = require('axios')

const {

  Client,

  LocalAuth

} = require('whatsapp-web.js')


const app = express()

app.use(express.json())


// =========================
// CONFIG
// =========================

const API_URL =

  "https://chatgln-platform.onrender.com"


// =========================
// STORE SESSIONS
// =========================

const sessions = {}

const qrCodes = {}


// =========================
// CREATE WHATSAPP SESSION
// =========================

function createWhatsAppSession(

  assistantId

) {

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

        '--disable-setuid-sandbox'

      ]

    }

  })


  // =========================
  // QR EVENT
  // =========================

  client.on('qr', (qr) => {

    qrCodes[assistantId] = qr

    console.log('\nQR GENERATED:\n')

    qrcode.generate(qr, {

      small: true

    })

  })


  // =========================
  // READY
  // =========================

  client.on('ready', () => {

    console.log(

      `\nChatGLN connecté : ${assistantId}\n`

    )

  })


  // =========================
  // MESSAGE
  // =========================

  client.on(

    'message',

    async (message) => {

      try {

        if (

          message.from.includes(

            '@g.us'

          )

        ) {

          return

        }

        if (

          message.fromMe

        ) {

          return

        }

        const phone =

          message.from

        const userMessage =

          message.body

        console.log(

          '\n===================================='

        )

        console.log(

          'NEW MESSAGE'

        )

        console.log(

          '====================================\n'

        )

        console.log(

          userMessage

        )

        // =========================
        // API CALL
        // =========================

        const response =

          await axios.post(

            `${API_URL}/ai-response`,

            {

              assistant_id:

                assistantId,

              phone:

                phone,

              message:

                userMessage

            }

          )

        console.log(

          '\n===================================='

        )

        console.log(

          'AI RESPONSE'

        )

        console.log(

          '====================================\n'

        )

        console.log(

          response.data

        )

        // =========================
        // ASSISTANT OFF
        // =========================

        if (

          !response.data

            .assistant_status

        ) {

          return

        }

        // =========================
        // SEND MESSAGE
        // =========================

        await client.sendMessage(

          phone,

          response.data.reply

        )

      } catch (error) {

        console.log(

          '\nERROR:\n'

        )

        console.log(

          error.response?.data ||

          error.message

        )

      }

    }

  )

  client.initialize()

  sessions[assistantId] = client

  return client

}


// =========================
// START SESSION
// =========================

app.get(

  '/start/:assistantId',

  async (req, res) => {

    const assistantId =

      req.params.assistantId

    createWhatsAppSession(

      assistantId

    )

    res.json({

      success: true,

      assistant_id:

        assistantId,

      qr_page:

        `http://localhost:3000/qr/${assistantId}`

    })

  }

)


// =========================
// QR PAGE
// =========================

app.get(

  '/qr/:assistantId',

  async (req, res) => {

    const assistantId =

      req.params.assistantId

    const qr =

      qrCodes[assistantId]

    if (!qr) {

      return res.send(`

        <h1>

          QR en cours de génération...

        </h1>

      `)

    }

    res.send(`

    <html>

      <head>

        <title>

          ChatGLN QR

        </title>

      </head>

      <body style="

        background:black;

        color:white;

        font-family:sans-serif;

        text-align:center;

        padding-top:40px;

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

  }

)


// =========================
// HOME
// =========================

app.get('/', (req, res) => {

  res.json({

    status:

      'ChatGLN WhatsApp Engine Online 🚀'

  })

})


// =========================
// SERVER
// =========================

app.listen(3000, () => {

  console.log(

    '\n===================================='

  )

  console.log(

    'CHATGLN WHATSAPP ENGINE'

  )

  console.log(

    '====================================\n'

  )

})
