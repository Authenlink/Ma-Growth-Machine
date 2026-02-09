# Guide Principal - Template Next.js

Ce guide te permet de construire rapidement une application Next.js complete avec authentification, sidebar, themes, et toutes les bases necessaires pour demarrer un nouveau projet.

---

## Pre-requis

- **Node.js** >= 18.x
- **npm** ou **pnpm**
- Un compte **Neon** (base de donnees PostgreSQL serverless) : [neon.tech](https://neon.tech)
- Un terminal et un editeur de code (VS Code / Cursor)

---

## Ordre de construction

Suis les etapes dans l'ordre. Chaque fichier est autonome et contient tout le code necessaire.

### Etape 1 - [Initialisation et Dependances](./01-INITIALISATION-ET-DEPENDANCES.md)

Creer le projet Next.js, installer toutes les dependances (auth, DB, UI), initialiser shadcn et installer les composants UI necessaires.

### Etape 2 - [Configuration de Base](./02-CONFIGURATION-DE-BASE.md)

Configurer `next.config.ts`, `drizzle.config.ts`, les variables d'environnement et `components.json` pour shadcn.

### Etape 3 - [Structure des Fichiers](./03-STRUCTURE-DES-FICHIERS.md)

Vue d'ensemble de l'arborescence cible du projet. Savoir quel fichier creer et ou le placer.

### Etape 4 - [Base de Donnees](./04-BASE-DE-DONNEES.md)

Mettre en place Drizzle ORM avec Neon PostgreSQL. Creer le schema (users + tables auth) et lancer les migrations.

### Etape 5 - [Authentification](./05-AUTHENTIFICATION.md)

Configurer NextAuth v5 avec Credentials provider, l'API d'inscription, les pages login/signup et le SessionProvider.

### Etape 6 - [Themes](./06-THEMES.md)

Mettre en place 3 themes (white, light, dark) avec `next-themes` et des variables CSS en oklch dans `globals.css`.

### Etape 7 - [Sidebar](./07-SIDEBAR.md)

Installer et configurer la sidebar shadcn avec navigation collapsible, menu utilisateur en bas (avatar, theme switcher, logout) et integration dans les pages.

### Etape 8 - [Breadcrumbs](./08-BREADCRUMBS.md)

Ajouter les breadcrumbs dans le header sticky de la page dashboard.

### Etape 9 - [Toasts](./09-TOASTS.md)

Mettre en place le systeme de notifications toast avec le hook `useToast` et le composant `Toaster` dans le layout.

### Etape 10 - [Skeletons](./10-SKELETONS.md)

Ajouter les etats de chargement (skeletons) dans la sidebar et les pages.

### Etape 11 - [Page Profil Utilisateur](./11-PAGE-PROFIL-UTILISATEUR.md)

Creer la page de profil utilisateur avec edition des informations, selection de background (gradient ou image) et l'API correspondante.

### Etape 12 - [Checklist Finale](./12-CHECKLIST-FINALE.md)

Verifier que tout fonctionne correctement avec une checklist complete et un guide de troubleshooting.

---

## Arborescence finale visee

```
mon-projet/
├── app/
│   ├── layout.tsx                        # Root layout (ThemeProvider + Providers + Toaster)
│   ├── globals.css                       # 3 themes (white, light, dark)
│   ├── page.tsx                          # Redirect vers /login ou /dashboard
│   ├── login/
│   │   └── page.tsx                      # Page de connexion
│   ├── signup/
│   │   └── page.tsx                      # Page d'inscription
│   ├── dashboard/
│   │   └── page.tsx                      # Dashboard avec sidebar + breadcrumbs + skeletons
│   ├── profile/
│   │   └── page.tsx                      # Page profil utilisateur
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/
│       │   │   └── route.ts              # Config NextAuth v5
│       │   └── register/
│       │       └── route.ts              # API inscription
│       └── user/
│           └── profile/
│               └── route.ts              # API profil utilisateur (GET/PUT)
├── components/
│   ├── providers.tsx                     # SessionProvider wrapper
│   ├── theme-provider.tsx                # next-themes wrapper
│   ├── app-sidebar.tsx                   # Sidebar principale
│   ├── nav-main.tsx                      # Items de navigation
│   ├── nav-user.tsx                      # Menu utilisateur (bas de sidebar)
│   ├── login-form.tsx                    # Formulaire de connexion
│   ├── signup-form.tsx                   # Formulaire d'inscription
│   ├── background-selector.tsx           # Selecteur gradient/image
│   └── ui/                              # Composants shadcn (auto-generes)
├── hooks/
│   ├── use-toast.ts                      # Hook pour les toasts
│   ├── use-scroll.ts                     # Hook pour detecter le scroll
│   └── use-mobile.ts                     # Hook pour detecter mobile
├── lib/
│   ├── utils.ts                          # Fonction cn() (tailwind-merge)
│   ├── db.ts                             # Connexion Drizzle + Neon
│   ├── schema.ts                         # Schema DB (users, accounts, sessions)
│   └── gradient-generator.ts             # Generateur de gradients aleatoires
├── types/
│   └── next-auth.d.ts                    # Types NextAuth etendus
├── drizzle/                              # Migrations generees
├── drizzle.config.ts                     # Config Drizzle Kit
├── components.json                       # Config shadcn
├── next.config.ts                        # Config Next.js
├── .env.example                          # Variables d'environnement
├── package.json
└── tsconfig.json
```

---

## Stack technique

- **Framework** : Next.js (App Router, React Server Components)
- **Langage** : TypeScript
- **Style** : Tailwind CSS v4
- **Composants UI** : shadcn/ui (style new-york)
- **Auth** : NextAuth v5 (beta) avec Credentials provider
- **Base de donnees** : PostgreSQL via Neon (serverless)
- **ORM** : Drizzle ORM
- **Themes** : next-themes (3 themes : white, light, dark)
- **Icones** : Lucide React
