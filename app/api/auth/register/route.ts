import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateRandomGradient } from "@/lib/gradient-generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, accountType = "user", registrationSecret } = body;

    // Validation mot de passe d'inscription (seulement toi peux creer un compte)
    const expectedSecret = process.env.REGISTRATION_SECRET;
    if (!expectedSecret || registrationSecret !== expectedSecret) {
      return NextResponse.json(
        { error: "Mot de passe d'inscription invalide" },
        { status: 403 }
      );
    }

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