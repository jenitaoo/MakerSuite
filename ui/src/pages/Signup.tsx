import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { authService } from "../services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import toast from "react-hot-toast";

interface SignupValues {
  full_name: string;
  username: string;
  email: string;
  password: string;
  password2: string;
}

const Signup = () => {
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<SignupValues>({mode: "onChange"});
  const password = watch("password");

  const onSubmit = async (values: SignupValues) => {
    try {
      await authService.signup(values);
      toast.success("Account created! You can now log in.");
      navigate("/login");
    } catch (err: any) {
      const data = err?.response?.data || err?.data;
      if (data?.username) {
        setError(`Username: ${data.username[0]}`);
      } else if (data?.email) {
        setError(`Email: ${data.email[0]}`);
      } else if (data?.password) {
        setError(`Password: ${data.password[0]}`);
      } else if (data?.non_field_errors) {
        setError(data.non_field_errors[0]);
      } else {
        setError("Signup failed. Please check your details and try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md bg-[#fdf8f6]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>Fill in your details to get started</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                type="text"
                placeholder="Jane Smith"
                {...register("full_name")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="jane_smith"
                {...register("username", {
                  required: "Username is required",
                  minLength: { value: 3, message: "Must be at least 3 characters" },
                  pattern: { value: /^\S+$/, message: "Must not contain spaces" }
                })}
              />
              <p className="text-xs text-muted-foreground">At least 3 characters, no spaces</p>
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@example.com"
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 8, message: "Must be at least 8 characters" },
                  pattern: { value: /[a-zA-Z]/, message: "Must contain at least one letter" }
                })}
              />
              <p className="text-xs text-muted-foreground">At least 8 characters, including a letter</p>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password2">Confirm Password</Label>
              <Input
                id="password2"
                type="password"
                placeholder="••••••••"
                {...register("password2", {
                  required: "Please confirm your password",
                  validate: v => v === password || "Passwords don't match"
                })}
              />
              {errors.password2 && (
                <p className="text-sm text-destructive">{errors.password2.message}</p>
              )}
            </div>
            <Button aria-label="Create account" type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;