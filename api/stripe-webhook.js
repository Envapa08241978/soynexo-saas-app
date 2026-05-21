const Stripe = require('stripe');
const admin = require('firebase-admin');

// La clave se configura en las variables de entorno de Vercel (STRIPE_SECRET_KEY)
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);


// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
    try {
        // En producción, debe estar configurado en las variables de entorno de Vercel
        const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (serviceAccountRaw) {
            const serviceAccount = JSON.parse(serviceAccountRaw);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            console.error("Falta FIREBASE_SERVICE_ACCOUNT en env variables.");
            // Inicializar por defecto (podría fallar si no hay default ADC)
            admin.initializeApp();
        }
    } catch (error) {
        console.error('Error inicializando Firebase Admin:', error);
    }
}

const db = admin.firestore();

// Necesitamos el raw body para verificar la firma del webhook de Stripe
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const payload = req.body;
    // En producción deberías verificar la firma del webhook con endpointSecret
    // const sig = req.headers['stripe-signature'];
    // const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    // let event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);

    // Simplificamos asumiendo que Stripe nos manda el body parseado por Vercel para este MVP
    // Para mayor seguridad en prod, se DEBE verificar la firma.
    let event = payload;

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        
        // Extraer metadata que pusimos al crear la sesión
        const { uid, messagesAmount } = session.metadata || {};

        if (uid && messagesAmount) {
            try {
                const amountToAdd = parseInt(messagesAmount);
                const userRef = db.collection('users').doc(uid);
                
                // Actualizar el saldo atómicamente (suma segura)
                await userRef.update({
                    balanceMessages: admin.firestore.FieldValue.increment(amountToAdd)
                });
                
                console.log(`✅ Saldo actualizado: +${amountToAdd} msjs para el usuario ${uid}`);
            } catch (error) {
                console.error('❌ Error actualizando Firestore:', error);
                return res.status(500).json({ error: 'Error actualizando base de datos' });
            }
        } else {
            console.log('⚠️ Session sin metadata (uid o messagesAmount)');
        }
    }

    res.status(200).json({ received: true });
};
