document.addEventListener('DOMContentLoaded', () => {
    
    // Auth Listener
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Usuario Autenticado
            cargarDatosUsuario(user);
        } else {
            // No autenticado, redirigir al login
            window.location.replace('login.html');
        }
    });

    function cargarDatosUsuario(user) {
        // UI Elements
        const loader = document.getElementById('loader');
        const userNameEl = document.getElementById('user-name');
        const welcomeText = document.getElementById('welcome-text');
        const avatarEl = document.getElementById('user-avatar');
        const balanceVal = document.getElementById('balance-val');
        const waStatusBanner = document.getElementById('wa-status-banner');

        // Escuchar datos de Firestore en tiempo real
        db.collection('users').doc(user.uid).onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                
                // Nombres
                const nombre = data.name || user.displayName || 'Usuario';
                userNameEl.innerText = nombre;
                welcomeText.innerText = `Hola, ${nombre.split(' ')[0]}`;
                avatarEl.innerText = nombre.charAt(0).toUpperCase();

                // Balance (Si no tiene, le damos 100 por default por el error anterior)
                if (data.balanceMessages === undefined) {
                    db.collection('users').doc(user.uid).update({ balanceMessages: 100 });
                    balanceVal.innerText = '100';
                } else {
                    balanceVal.innerText = data.balanceMessages.toLocaleString();
                }

                // WhatsApp Status
                if (data.whatsappConnected) {
                    waStatusBanner.classList.add('connected');
                    waStatusBanner.innerHTML = `
                        <div class="status-dot"></div>
                        <div>
                            <strong style="display: block; font-size: 0.85rem;">WhatsApp Conectado</strong>
                            <span style="font-size: 0.75rem;">+52 ${data.whatsappNumber || '***'}</span>
                        </div>
                        <button class="btn btn-ghost btn-sm" id="btn-config-wa" style="margin-left: 10px; border-color: rgba(34,197,94,0.3); color:#86efac;">Configurar</button>
                    `;
                }

                // Ocultar Loader
                setTimeout(() => {
                    loader.style.opacity = '0';
                    setTimeout(() => loader.style.display = 'none', 300);
                }, 500);
            } else {
                console.log("No existe el documento. Creándolo ahora...");
                // Crear el documento faltante con los datos iniciales
                db.collection('users').doc(user.uid).set({
                    name: user.displayName || user.email,
                    email: user.email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    balanceMessages: 100,
                    status: 'active',
                    whatsappConnected: false
                }).catch(err => console.error("Error creando doc:", err));
                
                // Fallback visual temporal mientras se crea en la base de datos
                userNameEl.innerText = user.email || 'Usuario';
                balanceVal.innerText = '100'; // Mostrar 100 optimísticamente
                loader.style.display = 'none';
            }
        }, (error) => {
            console.error("Error obteniendo datos:", error);
            loader.style.display = 'none';
        });
    }

    // Logout
    document.getElementById('btn-logout').addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut().then(() => {
            window.location.replace('login.html');
        }).catch((error) => {
            console.error("Error al cerrar sesión:", error);
        });
    });

    // Navegación (Tabs)
    const navInicio = document.getElementById('nav-inicio');
    const navContactos = document.getElementById('nav-contactos');
    const navCampanas = document.getElementById('nav-campanas');
    const navPlantillas = document.getElementById('nav-plantillas');
    const navRecargar = document.getElementById('nav-recargar');
    
    const sectionInicio = document.getElementById('section-inicio');
    const sectionContactos = document.getElementById('section-contactos');
    const sectionCampanas = document.getElementById('section-campanas');
    const sectionPlantillas = document.getElementById('section-plantillas');
    const sectionRecargar = document.getElementById('section-recargar');

    function switchTab(tab) {
        if (!navInicio || !navContactos || !navCampanas || !navPlantillas) return;
        navInicio.classList.remove('active');
        navContactos.classList.remove('active');
        navCampanas.classList.remove('active');
        navPlantillas.classList.remove('active');
        if(navRecargar) navRecargar.classList.remove('active');
        
        sectionInicio.style.display = 'none';
        sectionContactos.style.display = 'none';
        if(sectionCampanas) sectionCampanas.style.display = 'none';
        if(sectionPlantillas) sectionPlantillas.style.display = 'none';
        if(sectionRecargar) sectionRecargar.style.display = 'none';

        if (tab === 'inicio') {
            navInicio.classList.add('active');
            sectionInicio.style.display = 'block';
        } else if (tab === 'contactos') {
            navContactos.classList.add('active');
            sectionContactos.style.display = 'block';
        } else if (tab === 'campanas') {
            navCampanas.classList.add('active');
            if(sectionCampanas) sectionCampanas.style.display = 'block';
            
            // Notificar que se abrió la pestaña (para cargar campañas)
            window.dispatchEvent(new Event('campanas-tab-active'));
        } else if (tab === 'plantillas') {
            navPlantillas.classList.add('active');
            if(sectionPlantillas) sectionPlantillas.style.display = 'block';
            
            // Notificar que se abrió la pestaña (para cargar plantillas si es necesario)
            window.dispatchEvent(new Event('plantillas-tab-active'));
        } else if (tab === 'recargar') {
            if(navRecargar) navRecargar.classList.add('active');
            if(sectionRecargar) sectionRecargar.style.display = 'block';
        }
    }

    if (navInicio) navInicio.addEventListener('click', (e) => { e.preventDefault(); switchTab('inicio'); });
    if (navContactos) navContactos.addEventListener('click', (e) => { e.preventDefault(); switchTab('contactos'); });
    if (navCampanas) navCampanas.addEventListener('click', (e) => { e.preventDefault(); switchTab('campanas'); });
    if (navPlantillas) navPlantillas.addEventListener('click', (e) => { e.preventDefault(); switchTab('plantillas'); });
    if (navRecargar) navRecargar.addEventListener('click', (e) => { e.preventDefault(); switchTab('recargar'); });

});
