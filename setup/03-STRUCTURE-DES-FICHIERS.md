# Etape 3 - Structure des Fichiers

## Arborescence complete de la template

Voici tous les fichiers a creer, organises par dossier. Les fichiers marques `[shadcn]` sont generes automatiquement par la commande `npx shadcn@latest add`.

```
mon-projet/
│
├── app/
│   ├── globals.css                           # CSS avec 3 themes (white, light, dark)
│   ├── layout.tsx                            # Root layout (ThemeProvider + Providers + Toaster)
│   ├── page.tsx                              # Page racine (redirect vers login ou dashboard)
│   │
│   ├── login/
│   │   └── page.tsx                          # Page de connexion
│   │
│   ├── signup/
│   │   └── page.tsx                          # Page d'inscription
│   │
│   ├── dashboard/
│   │   └── page.tsx                          # Dashboard (sidebar + breadcrumbs + skeletons)
│   │
│   ├── profile/
│   │   └── page.tsx                          # Page profil utilisateur (edition + background)
│   │
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/
│       │   │   └── route.ts                  # Configuration NextAuth v5
│       │   └── register/
│       │       └── route.ts                  # API d'inscription
│       └── user/
│           └── profile/
│               └── route.ts                  # API profil utilisateur (GET/PUT)
│
├── components/
│   ├── providers.tsx                         # SessionProvider (next-auth/react)
│   ├── theme-provider.tsx                    # Wrapper next-themes
│   ├── app-sidebar.tsx                       # Sidebar principale
│   ├── nav-main.tsx                          # Items de navigation (direct + collapsible)
│   ├── nav-user.tsx                          # Menu utilisateur bas de sidebar
│   ├── login-form.tsx                        # Formulaire de connexion
│   ├── signup-form.tsx                       # Formulaire d'inscription
│   ├── background-selector.tsx               # Selecteur gradient/image pour profil
│   │
│   └── ui/                                   # [shadcn] Composants generes
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── breadcrumb.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── collapsible.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── field.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── sidebar.tsx
│       ├── skeleton.tsx
│       ├── switch.tsx
│       ├── tabs.tsx
│       ├── toast.tsx
│       ├── toaster.tsx
│       └── tooltip.tsx
│
├── hooks/
│   ├── use-toast.ts                          # Hook pour les notifications toast
│   ├── use-scroll.ts                         # Hook pour detecter le scroll (border header)
│   └── use-mobile.ts                         # Hook pour detecter le mobile (sidebar)
│
├── lib/
│   ├── utils.ts                              # Fonction cn() (clsx + tailwind-merge)
│   ├── db.ts                                 # Connexion Drizzle ORM + Neon
│   ├── schema.ts                             # Schema DB (users, accounts, sessions, tokens)
│   └── gradient-generator.ts                 # Generateur de gradients aleatoires
│
├── types/
│   └── next-auth.d.ts                        # Types NextAuth etendus (Session, User, JWT)
│
├── drizzle/                                  # Migrations generees par drizzle-kit
│
├── public/
│   └── logo.png                              # Logo de l'application
│
├── .env.example                              # Template variables d'environnement
├── .gitignore
├── components.json                           # Config shadcn
├── drizzle.config.ts                         # Config Drizzle Kit
├── next.config.ts                            # Config Next.js
├── package.json
└── tsconfig.json
```

---

## Description des fichiers par role

### Dossier `app/`

| Fichier | Role |
|---------|------|
| `layout.tsx` | Layout racine : charge les fonts, wrappe avec ThemeProvider, Providers (session), et Toaster |
| `globals.css` | Variables CSS des 3 themes, imports Tailwind et animations |
| `page.tsx` | Page d'accueil : redirige vers `/login` si non connecte, `/dashboard` sinon |
| `login/page.tsx` | Affiche le logo + le composant LoginForm |
| `signup/page.tsx` | Affiche le logo + le composant SignupForm |
| `dashboard/page.tsx` | Page principale : sidebar + header sticky (breadcrumbs) + contenu + skeletons |
| `profile/page.tsx` | Page profil : edition des infos, background selector |

### Dossier `components/`

| Fichier | Role |
|---------|------|
| `providers.tsx` | Wrappe les enfants dans `SessionProvider` de next-auth |
| `theme-provider.tsx` | Wrappe les enfants dans `NextThemesProvider` |
| `app-sidebar.tsx` | Sidebar avec Header (logo), Content (NavMain), Footer (NavUser), Rail |
| `nav-main.tsx` | Rendu des items de navigation : liens directs ou menus collapsibles |
| `nav-user.tsx` | Menu dropdown bas de sidebar : avatar, theme switcher, lien profil, logout |
| `login-form.tsx` | Formulaire email/password avec validation et appel `signIn()` |
| `signup-form.tsx` | Formulaire inscription avec validation et appel API register |
| `background-selector.tsx` | Selection entre image et gradient, color picker, apercu |

### Dossier `hooks/`

| Fichier | Role |
|---------|------|
| `use-toast.ts` | Gestion d'etat des notifications toast (add, dismiss, remove) |
| `use-scroll.ts` | Retourne `true` quand la page est scrollee (pour border du header) |
| `use-mobile.ts` | Retourne `true` si l'ecran est mobile (pour sidebar responsive) |

### Dossier `lib/`

| Fichier | Role |
|---------|------|
| `utils.ts` | Fonction `cn()` qui combine `clsx` et `tailwind-merge` |
| `db.ts` | Initialise la connexion Drizzle avec le driver Neon |
| `schema.ts` | Definit les tables PostgreSQL : users, accounts, sessions, verificationTokens |
| `gradient-generator.ts` | Genere des gradients CSS aleatoires avec des couleurs vives |

### Dossier `types/`

| Fichier | Role |
|---------|------|
| `next-auth.d.ts` | Etend les types Session, User et JWT pour ajouter `accountType` |

---

## Ordre de creation recommande

1. **Config** : `next.config.ts`, `drizzle.config.ts`, `.env`, `components.json` (etapes 1-2)
2. **Lib** : `lib/utils.ts`, `lib/db.ts`, `lib/schema.ts`, `lib/gradient-generator.ts` (etape 4)
3. **Types** : `types/next-auth.d.ts` (etape 5)
4. **Auth API** : `api/auth/[...nextauth]/route.ts`, `api/auth/register/route.ts` (etape 5)
5. **Providers** : `components/providers.tsx`, `components/theme-provider.tsx` (etapes 5-6)
6. **CSS + Layout** : `app/globals.css`, `app/layout.tsx` (etape 6)
7. **Auth pages** : `login/page.tsx`, `signup/page.tsx`, formulaires (etape 5)
8. **Sidebar** : `app-sidebar.tsx`, `nav-main.tsx`, `nav-user.tsx` (etape 7)
9. **Dashboard** : `dashboard/page.tsx` avec breadcrumbs et skeletons (etapes 8-10)
10. **Profil** : `profile/page.tsx`, `background-selector.tsx`, `api/user/profile/route.ts` (etape 11)

---

## Prochaine etape

-> [04 - Base de Donnees](./04-BASE-DE-DONNEES.md)
