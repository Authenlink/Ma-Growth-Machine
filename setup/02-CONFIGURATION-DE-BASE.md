# Etape 2 - Configuration de Base

## 1. next.config.ts

Fichier de configuration minimal pour Next.js. Ajouter les patterns d'images distantes si besoin (ex: Cloudinary, S3).

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ajouter ici les remote patterns pour les images si necessaire
  // images: {
  //   remotePatterns: [
  //     {
  //       protocol: "https",
  //       hostname: "res.cloudinary.com",
  //       port: "",
  //       pathname: "/ton-cloud-name/**",
  //     },
  //   ],
  // },
};

export default nextConfig;
```

---

## 2. drizzle.config.ts

Configuration de Drizzle Kit pour les migrations. Pointe vers le fichier de schema et utilise PostgreSQL.

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

## 3. tsconfig.json

Verifier que les aliases `@/` sont bien configures. Le `create-next-app` devrait les avoir mis en place, mais verifier :

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Le point important est la section `paths` avec `"@/*": ["./*"]`.

---

## 4. Variables d'environnement

Creer un fichier `.env.example` a la racine du projet :

```env
# Base de donnees PostgreSQL (Neon)
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="generer-une-cle-secrete-aleatoire"
NEXTAUTH_URL="http://localhost:3000"
```

Puis copier vers `.env` (ou `.env.local`) et remplir les vraies valeurs :

```bash
cp .env.example .env
```

**Pour generer un secret NextAuth** :

```bash
openssl rand -base64 32
```

**Pour obtenir la DATABASE_URL** : Aller sur [neon.tech](https://neon.tech), creer un projet, et copier la connection string.

> **Important** : Ne jamais commiter `.env` ou `.env.local`. Verifier que `.gitignore` contient `.env*`.

---

## 5. components.json

Ce fichier est cree automatiquement par `npx shadcn@latest init`. Verifier qu'il ressemble a ceci :

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "registries": {}
}
```

Points importants :
- `style: "new-york"` - style des composants
- `rsc: true` - support React Server Components
- `css: "app/globals.css"` - fichier CSS principal
- Les `aliases` doivent correspondre aux paths du `tsconfig.json`

---

## Prochaine etape

-> [03 - Structure des Fichiers](./03-STRUCTURE-DES-FICHIERS.md)
