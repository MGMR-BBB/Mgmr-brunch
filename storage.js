// Ce module reproduit la même API que "window.storage" utilisée dans les
// artifacts Claude, mais branchée sur Firestore. Comme ça, le reste du code
// de l'appli (App.jsx) n'a presque rien à changer.
//
// Toutes les données sont stockées dans une seule collection Firestore
// nommée "mgmr_kv", où chaque document a pour ID la clé fournie.
// (Le paramètre "shared" n'a pas d'effet ici : sur le vrai web, il n'y a
// qu'un seul espace de données partagé par tous les visiteurs — ce qui est
// justement ce qu'on veut pour le menu de la semaine et les commandes.)

import { db } from "./firebase.js";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

const COLLECTION = "mgmr_kv";

function sanitizeKey(key) {
  // Firestore n'aime pas les "/" dans les IDs de document
  return key.replace(/\//g, "__");
}

export const storage = {
  async get(key) {
    const ref = doc(db, COLLECTION, sanitizeKey(key));
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { key, value: snap.data().value, shared: true };
  },

  async set(key, value) {
    const ref = doc(db, COLLECTION, sanitizeKey(key));
    await setDoc(ref, { value, updatedAt: new Date().toISOString() });
    return { key, value, shared: true };
  },

  async delete(key) {
    const ref = doc(db, COLLECTION, sanitizeKey(key));
    await deleteDoc(ref);
    return { key, deleted: true, shared: true };
  },

  async list(prefix = "") {
    const colRef = collection(db, COLLECTION);
    const snap = await getDocs(colRef);
    const keys = [];
    snap.forEach((d) => {
      const realKey = d.id.replace(/__/g, "/");
      if (!prefix || realKey.startsWith(prefix)) keys.push(realKey);
    });
    return { keys, prefix, shared: true };
  },
};

// On expose aussi window.storage pour que App.jsx (copié depuis l'artifact
// Claude) fonctionne sans aucune modification.
if (typeof window !== "undefined") {
  window.storage = storage;
}
