# Etape 4 - Base de Donnees (Drizzle + Neon)

## 1. Connexion a la base de donnees

Creer le fichier `lib/db.ts` :

```typescript
// lib/db.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

---

## 2. Schema de la base de donnees

Creer le fichier `lib/schema.ts` avec les tables necessaires pour l'authentification et le profil utilisateur :

```typescript
// lib/schema.ts
import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

// ============================================================
// TABLE USERS - Etendue pour NextAuth + profil
// ============================================================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  password: text("password"), // Hashe avec bcrypt, nullable pour OAuth futur
  accountType: text("account_type").notNull().default("user"), // "user" | "business"

  // Champs de profil utilisateur
  bio: text("bio"),
  location: text("location"),
  website: text("website"),
  banner: text("banner"), // URL image de banniere

  // Background (gradient ou image)
  backgroundType: text("background_type").$type<"image" | "gradient" | null>(),
  backgroundGradient: jsonb("background_gradient").$type<{
    color1: string;
    color2: string;
    css: string;
  }>(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// TABLES NEXTAUTH - Necessaires pour le DrizzleAdapter
// ============================================================

// Table accounts (OAuth providers)
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

// Table sessions
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  sessionToken: text("session_token").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

// Table verification tokens (email verification)
export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires").notNull(),
});
```

### Explication des champs `users`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | serial | Cle primaire auto-incrementee |
| `name` | text | Nom de l'utilisateur |
| `email` | text | Email unique (obligatoire) |
| `emailVerified` | timestamp | Date de verification email (NextAuth) |
| `image` | text | URL avatar |
| `password` | text | Hash bcrypt (nullable pour OAuth) |
| `accountType` | text | "user" par defaut, peut etre "business" |
| `bio` | text | Biographie |
| `location` | text | Localisation |
| `website` | text | Site web |
| `banner` | text | URL image de banniere |
| `backgroundType` | text | "image", "gradient" ou null |
| `backgroundGradient` | jsonb | `{color1, color2, css}` pour les gradients |
| `createdAt` | timestamp | Date de creation |
| `updatedAt` | timestamp | Date de derniere modification |

---

## 3. Generer et appliquer les migrations

### Generer les fichiers de migration

```bash
npx drizzle-kit generate
```

Cela cree des fichiers SQL dans le dossier `drizzle/`.

### Appliquer les migrations a la base de donnees

```bash
npx drizzle-kit push
```

> **Alternative** : Utiliser `npx drizzle-kit push` pour pousser directement le schema sans fichiers de migration (plus rapide en dev).

### Verifier avec Drizzle Studio (optionnel)

```bash
npx drizzle-kit studio
```

Ouvre une interface web pour visualiser et manipuler les donnees.

---

## 4. Notes importantes

- **Neon** utilise le protocole HTTP serverless, d'ou l'import `neon` et `drizzle-orm/neon-http`
- Le `schema` est passe a `drizzle()` pour que les requetes relationnelles fonctionnent
- Les tables `accounts`, `sessions` et `verificationTokens` sont requises par le `DrizzleAdapter` de NextAuth meme si on utilise les Credentials provider (elles seront utiles si OAuth est ajoute plus tard)
- Le champ `password` est nullable pour permettre l'ajout futur de providers OAuth (Google, GitHub, etc.)

---

## Prochaine etape

-> [05 - Authentification](./05-AUTHENTIFICATION.md)
