import { LoginForm } from "@/components/login-form";
import { SignUpForm } from "@/components/sign-up-form";

interface AuthPageContentProps {
  defaultTab: "login" | "signup";
}

export function AuthPageContent({ defaultTab }: AuthPageContentProps) {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card border border-white/[0.06] rounded-xl p-8">
        {defaultTab === "login" ? <LoginForm /> : <SignUpForm />}
      </div>
    </div>
  );
}
