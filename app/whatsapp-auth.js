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

        // Mostrar estado de carga en el banner
        const banner = document.getElementById('wa-status-banner');
        if (banner) {
            banner.innerHTML = `
                <div class="status-dot" style="background: #f59e0b; animation: pulse 1s infinite;"></div>
                <div>
                    <strong style="display: block; font-size: 0.85rem;">Conectando WhatsApp...</strong>
                    <span style="font-size: 0.75rem;">Verificando con Meta</span>
                </div>
            `;
        }

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
            
            // Guardamos todos los datos en Firestore
            const wabaData = {
                whatsappConnected: true,
                metaSystemToken: result.accessToken,
                wabaId: result.wabaId || 'No disponible',
                phoneNumberId: result.phoneNumberId || 'No disponible',
                phoneNumber: result.phoneNumber || 'No disponible',
                connectedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('users').doc(user.uid).update(wabaData);
            
            console.log("✅ Datos guardados en Firestore:", wabaData);

            // Actualizar el banner del dashboard
            if (banner) {
                banner.classList.add('connected');
                const displayNumber = result.phoneNumber || '+52 ***';
                banner.innerHTML = `
                    <div class="status-dot"></div>
                    <div>
                        <strong style="display: block; font-size: 0.85rem;">WhatsApp Conectado</strong>
                        <span style="font-size: 0.75rem;">${displayNumber}</span>
                    </div>
                    <button class="btn btn-ghost btn-sm" style="margin-left: 10px;">Configurar</button>
                `;
            }

            alert("✅ ¡WhatsApp conectado con éxito!\n\nNúmero: " + (result.phoneNumber || 'Registrado') + "\nWABA ID: " + (result.wabaId || 'Guardado'));
            
        } catch (error) {
            console.error("Error al intercambiar código con Meta:", error);
            // Restaurar el banner si hay error
            if (banner) {
                banner.innerHTML = `
                    <div class="status-dot"></div>
                    <div>
                        <strong style="display: block; font-size: 0.85rem;">WhatsApp Desconectado</strong>
                        <span style="font-size: 0.75rem;">Error al conectar — intenta de nuevo</span>
                    </div>
                    <button class="btn btn-primary btn-sm" style="margin-left: 10px;" id="btn-connect-wa">Reintentar</button>
                `;
            }
            alert("Hubo un error al conectar WhatsApp: " + error.message);
        }
    }
});
