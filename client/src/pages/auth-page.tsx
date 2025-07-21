import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Building, Shield } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address").refine(
    (email) => email.endsWith('@seedfinancial.io'),
    "Only @seedfinancial.io email addresses are allowed"
  ),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address").refine(
    (email) => email.endsWith('@seedfinancial.io'),
    "Only @seedfinancial.io email addresses are allowed"
  ),
  password: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onLogin = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Building className="mx-auto h-12 w-12 text-blue-600" />
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              {isRegisterMode ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isRegisterMode 
                ? "Join Seed Financial Quote Calculator" 
                : "Sign in to your account"
              }
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{isRegisterMode ? "Register" : "Sign In"}</CardTitle>
              <CardDescription>
                {isRegisterMode 
                  ? "Your HubSpot account will be verified automatically" 
                  : "Enter your credentials to access the quote calculator"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isRegisterMode ? (
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="email" 
                              placeholder="your.name@seedfinancial.io"
                              disabled={registerMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password (optional)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="password" 
                              placeholder="Leave blank for default: SeedAdmin1!"
                              disabled={registerMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Account
                    </Button>
                  </form>
                </Form>
              ) : (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
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
                              placeholder="your.name@seedfinancial.io"
                              disabled={loginMutation.isPending}
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
                              disabled={loginMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Sign In
                    </Button>
                  </form>
                </Form>
              )}

              <div className="mt-4 text-center">
                <Button 
                  variant="link" 
                  onClick={() => setIsRegisterMode(!isRegisterMode)}
                  disabled={loginMutation.isPending || registerMutation.isPending}
                >
                  {isRegisterMode 
                    ? "Already have an account? Sign in" 
                    : "Need an account? Register here"
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:block lg:flex-1 bg-blue-600">
        <div className="flex flex-col justify-center px-12 text-white h-full">
          <div className="max-w-lg">
            <Shield className="h-16 w-16 mb-8" />
            <h1 className="text-4xl font-bold mb-6">
              Seed Financial Quote Calculator
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              Secure access to generate professional quotes and manage client relationships through HubSpot integration.
            </p>
            <div className="space-y-4 text-blue-100">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-300 rounded-full mr-3"></div>
                Real-time pricing calculations
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-300 rounded-full mr-3"></div>
                HubSpot CRM integration
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-300 rounded-full mr-3"></div>
                Quote management and tracking
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-300 rounded-full mr-3"></div>
                Secure user authentication
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}