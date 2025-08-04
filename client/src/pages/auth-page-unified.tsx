import { useUnifiedAuth } from "@/hooks/use-unified-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import logoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address").refine(
    (email) => email.endsWith('@seedfinancial.io'),
    "Please use your Seed Financial email address (@seedfinancial.io)"
  ),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const { user, isLoading, signInWithGoogle, signInWithEmail, needsApproval } = useUnifiedAuth();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  // Show request access page if needed
  if (needsApproval) {
    return <Redirect to="/request-access" />;
  }

  const handleGoogleSignIn = () => {
    signInWithGoogle();
  };

  const onEmailLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await signInWithEmail(data.email, data.password);
    } catch (error) {
      // Error is handled by the auth hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img 
            src={logoPath} 
            alt="Seed Financial Logo" 
            className="h-16 mx-auto mb-6"
          />
          <h2 className="text-3xl font-bold text-white">
            Welcome to Seed Financial
          </h2>
          <p className="mt-2 text-sm text-gray-200">
            Sign in to access the internal portal
          </p>
        </div>

        <Card className="bg-white shadow-xl">
          <CardContent className="pt-6">
            {!showEmailForm ? (
              <>
                <Button 
                  className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FcGoogle className="mr-2 h-5 w-5" />
                  )}
                  Sign in with Google
                </Button>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Or</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="mt-6 w-full"
                  onClick={() => setShowEmailForm(true)}
                  disabled={isLoading}
                >
                  Sign in with Email
                </Button>
              </>
            ) : (
              <>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onEmailLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="email" 
                              placeholder="name@seedfinancial.io"
                              disabled={isSubmitting || isLoading}
                              className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="password"
                              disabled={isSubmitting || isLoading}
                              className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-[#e24c00] hover:bg-[#c73f00] text-white"
                      disabled={isSubmitting || isLoading}
                    >
                      {(isSubmitting || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                  </form>
                </Form>

                <Button
                  variant="ghost"
                  className="mt-4 w-full"
                  onClick={() => setShowEmailForm(false)}
                  disabled={isSubmitting || isLoading}
                >
                  Back to options
                </Button>
              </>
            )}

            <p className="mt-6 text-center text-xs text-gray-600">
              Only @seedfinancial.io accounts are allowed
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}