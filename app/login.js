document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const groupName = document.getElementById('group-name');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const btnSubmit = document.getElementById('btn-submit');
    const errorMsg = document.getElementById('error-msg');
    const authForm = document.getElementById('auth-form');
    const btnGoogle = document.getElementById('btn-google');

    let isRegisterMode = false;

    // Verificar si el usuario ya está logueado
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Usuario está logueado, redirigir al panel
            window.location.href = 'index.html';
        }
    });

    // Cambiar entre Login y Registro
    function setMode(register) {
        isRegisterMode = register;
        errorMsg.style.display = 'none';
        
        if (register) {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            groupName.style.display = 'block';
            authTitle.innerText = 'Crea tu cuenta';
            authSubtitle.innerText = 'Comienza a conectar con tu audiencia hoy mismo';
            btnSubmit.innerText = 'Crear Cuenta';
            document.getElementById('input-name').required = true;
        } else {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            groupName.style.display = 'none';
            authTitle.innerText = 'Bienvenido de vuelta';
            authSubtitle.innerText = 'Ingresa a tu panel de control masivo';
            btnSubmit.innerText = 'Ingresar al Panel';
            document.getElementById('input-name').required = false;
        }
    }

    tabLogin.addEventListener('click', () => setMode(false));
    tabRegister.addEventListener('click', () => setMode(true));

    // Mostrar Error
    function showError(message) {
        errorMsg.innerText = message;
        errorMsg.style.display = 'block';
        btnSubmit.disabled = false;
        btnSubmit.innerText = isRegisterMode ? 'Crear Cuenta' : 'Ingresar al Panel';
    }

    // Auth con Google
    btnGoogle.addEventListener('click', () => {
        auth.signInWithPopup(googleProvider)
            .then((result) => {
                const user = result.user;
                // Guardar/Actualizar perfil en Firestore
                db.collection('users').doc(user.uid).set({
                    name: user.displayName,
                    email: user.email,
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'active'
                }, { merge: true }).then(() => {
                    window.location.href = 'index.html';
                });
            })
            .catch((error) => {
                showError("Error con Google: " + error.message);
            });
    });

    // Auth con Email/Contraseña
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('input-email').value;
        const password = document.getElementById('input-password').value;
        const name = document.getElementById('input-name').value;

        btnSubmit.disabled = true;
        btnSubmit.innerText = 'Cargando...';
        errorMsg.style.display = 'none';

        if (isRegisterMode) {
            // REGISTRO
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    // Actualizar nombre en auth
                    return user.updateProfile({ displayName: name }).then(() => {
                        // Guardar en Firestore con saldo inicial
                        return db.collection('users').doc(user.uid).set({
                            name: name,
                            email: email,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            balanceMessages: 100, // Saldo de prueba gratis
                            status: 'active',
                            whatsappConnected: false
                        });
                    });
                })
                .then(() => {
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    showError(traducirError(error.code));
                });
        } else {
            // LOGIN
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    showError(traducirError(error.code));
                });
        }
    });

    // Traductor simple de errores de Firebase
    function traducirError(code) {
        switch (code) {
            case 'auth/user-not-found': return 'No hay ninguna cuenta con este correo.';
            case 'auth/wrong-password': return 'La contraseña es incorrecta.';
            case 'auth/email-already-in-use': return 'Este correo ya está registrado.';
            case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
            default: return 'Error: Verifique sus datos y reintente.';
        }
    }
});
