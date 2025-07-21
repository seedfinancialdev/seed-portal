import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
  const { user, loginMutation } = useAuth();

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

  const onLogin = (data: LoginFormData) => {
    loginMutation.mutate(data);
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
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-gray-200">
            Sign in to access the quote calculator
          </p>
        </div>

        <Card className="bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="text-center text-gray-900">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
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
                          placeholder="name@seedfinancial.io"
                          disabled={loginMutation.isPending}
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
                          disabled={loginMutation.isPending}
                          className="bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full bg-[#e24c00] hover:bg-[#c23e00] text-white" 
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Sign In
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}