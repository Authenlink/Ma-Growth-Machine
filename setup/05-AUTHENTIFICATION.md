# Etape 5 - Authentification (NextAuth v5)

## 1. Types NextAuth etendus

Creer `types/next-auth.d.ts` pour etendre les types de session avec `accountType` :

```typescript
// types/next-auth.d.ts
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      accountType: "user" | "business";
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    accountType: "user" | "business";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name?: string | null;
    picture?: string | null;
    accountType: "user" | "business";
  }
}
```

---

## 2. Route handler NextAuth

Creer `app/api/auth/[...nextauth]/route.ts` :

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (user.length === 0) {
          return null;
        }

        const foundUser = user[0];

        // Verifier si l'utilisateur a un mot de passe (pas OAuth)
        if (!foundUser.password) {
          return null;
        }

        // Verifier le mot de passe
        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          foundUser.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: foundUser.id.toString(),
          email: foundUser.email,
          name: foundUser.name || undefined,
          image: foundUser.image || undefined,
          accountType: foundUser.accountType as "user" | "business",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.accountType = user.accountType;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string | undefined;
        session.user.accountType = token.accountType;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export const { GET, POST } = handlers;
```

### Points cles :
- **CredentialsProvider** : authentification email/password
- **DrizzleAdapter** : lie NextAuth aux tables DB (accounts, sessions, etc.)
- **JWT strategy** : les sessions sont stockees dans un token JWT (pas en DB)
- **Callbacks** : propagent `accountType` dans le token JWT puis dans la session
- **Custom pages** : redirige vers `/login` pour la connexion/deconnexion

---

## 3. API d'inscription

Creer `app/api/auth/register/route.ts` :

```typescript
// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateRandomGradient } from "@/lib/gradient-generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, accountType = "user" } = body;

    // Validation de base
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    // Validation du type de compte
    if (accountType !== "user" && accountType !== "business") {
      return NextResponse.json(
        { error: "Invalid account type" },
        { status: 400 }
      );
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validation mot de passe (minimum 8 caracteres)
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Verifier si l'email existe deja
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generer un gradient automatiquement pour l'utilisateur
    const userGradient = generateRandomGradient();

    // Creer l'utilisateur
    const newUser = await db
      .insert(users)
      .values({
        email,
        name,
        password: hashedPassword,
        accountType,
        backgroundType: "gradient",
        backgroundGradient: userGradient,
      })
      .returning();

    const createdUser = newUser[0];

    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: createdUser.id,
          email: createdUser.email,
          name: createdUser.name,
          accountType: createdUser.accountType,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Points cles :
- Validation complete (email, password, doublon)
- Hash du mot de passe avec bcrypt (10 rounds)
- **Generation automatique d'un gradient** pour chaque nouvel utilisateur
- Retourne les infos du user cree (sans le password)

---

## 4. SessionProvider wrapper

Creer `components/providers.tsx` :

```typescript
// components/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

> Ce composant est "use client" car `SessionProvider` a besoin du contexte React cote client.

---

## 5. Page de connexion

### Page wrapper : `app/login/page.tsx`

```typescript
// app/login/page.tsx
import Image from "next/image";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-8 items-center justify-center rounded-md">
            <Image
              src="/logo.png"
              alt="Mon App"
              width={32}
              height={32}
              className="rounded"
            />
          </div>
          Mon Application
        </a>
        <LoginForm />
      </div>
    </div>
  );
}
```

### Formulaire : `components/login-form.tsx`

```typescript
// components/login-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou mot de passe invalide");
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        const session = await getSession();
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("Une erreur s'est produite. Veuillez reessayer.");
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Bienvenue</CardTitle>
          <CardDescription>Connectez-vous a votre compte</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {error && (
                <Field>
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                  </div>
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-4 hover:underline text-muted-foreground hover:text-primary"
                  >
                    Mot de passe oublie ?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Connexion en cours..." : "Se connecter"}
                </Button>
                <FieldDescription className="text-center">
                  Vous n&apos;avez pas de compte ?{" "}
                  <a href="/signup" className="text-primary hover:underline">
                    S&apos;inscrire
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 6. Page d'inscription

### Page wrapper : `app/signup/page.tsx`

```typescript
// app/signup/page.tsx
import Image from "next/image";
import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-8 items-center justify-center rounded-md">
            <Image
              src="/logo.png"
              alt="Mon App"
              width={32}
              height={32}
              className="rounded"
            />
          </div>
          Mon Application
        </a>
        <SignupForm />
      </div>
    </div>
  );
}
```

### Formulaire : `components/signup-form.tsx`

```typescript
// components/signup-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validation cote client
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caracteres");
      return;
    }

    setIsLoading(true);

    try {
      // Appeler l'API d'inscription
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Echec de l'inscription");
        setIsLoading(false);
        return;
      }

      // Connecter automatiquement apres inscription
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError(
          "Compte cree mais echec de connexion. Veuillez essayer de vous connecter."
        );
        setIsLoading(false);
        return;
      }

      if (signInResult?.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("Une erreur s'est produite. Veuillez reessayer.");
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Creez votre compte</CardTitle>
          <CardDescription>
            Remplissez vos informations pour vous inscrire
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {error && (
                <Field>
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                  </div>
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="name">Nom complet</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>

              <Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirmer
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </Field>
                </div>
                <FieldDescription>
                  Doit contenir au moins 8 caracteres.
                </FieldDescription>
              </Field>

              <Field>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Creation du compte..." : "Creer un compte"}
                </Button>
                <FieldDescription className="text-center">
                  Vous avez deja un compte ?{" "}
                  <a href="/login" className="text-primary hover:underline">
                    Se connecter
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 7. Page racine (redirect)

Creer `app/page.tsx` pour rediriger selon l'etat de connexion :

```typescript
// app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  // Rediriger vers la page de login par defaut
  // L'utilisateur sera redirige vers /dashboard apres connexion
  redirect("/login");
}
```

---

## Prochaine etape

-> [06 - Themes](./06-THEMES.md)
