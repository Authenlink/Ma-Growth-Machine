# Etape 1 - Initialisation et Dependances

## 1. Creer le projet Next.js

```bash
npx create-next-app@latest mon-projet --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
cd mon-projet
```

Repondre aux questions :
- TypeScript : **Yes**
- ESLint : **Yes**
- Tailwind CSS : **Yes**
- `src/` directory : **No**
- App Router : **Yes**
- Turbopack : **Yes** (recommande)
- Import alias : **@/***

---

## 2. Installer les dependances

### Dependances principales

```bash
npm install next-auth@beta @auth/drizzle-adapter bcryptjs drizzle-orm @neondatabase/serverless postgres dotenv class-variance-authority clsx tailwind-merge lucide-react next-themes tw-animate-css
```

### Dependances de types

```bash
npm install -D @types/bcryptjs
```

### Dependances de developpement

```bash
npm install -D shadcn drizzle-kit tsx
```

---

## 3. Initialiser shadcn

```bash
npx shadcn@latest init
```

Repondre aux questions :
- Style : **New York**
- Base color : **Slate**
- CSS variables : **Yes**

Cela va creer le fichier `components.json` et configurer les aliases.

---

## 4. Installer les composants shadcn

Installer tous les composants necessaires d'un coup :

```bash
npx shadcn@latest add button card input label separator tabs sidebar breadcrumb toast skeleton avatar dropdown-menu dialog collapsible sheet select switch tooltip field
```

Cela va creer les fichiers dans `components/ui/` et installer automatiquement les dependances Radix UI necessaires :
- `@radix-ui/react-avatar`
- `@radix-ui/react-collapsible`
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-label`
- `@radix-ui/react-select`
- `@radix-ui/react-separator`
- `@radix-ui/react-slot`
- `@radix-ui/react-switch`
- `@radix-ui/react-tabs`
- `@radix-ui/react-toast`
- `@radix-ui/react-tooltip`

---

## 5. Recapitulatif du package.json

Apres installation, ton `package.json` devrait contenir ces dependances cles :

```json
{
  "dependencies": {
    "@auth/drizzle-adapter": "^1.x",
    "@neondatabase/serverless": "^1.x",
    "@radix-ui/react-avatar": "^1.x",
    "@radix-ui/react-collapsible": "^1.x",
    "@radix-ui/react-dialog": "^1.x",
    "@radix-ui/react-dropdown-menu": "^2.x",
    "@radix-ui/react-label": "^2.x",
    "@radix-ui/react-select": "^2.x",
    "@radix-ui/react-separator": "^1.x",
    "@radix-ui/react-slot": "^1.x",
    "@radix-ui/react-switch": "^1.x",
    "@radix-ui/react-tabs": "^1.x",
    "@radix-ui/react-toast": "^1.x",
    "@radix-ui/react-tooltip": "^1.x",
    "bcryptjs": "^3.x",
    "class-variance-authority": "^0.7.x",
    "clsx": "^2.x",
    "dotenv": "^17.x",
    "drizzle-orm": "^0.45.x",
    "lucide-react": "^0.5x",
    "next": "latest",
    "next-auth": "^5.0.0-beta.x",
    "next-themes": "^0.4.x",
    "postgres": "^3.x",
    "react": "^19.x",
    "react-dom": "^19.x",
    "tailwind-merge": "^3.x",
    "tw-animate-css": "^1.x"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/bcryptjs": "^2.x",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "drizzle-kit": "^0.31.x",
    "eslint": "^9",
    "eslint-config-next": "latest",
    "shadcn": "^3.x",
    "tailwindcss": "^4",
    "tsx": "^4.x",
    "typescript": "^5"
  }
}
```

> **Note** : Les versions exactes peuvent varier. Les `^` permettent les mises a jour mineures automatiques. Les dependances Radix UI seront installees automatiquement par shadcn.

---

## Prochaine etape

-> [02 - Configuration de Base](./02-CONFIGURATION-DE-BASE.md)
