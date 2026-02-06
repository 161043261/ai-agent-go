import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { setTokenAtom } from "@/stores/auth";
import api from "@/services/api";
import type { LoginResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { SettingsBar } from "@/components/SettingsBar";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setToken = useSetAtom(setTokenAtom);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.username.trim()) {
      toast.error(t("auth.usernameRequired"));
      return;
    }
    if (!form.password || form.password.length < 6) {
      toast.error(t("auth.passwordRequired"));
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<LoginResponse>("/user/login", {
        username: form.username,
        password: form.password,
      });

      if (response.data.code === 1000 && response.data.token) {
        setToken(response.data.token);
        toast.success(t("auth.loginSuccess"));
        navigate("/menu");
      } else {
        toast.error(response.data.message || t("auth.loginFailed"));
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Settings Bar - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <SettingsBar />
      </div>

      <div className="flex-1 flex items-center justify-center">
        <Card className="w-[420px] border border-border shadow-none rounded-lg bg-card">
          <CardHeader className="text-center pb-2 pt-10">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-normal text-foreground">
              {t("auth.login")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {t("auth.continueWith")}
            </p>
          </CardHeader>
          <CardContent className="px-10 pb-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className="text-muted-foreground text-xs font-medium"
                >
                  {t("auth.username")}
                </Label>
                <Input
                  id="username"
                  placeholder={t("auth.usernameRequired")}
                  value={form.username}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, username: e.target.value }))
                  }
                  className="h-12 rounded-md border-input focus:border-primary focus:ring-primary transition-colors bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-muted-foreground text-xs font-medium"
                >
                  {t("auth.password")}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("auth.passwordRequired")}
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="h-12 rounded-md border-input focus:border-primary focus:ring-primary transition-colors bg-background"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <Link
                  to="/register"
                  className="text-sm text-primary hover:text-primary/80 font-medium"
                >
                  {t("auth.noAccount")}
                </Link>
                <Button
                  type="submit"
                  className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
                  disabled={loading}
                >
                  {loading ? t("auth.signingIn") : t("common.next")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
