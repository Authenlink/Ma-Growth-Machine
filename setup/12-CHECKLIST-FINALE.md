# Etape 12 - Checklist Finale

Utilise cette checklist pour verifier que tout fonctionne apres avoir suivi les etapes 1 a 11.

---

## Checklist de verification

### Projet et configuration

- [ ] Le projet demarre sans erreur avec `npm run dev`
- [ ] Aucune erreur TypeScript (`npx tsc --noEmit`)
- [ ] Le fichier `.env` contient `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- [ ] Le fichier `.gitignore` contient `.env*`
- [ ] Un logo `logo.png` est present dans `public/`

### Base de donnees

- [ ] La base de donnees Neon est creee et accessible
- [ ] Les migrations sont generees (`npx drizzle-kit generate`)
- [ ] Les migrations sont appliquees (`npx drizzle-kit push`)
- [ ] Les tables `users`, `accounts`, `sessions`, `verification_tokens` existent
- [ ] Drizzle Studio fonctionne (`npx drizzle-kit studio`)

### Authentification

- [ ] La page `/login` s'affiche correctement
- [ ] La page `/signup` s'affiche correctement
- [ ] L'inscription cree un utilisateur en base de donnees
- [ ] Un gradient est automatiquement genere pour chaque nouvel utilisateur
- [ ] La connexion fonctionne avec email/password
- [ ] Apres connexion, redirection vers `/dashboard`
- [ ] La deconnexion (depuis le menu utilisateur) redirige vers `/login`
- [ ] Un utilisateur non connecte est redirige vers `/login`

### Sidebar

- [ ] La sidebar s'affiche sur le dashboard
- [ ] Le logo et le nom de l'app sont dans le header
- [ ] Les items de navigation fonctionnent (liens directs)
- [ ] Les menus collapsibles s'ouvrent/ferment (si configures)
- [ ] Le menu utilisateur est en bas de la sidebar
- [ ] La sidebar se collapse en mode icones (`Cmd/Ctrl + B` ou clic sur le rail)
- [ ] La sidebar est responsive (Sheet sur mobile)
- [ ] Le `SidebarTrigger` dans le header fonctionne

### Menu utilisateur (NavUser)

- [ ] L'avatar affiche le gradient si pas de photo
- [ ] Les initiales sont correctes dans le fallback avatar
- [ ] Le nom et l'email s'affichent
- [ ] Le dropdown s'ouvre au clic
- [ ] Le lien "Profil" redirige vers `/profile`
- [ ] Le bouton "Log out" deconnecte et redirige

### Themes

- [ ] Le theme par defaut est "light"
- [ ] Le theme "White" s'applique correctement
- [ ] Le theme "Light" s'applique correctement (fond legerement chaud)
- [ ] Le theme "Dark" s'applique correctement
- [ ] Le theme est persiste apres rechargement de la page
- [ ] Le theme switcher dans NavUser fonctionne (3 radio buttons)
- [ ] Les couleurs de la sidebar changent avec le theme

### Breadcrumbs

- [ ] Les breadcrumbs s'affichent dans le header du dashboard
- [ ] Le separateur `>` est visible
- [ ] La page actuelle est mise en evidence (non cliquable)
- [ ] Les breadcrumbs parents sont cliquables
- [ ] Sur mobile, les breadcrumbs intermediaires sont masques

### Toasts

- [ ] Le `<Toaster />` est dans le root layout
- [ ] Un toast de succes s'affiche (fond normal)
- [ ] Un toast destructive s'affiche (fond rouge)
- [ ] Le toast disparait apres un delai

### Skeletons

- [ ] La sidebar affiche un skeleton pendant le chargement de la session
- [ ] La page dashboard affiche un skeleton complet pendant le chargement
- [ ] La page profil affiche un skeleton pendant le chargement
- [ ] Les skeletons reproduisent visuellement la structure finale

### Page Profil

- [ ] La page `/profile` s'affiche avec les infos de l'utilisateur
- [ ] La banniere affiche le gradient de l'utilisateur
- [ ] Le bouton "Modifier" active le mode edition
- [ ] Les champs sont editables en mode edition (nom, bio, localisation, website)
- [ ] Le BackgroundSelector apparait en mode edition
- [ ] Le bouton "Nouveau gradient" genere un gradient aleatoire
- [ ] Les color pickers fonctionnent
- [ ] La saisie HEX manuelle fonctionne
- [ ] Le bouton "Sauvegarder" enregistre les modifications
- [ ] Un toast de succes s'affiche apres sauvegarde
- [ ] Le bouton "Annuler" restaure les valeurs precedentes

---

## Troubleshooting

### Erreur "Module not found"

**Symptome** : `Module not found: Can't resolve '@/components/...'`

**Solution** : Verifier que le `tsconfig.json` contient les paths aliases :
```json
"paths": {
  "@/*": ["./*"]
}
```

### Erreur NextAuth "NEXTAUTH_SECRET is not set"

**Solution** : S'assurer que `.env` (ou `.env.local`) contient :
```
NEXTAUTH_SECRET="une-cle-secrete"
```

Generer une cle avec : `openssl rand -base64 32`

### Erreur de connexion a la base de donnees

**Symptome** : `NeonDbError: connection refused` ou `getaddrinfo ENOTFOUND`

**Solutions** :
1. Verifier que `DATABASE_URL` dans `.env` est correcte
2. S'assurer que la base Neon est active (pas suspendue)
3. Verifier que `?sslmode=require` est present dans l'URL

### La sidebar ne s'affiche pas

**Solutions** :
1. Verifier que `SidebarProvider` wrappe bien `AppSidebar` + `SidebarInset`
2. Verifier que le composant `sidebar.tsx` est bien dans `components/ui/`
3. Verifier les imports

### Le theme ne change pas

**Solutions** :
1. Verifier que `ThemeProvider` a `attribute="class"` dans le layout
2. Verifier que `suppressHydrationWarning` est sur `<html>`
3. Verifier que les classes `.white`, `.light`, `.dark` sont definies dans `globals.css`

### Les toasts n'apparaissent pas

**Solutions** :
1. Verifier que `<Toaster />` est dans `app/layout.tsx`
2. Verifier l'import : `import { Toaster } from "@/components/ui/toaster"`
3. Verifier que `hooks/use-toast.ts` existe

### Erreur "hydration mismatch"

**Symptome** : Warning dans la console sur un mismatch entre server et client

**Solutions** :
1. S'assurer que `suppressHydrationWarning` est sur `<html>` (pour next-themes)
2. Les composants qui utilisent `useSession`, `useTheme` doivent etre `"use client"`

### La page profile ne charge pas les donnees

**Solutions** :
1. Verifier que `app/api/user/profile/route.ts` existe
2. Verifier que `auth` est exporte depuis `app/api/auth/[...nextauth]/route.ts`
3. Verifier que la table `users` contient les champs `background_type` et `background_gradient`

---

## Pour aller plus loin

Une fois la template fonctionnelle, tu peux ajouter :

- **OAuth** : Ajouter des providers Google, GitHub dans NextAuth
- **Upload d'images** : Cloudinary, S3, ou UploadThing pour les avatars et bannieres
- **Middleware** : `middleware.ts` pour proteger les routes automatiquement
- **Pages supplementaires** : parametres, notifications, etc.
- **Base de donnees** : Ajouter d'autres tables selon les besoins du projet
- **API routes** : Creer les endpoints CRUD necessaires

---

Felicitations, ta template est prete !
