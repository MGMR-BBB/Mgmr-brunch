# MGMR Box Brunch — site de commande

Ce dossier contient le site complet (frontend React + connexion Firebase)
pour commander les box brunch MGMR à Bessens.

## Ce qui est déjà fait

- ✅ Projet Firebase créé (`mgmr-bbb`)
- ✅ Code connecté à Firestore (base de données) pour stocker le menu de
  la semaine et les commandes
- ✅ Toutes les fonctionnalités : 5 box, admin menu, créneaux, panier,
  commandes du jour

## Étapes restantes avant la mise en ligne

### 1. Activer Firestore (si pas déjà fait)

Dans la console Firebase (console.firebase.google.com) → ton projet
`MGMR-BBB82` → menu de gauche → **Firestore Database** → "Créer une base
de données" → mode test.

### 2. Sécuriser les règles Firestore (recommandé avant le vrai lancement)

Le "mode test" autorise tout le monde à lire/écrire pendant 30 jours. Pour
un usage prolongé, dans Firestore → onglet "Règles", remplace par :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /mgmr_kv/{document=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

(Cette version reste ouverte en écriture — suffisant pour démarrer sans
compte client. Pour bloquer les écritures à toi seule, il faudrait ajouter
une authentification, ce qu'on pourra faire plus tard si besoin.)

### 3. Déployer sur Vercel

1. Va sur https://vercel.com et connecte-toi avec ton compte GitHub
2. Crée un nouveau dépôt GitHub avec tout le contenu de ce dossier
   (le plus simple : glisser-déposer le dossier sur https://github.com/new
   si tu utilises l'interface web, ou demander à Claude de t'aider avec
   `git` si tu as un terminal)
3. Sur Vercel, clique "Add New Project", choisis ce dépôt GitHub
4. Vercel détecte automatiquement Vite — laisse les réglages par défaut
5. Clique "Deploy"
6. Au bout de 1-2 minutes, tu obtiens une adresse comme
   `mgmr-box-brunch.vercel.app` — c'est le lien à partager à tes clients !

### 4. (Optionnel) Nom de domaine personnalisé

Dans les réglages du projet Vercel → "Domains" → ajouter
`mgmr-boxbrunch.fr` (après l'avoir acheté chez un registrar comme OVH,
Gandi, ou Namecheap).

## Développement local (si tu veux tester avant de déployer)

```
npm install
npm run dev
```
