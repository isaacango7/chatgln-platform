require('dotenv').config();

const qrcode =
require('qrcode-terminal');

const axios =
require('axios');

const {

    Client,

    LocalAuth,

    MessageMedia

} = require(
    'whatsapp-web.js'
);

const client =
new Client({

    authStrategy:
        new LocalAuth(),

    puppeteer: {

        headless: true,

        args: [

            '--no-sandbox',

            '--disable-setuid-sandbox'

        ]

    }

});

client.on(
    'qr',
    (qr) => {

    qrcode.generate(
        qr,
        {
            small: true
        }
    );

});

client.on(
    'ready',
    () => {

    console.log(
        'ChatGLN connecté'
    );

});

client.on(
    'message',
    async (message) => {

    try {

        if (
            !message.body
        ) {

            return;

        }

        if (
            message.from.includes(
                'status'
            )
        ) {

            return;

        }

        if (
            message.from.includes(
                '@g.us'
            )
        ) {

            return;

        }

        const response =
        await axios.post(

            'http://127.0.0.1:8000/ai-response',

            {

                phone:
                    message.from,

                message:
                    message.body

            }

        );

        const ai =
        response.data;

        if (
            ai.assistant_status ===
            false
        ) {

            return;

        }

        // SEND PRODUCTS IMAGES

        if (

            ai.products &&

            ai.products.length > 0

        ) {

            for (
                const product
                of ai.products
            ) {

                try {

                    const media =
                    await MessageMedia
                    .fromUrl(

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

                    console.log(err);

                }

            }

        }

        // SEND TEXT

        if (
            ai.reply
        ) {

            await client.sendMessage(

                message.from,

                ai.reply

            );

        }

    } catch (error) {

        console.log(error);

    }

});

client.initialize();
