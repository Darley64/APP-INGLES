
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

// Configuração oficial fornecida pelo usuário
const firebaseConfig = {
  apiKey: "AIzaSyDr4wJcNIADy78uRdGmO9AOtNhJ_EK1BNs",
  authDomain: "memorize-pro-103db.firebaseapp.com",
  projectId: "memorize-pro-103db",
  storageBucket: "memorize-pro-103db.firebasestorage.app",
  messagingSenderId: "959647053126",
  appId: "1:959647053126:web:8e4f4225e5de24582ee147",
  measurementId: "G-JKMJ34CPQG"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta apenas o necessário para o funcionamento do App.
// A base local persistente mantém o progresso no aparelho e envia alterações
// pendentes quando a conexão voltar.
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
