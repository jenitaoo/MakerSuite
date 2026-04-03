import { useState, useContext, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { AuthContext } from "../context/AuthContext";
import { authService } from "../services/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface ProfileValues {
  full_name: string;
  username: string;
  email: string;
}

interface PasswordValues {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const Profile = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

    const { register: regProfile, handleSubmit: handleProfileSubmit, reset: resetProfile, formState: { isSubmitting: profileSubmitting } } =
    useForm<ProfileValues>({
      defaultValues: {
        full_name: auth?.user?.full_name ?? "",
        username: auth?.user?.username ?? "",
        email: auth?.user?.email ?? "",
      },
    });


    useEffect(() => {
    if (auth?.user) {
        resetProfile({
        full_name: auth.user.full_name ?? "",
        username: auth.user.username ?? "",
        email: auth.user.email ?? "",
        });
    }
    }, [auth?.user]);

  const { register: regPassword, handleSubmit: handlePasswordSubmit, reset: resetPassword, watch,
    formState: { isSubmitting: passwordSubmitting, errors: passwordErrors } } =
    useForm<PasswordValues>();

  const newPassword = watch("new_password");

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const onProfileSubmit = async (values: ProfileValues) => {
    setProfileError("");
    setProfileSuccess("");
    try {
      const formData = new FormData();
      formData.append("full_name", values.full_name);
      formData.append("username", values.username);
      formData.append("email", values.email);
      if (avatarFile) formData.append("photo", avatarFile);
      const updated = await authService.updateProfile(formData);
      auth?.setUser(updated);
      setProfileSuccess("Profile updated successfully.");
    } catch {
      setProfileError("Failed to update profile. Please try again.");
    }
  };

  const onPasswordSubmit = async (values: PasswordValues) => {
    setPasswordError("");
    setPasswordSuccess("");
    try {
      await authService.changePassword(values);
      setPasswordSuccess("Password changed successfully.");
      resetPassword();
    } catch (err: any) {
      const msg = err?.response?.data?.current_password || "Failed to change password.";
      setPasswordError(msg);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    auth?.setUser(null);
    navigate("/login");
  };

  const getInitials = () => {
    const name = auth?.user?.full_name || auth?.user?.username || "";
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
        <p className="text-muted-foreground mt-1 text-white">Manage your account details, security and connections</p>
      </div>

      {/* Account Section */}
      <Card className="bg-[#fdf8f6]">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Update your personal information and profile photo</CardDescription>
        </CardHeader>
        <CardContent>
          {profileSuccess && (
            <Alert className="mb-4">
              <AlertDescription>{profileSuccess}</AlertDescription>
            </Alert>
          )}
          {profileError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{profileError}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarPreview ?? auth?.user?.photo ?? undefined} />
                <AvatarFallback className="text-lg font-semibold">{getInitials()}</AvatarFallback>
              </Avatar>
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Change photo
                </Button>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG up to 5MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" {...regProfile("full_name")} placeholder="Jane Smith" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" {...regProfile("username")} placeholder="jane_smith" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...regProfile("email")} placeholder="jane@example.com" />
              </div>
            </div>

            <Button type="submit" disabled={profileSubmitting}>
              {profileSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card className="bg-[#fdf8f6]">
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <CardContent>
          {passwordSuccess && (
            <Alert className="mb-4">
              <AlertDescription>{passwordSuccess}</AlertDescription>
            </Alert>
          )}
          {passwordError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{passwordError}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password</Label>
              <Input
                id="current_password"
                type="password"
                placeholder="••••••••"
                {...regPassword("current_password", { required: "Required" })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                type="password"
                placeholder="••••••••"
                {...regPassword("new_password", {
                  required: "Required",
                  minLength: { value: 8, message: "At least 8 characters" }
                })}
              />
              {passwordErrors.new_password && (
                <p className="text-sm text-destructive">{passwordErrors.new_password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <Input
                id="confirm_password"
                type="password"
                placeholder="••••••••"
                {...regPassword("confirm_password", {
                  required: "Required",
                  validate: v => v === newPassword || "Passwords don't match"
                })}
              />
              {passwordErrors.confirm_password && (
                <p className="text-sm text-destructive">{passwordErrors.confirm_password.message}</p>
              )}
            </div>
            <Button type="submit" disabled={passwordSubmitting}>
              {passwordSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Connections Section */}
      <Card className="bg-[#fdf8f6]">
        <CardHeader>
          <CardTitle>Connections</CardTitle>
          <CardDescription>Manage your connected marketplace accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Etsy */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Etsy</p>
              <p className="text-sm text-muted-foreground">
                {auth?.user?.etsy_connected
                  ? "Connected — sync your Etsy listings"
                  : "Connect to sync your Etsy listings"}
              </p>
            </div>
            {auth?.user?.etsy_connected ? (
              <Badge variant="secondary">Connected</Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = "/api/etsy/login/"}
              >
                Connect Etsy
              </Button>
            )}
          </div>

          <Separator />

          {/* Shopify */}
          <div className="flex items-center justify-between opacity-50">
            <div>
              <p className="font-medium">Shopify</p>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
            <Badge variant="outline">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <div className="pt-2">
        <Separator className="mb-6" />
            <Button
            variant="destructive"
            style={{ backgroundColor: "#b84141", color: "#ffffff" }}
            size="lg"
            className="w-full text-base font-semibold"
            onClick={handleLogout}
            >
            Log Out
            </Button>
      </div>
    </div>
  );
};

export default Profile;