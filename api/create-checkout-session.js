const Stripe = require('stripe');

// La clave se configura en las variables de entorno de Vercel (STRIPE_SECRET_KEY)
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    // Vercel Serverless Function handling CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { uid, packageId, price, messagesAmount } = req.body;

        if (!uid || !packageId || !price || !messagesAmount) {
            return res.status(400).json({ error: 'Faltan parámetros' });
        }

        // Determinar la URL base de forma dinámica
        // req.headers.origin o referer usualmente nos dicen de dónde viene la petición
        const origin = req.headers.origin || `https://${req.headers.host}`;

        // Crear sesión de Stripe Checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'mxn',
                        product_data: {
                            name: `Paquete de ${messagesAmount} mensajes`,
                            description: `Recarga de saldo para Soy Nexo.`,
                            // Opcional: images: ['https://tudominio.com/logo.png'],
                        },
                        unit_amount: price, // El precio ya viene en centavos ($500.00 = 50000)
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            metadata: {
                uid: String(uid),
                packageId: String(packageId),
                messagesAmount: String(messagesAmount)
            },
            success_url: `${origin}/app/index.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/app/index.html?payment=cancel`,
        });

        res.status(200).json({ id: session.id });
    } catch (error) {
        console.error('Error creando Checkout Session:', error);
        res.status(500).json({ error: error.message });
    }
};
