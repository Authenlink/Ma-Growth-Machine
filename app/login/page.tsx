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