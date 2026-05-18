// Configuración de Firebase
// NOTA: Reemplazar con las credenciales de Firebase Console > Project Settings
const firebaseConfig = {
    apiKey: "AIzaSy_PON_TUS_CREDENCIALES_AQUI",
    authDomain: "soynexo-app.firebaseapp.com",
    projectId: "soynexo-app",
    storageBucket: "soynexo-app.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Inicializar Firebase (Solo si no ha sido inicializado)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Referencias a los servicios
const auth = firebase.auth();
const db = firebase.firestore();

// Proveedor de Google
const googleProvider = new firebase.auth.GoogleAuthProvider();
