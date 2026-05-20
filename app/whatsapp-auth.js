document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar Facebook SDK
    window.fbAsyncInit = function() {
        FB.init({
            appId      : '32643043931978281', // Reemplazar con el App ID real
            cookie     : true,
            xfbml      : true,
            version    : 'v19.0'
        });
        console.log("Facebook SDK inicializado");
    };

    // 2. Manejar el clic en "Conectar WhatsApp"
    const btnConnectWa = document.getElementById('btn-connect-wa');
    
    if (btnConnectWa) {
        btnConnectWa.addEventListener('click', () => {
            console.log("Iniciando flujo Embedded Signup...");
            
            // Lanzar FB Login con configuración de WhatsApp (Tech Provider)
            FB.login((response) => {
                if (response.authResponse) {
                    const code = response.authResponse.code;
                    console.log('Login exitoso. Code obtenido:', code);
                    
                    // Aquí es donde normalmente enviaríamos el code a nuestro backend
                    // para intercambiarlo por un token de sistema y obtener los WABA_ID.
                    // En este punto, simularemos guardar la conexión exitosa en Firestore.
                    
                    guardarConexionEnFirestore(code);
                    
                } else {
                    console.log('El usuario canceló el inicio de sesión o no lo autorizó por completo.');
                }
            }, {
                config_id: '1956035225278065', // Configuration ID para Soy Nexo
                response_type: 'code',
                override_default_response_type: true,
                extras: {
                    setup: {},
                    featureType: '',
                    sessionInfoVersion: '2'
                }
            });
        });
    }

    async function guardarConexionEnFirestore(code) {
        const user = auth.currentUser;
        if (!user) return;

        console.log("Enviando código al backend de Vercel...");
        
        try {
            // Llamamos a la API Serverless de Vercel
            const response = await fetch('/api/exchangeMetaCode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code: code })
            });
            
            const result = await response.json();
            
            if (!response.ok || !result.success) {
                throw new Error(result.error || "Error desconocido en el servidor");
            }
            
            console.log("Token obtenido exitosamente:", result);
            
            // Guardamos los datos en Firestore desde el cliente
            const wabaData = {
                whatsappConnected: true,
                metaSystemToken: result.accessToken,
                wabaId: result.wabaId || 'No disponible',
                connectedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('users').doc(user.uid).update(wabaData);
            
            console.log("Datos guardados en Firestore correctamente.");
            alert("¡WhatsApp conectado con éxito!");
            
        } catch (error) {
            console.error("Error al intercambiar código con Meta:", error);
            alert("Hubo un error al conectar WhatsApp. Revisa la consola.");
        }
    }
});
