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
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const btnForgot = document.getElementById('btn-forgot');
    const groupCompany = document.getElementById('group-company');

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
            if (groupCompany) groupCompany.style.display = 'block';
            authTitle.innerText = 'Crea tu cuenta';
            authSubtitle.innerText = 'Comienza a conectar con tu audiencia hoy mismo';
            btnSubmit.innerText = 'Crear Cuenta';
            document.getElementById('input-name').required = true;
            if (forgotPasswordLink) forgotPasswordLink.style.display = 'none';
        } else {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            groupName.style.display = 'none';
            if (groupCompany) groupCompany.style.display = 'none';
            authTitle.innerText = 'Bienvenido de vuelta';
            authSubtitle.innerText = 'Ingresa a tu panel de control masivo';
            btnSubmit.innerText = 'Ingresar al Panel';
            document.getElementById('input-name').required = false;
            if (forgotPasswordLink) forgotPasswordLink.style.display = 'block';
        }
    }

    tabLogin.addEventListener('click', () => setMode(false));
    tabRegister.addEventListener('click', () => setMode(true));

    // Auto-activar pestaña según parámetro en URL (?mode=register o ?mode=login)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'register') {
        setMode(true);
    }

    // Mostrar Error
    function showError(message) {
        errorMsg.innerText = message;
        errorMsg.style.display = 'block';
        btnSubmit.disabled = false;
        btnSubmit.innerText = isRegisterMode ? 'Crear Cuenta' : 'Ingresar al Panel';
    }

    // Recuperar contraseña
    if (btnForgot) {
        btnForgot.addEventListener('click', (e) => {
            e.preventDefault();
            const email = document.getElementById('input-email').value.trim();
            if (!email) {
                alert('Por favor escribe tu correo electrónico en el campo de arriba y luego da clic en "¿Olvidaste tu contraseña?".');
                return;
            }
            auth.sendPasswordResetEmail(email)
                .then(() => {
                    errorMsg.style.color = '#22c55e';
                    errorMsg.innerText = '✅ Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.';
                    errorMsg.style.display = 'block';
                })
                .catch((err) => {
                    if (err.code === 'auth/user-not-found') {
                        showError('No existe una cuenta con ese correo.');
                    } else {
                        showError('Error al enviar correo. Intenta de nuevo.');
                    }
                    errorMsg.style.color = '#ef4444';
                });
        });
    }

    // Auth con Google
    btnGoogle.addEventListener('click', () => {
        auth.signInWithPopup(googleProvider)
            .then((result) => {
                const user = result.user;
                const isNewUser = result.additionalUserInfo ? result.additionalUserInfo.isNewUser : false;
                
                let userData = {
                    name: user.displayName,
                    email: user.email,
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'active'
                };

                // Si es un usuario nuevo por Google, darle sus 100 mensajes
                if (isNewUser) {
                    userData.balanceMessages = 100;
                    userData.whatsappConnected = false;
                    userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                }

                // Guardar/Actualizar perfil en Firestore
                db.collection('users').doc(user.uid).set(userData, { merge: true }).then(() => {
                    window.location.href = 'index.html';
                }).catch((err) => {
                    console.error("Error guardando datos:", err);
                    showError("Error al guardar perfil.");
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
            const company = document.getElementById('input-company').value.trim();
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    return user.updateProfile({ displayName: name }).then(() => {
                        const userData = {
                            name: name,
                            email: email,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            balanceMessages: 100,
                            status: 'active',
                            whatsappConnected: false
                        };
                        if (company) userData.company = company;
                        return db.collection('users').doc(user.uid).set(userData);
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
