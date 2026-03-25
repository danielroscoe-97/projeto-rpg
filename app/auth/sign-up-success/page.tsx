import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card className="bg-[#16213e] border-white/10">
            <CardHeader>
              <CardTitle className="text-2xl text-white">
                Thank you for signing up!
              </CardTitle>
              <CardDescription className="text-white/60">Check your email to confirm</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/60">
                You&apos;ve successfully signed up. Please check your email to
                confirm your account before signing in.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
