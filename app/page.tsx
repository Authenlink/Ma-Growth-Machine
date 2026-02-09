import { redirect } from "next/navigation";

export default function Home() {
  // Rediriger vers la page de login par defaut
  // L'utilisateur sera redirige vers /dashboard apres connexion
  redirect("/login");
}