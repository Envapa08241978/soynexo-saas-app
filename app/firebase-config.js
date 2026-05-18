// Configuración de Firebase
// NOTA: Reemplazar con las credenciales de Firebase Console > Project Settings
const firebaseConfig = {
  projectId: "soy-nexo",
  appId: "1:297456603993:web:0f64d149f8ebef16b6f248",
  storageBucket: "soy-nexo.firebasestorage.app",
  apiKey: "AIzaSyBOkHtoVXQ12K7P7FYNTB0nvAQW6bAKiTw",
  authDomain: "soy-nexo.firebaseapp.com",
  messagingSenderId: "297456603993",
  measurementId: "G-F22YGRKTM3"
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
