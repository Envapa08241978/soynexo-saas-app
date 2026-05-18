// Configuración de Firebase
// NOTA: Reemplazar con las credenciales de Firebase Console > Project Settings
const firebaseConfig = {
  projectId: "soynexo-saas-2026",
  appId: "1:1013348297005:web:ef1299c89f692ac7154ba4",
  storageBucket: "soynexo-saas-2026.firebasestorage.app",
  apiKey: "AIzaSyAzz-ILJf3C36GF8KEfQV3kmINqMJpbjyk",
  authDomain: "soynexo-saas-2026.firebaseapp.com",
  messagingSenderId: "1013348297005"
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
