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
                    const accessToken = response.authResponse.accessToken;
                    console.log('Login exitoso. Token obtenido.');
                    
                    // Aquí es donde normalmente enviaríamos el accessToken a nuestro backend
                    // para intercambiarlo por un token de sistema y obtener los WABA_ID.
                    // En este punto, simularemos guardar la conexión exitosa en Firestore.
                    
                    guardarConexionEnFirestore(accessToken);
                    
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

    function guardarConexionEnFirestore(accessToken) {
        const user = auth.currentUser;
        if (!user) return;

        // Simulamos obtener el número y los IDs después del Embedded Signup
        const wabaData = {
            whatsappConnected: true,
            whatsappNumber: '5512345678', // Esto debería venir de la API de Meta
            wabaId: 'MOCK_WABA_ID',
            phoneNumberId: 'MOCK_PHONE_ID',
            metaAccessToken: accessToken,
            connectedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection('users').doc(user.uid).update(wabaData)
            .then(() => {
                console.log("Datos de WhatsApp guardados en Firestore correctamente.");
                alert("¡WhatsApp conectado con éxito!");
            })
            .catch((error) => {
                console.error("Error al guardar en Firestore:", error);
                alert("Error al conectar. Revisa la consola.");
            });
    }
});
