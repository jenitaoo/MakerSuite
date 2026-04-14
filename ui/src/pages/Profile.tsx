import { useState, useContext, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { AuthContext } from "../context/AuthContext";
import { authService } from "../services/auth";
import { getCookie, API_URL } from "../services/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { persistentSuccess, persistentError } from "../utils/toast-utils";

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

type EtsyStatus = {
  etsy_connected: boolean;
  etsy_needs_reauth: boolean;
  etsy_token_expired: boolean;
};

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
  const [etsyStatus, setEtsyStatus] = useState<EtsyStatus | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // Hourly rate
  const [hourlyRate, setHourlyRate] = useState(auth?.user?.hourly_rate ?? "14.15");
  const [savingRate, setSavingRate] = useState(false);
  const [rateSuccess, setRateSuccess] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/api/etsy/status/`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then((res) => res.json())
      .then(setEtsyStatus)
      .catch(() => setEtsyStatus({ etsy_connected: false, etsy_needs_reauth: false, etsy_token_expired: false }));
  }, []);

  const { register: regProfile, handleSubmit: handleProfileSubmit, reset: resetProfile,
    formState: { isSubmitting: profileSubmitting } } =
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
      setHourlyRate(auth.user.hourly_rate ?? "14.15");
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

  const handleSaveHourlyRate = async () => {
    setSavingRate(true);
    setRateSuccess("");
    try {
      const formData = new FormData();
      formData.append("hourly_rate", hourlyRate);
      const updated = await authService.updateProfile(formData);
      auth?.setUser(updated);
      setRateSuccess("Hourly rate updated.");
    } catch {
      persistentError("Failed to update hourly rate.");
    } finally {
      setSavingRate(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    auth?.setUser(null);
    navigate("/login");
  };

  const handleDisconnectEtsy = async () => {
    const confirmed = window.confirm(
      "Disconnect Etsy? You won't be able to sync or push listings until you reconnect."
    );
    if (!confirmed) return;
    setDisconnecting(true);
    try {
      const res = await fetch(`${API_URL}/etsy/disconnect/`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRFToken": getCookie("csrftoken") ?? "" },
      });
      if (res.ok) {
        setEtsyStatus({ etsy_connected: false, etsy_needs_reauth: false, etsy_token_expired: false });
        persistentSuccess("Etsy disconnected. You can reconnect at any time.");
      } else {
        persistentError("Failed to disconnect Etsy. Please try again.");
      }
    } catch {
      persistentError("Failed to disconnect Etsy. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  };

  const getInitials = () => {
    const name = auth?.user?.full_name || auth?.user?.username || "";
    return name.slice(0, 2).toUpperCase();
  };

  const etsyConnected = etsyStatus?.etsy_connected ?? false;
  const etsyNeedsReauth = etsyStatus?.etsy_needs_reauth ?? false;

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
          {profileSuccess && <Alert className="mb-4"><AlertDescription>{profileSuccess}</AlertDescription></Alert>}
          {profileError && <Alert variant="destructive" className="mb-4"><AlertDescription>{profileError}</AlertDescription></Alert>}
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
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
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
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

      {/* Pricing Preferences */}
      <Card className="bg-[#fdf8f6]">
        <CardHeader>
          <CardTitle>Pricing Preferences</CardTitle>
          <CardDescription>
            Your hourly rate is used by MakerSuite to calculate your labour cost and suggest a minimum selling price for your products.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hourly_rate">Your Hourly Rate (€)</Label>
            <div className="flex items-center gap-3">
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-32"
              />
              <Button onClick={handleSaveHourlyRate} disabled={savingRate} size="sm">
                {savingRate ? "Saving..." : "Save"}
              </Button>
              {rateSuccess && <span className="text-xs text-green-600">{rateSuccess}</span>}
            </div>
            <p className="text-xs text-muted-foreground">
              Default is €14.15 (Irish minimum wage). Update this to reflect your own rate.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card className="bg-[#fdf8f6]">
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <CardContent>
          {passwordSuccess && <Alert className="mb-4"><AlertDescription>{passwordSuccess}</AlertDescription></Alert>}
          {passwordError && <Alert variant="destructive" className="mb-4"><AlertDescription>{passwordError}</AlertDescription></Alert>}
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password</Label>
              <Input id="current_password" type="password" placeholder="••••••••"
                {...regPassword("current_password", { required: "Required" })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input id="new_password" type="password" placeholder="••••••••"
                {...regPassword("new_password", { required: "Required", minLength: { value: 8, message: "At least 8 characters" } })} />
              {passwordErrors.new_password && <p className="text-sm text-destructive">{passwordErrors.new_password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <Input id="confirm_password" type="password" placeholder="••••••••"
                {...regPassword("confirm_password", { required: "Required", validate: v => v === newPassword || "Passwords don't match" })} />
              {passwordErrors.confirm_password && <p className="text-sm text-destructive">{passwordErrors.confirm_password.message}</p>}
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Etsy</p>
              <p className="text-sm text-muted-foreground">
                {etsyStatus === null
                  ? "Checking connection..."
                  : etsyConnected && !etsyNeedsReauth
                  ? "Connected — sync your Etsy listings"
                  : etsyNeedsReauth
                  ? "Session expired — reconnect to continue syncing"
                  : "Connect to sync your Etsy listings"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {etsyStatus === null ? null : etsyConnected && !etsyNeedsReauth ? (
                <>
                  <Badge variant="secondary">Connected</Badge>
                  <Button variant="outline" size="sm" onClick={handleDisconnectEtsy} disabled={disconnecting}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    {disconnecting ? "Disconnecting..." : "Disconnect"}
                  </Button>
                </>
              ) : etsyNeedsReauth ? (
                <>
                  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Expired</Badge>
                  <Button variant="outline" size="sm" onClick={() => window.location.href = `${API_URL}/api/etsy/login/`}>
                    Reconnect
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => window.location.href = `${API_URL}/api/etsy/login/`}>
                  Connect Etsy
                </Button>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between opacity-50">
            <div>
              <p className="font-medium">Shopify</p>
              <p className="text-sm text-muted-foreground">Disabled</p>
            </div>
            <Badge variant="outline">Disabled</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <div className="pt-2">
        <Separator className="mb-6" />
        <Button variant="destructive" style={{ backgroundColor: "#b84141", color: "#ffffff" }}
          size="lg" className="w-full text-base font-semibold" onClick={handleLogout}>
          Log Out
        </Button>
      </div>
    </div>
  );
};

export default Profile;