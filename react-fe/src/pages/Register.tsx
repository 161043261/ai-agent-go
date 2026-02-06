import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "@/services/api";
import type { ApiResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { SettingsBar } from "@/components/SettingsBar";

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({
    email: "",
    captcha: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const sendCode = async () => {
    if (!form.email) {
      toast.warning(t("auth.emailRequired"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error(t("auth.emailInvalid"));
      return;
    }

    setCodeLoading(true);
    try {
      const response = await api.post<ApiResponse>("/user/captcha", {
        email: form.email,
      });

      if (response.data.code === 1000) {
        toast.success(t("auth.captchaSent"));
        setCountdown(60);
        timerRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error(response.data.message || t("auth.captchaFailed"));
      }
    } catch (error) {
      console.error("Send code error:", error);
      toast.error(t("auth.captchaFailed"));
    } finally {
      setCodeLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error(t("auth.emailInvalid"));
      return;
    }
    if (!form.captcha) {
      toast.error(t("auth.captchaRequired"));
      return;
    }
    if (!form.password || form.password.length < 6) {
      toast.error(t("auth.passwordRequired"));
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<ApiResponse>("/user/register", {
        email: form.email,
        captcha: form.captcha,
        password: form.password,
      });

      if (response.data.code === 1000) {
        toast.success(t("auth.registerSuccess"));
        navigate("/login");
      } else {
        toast.error(response.data.message || t("auth.registerFailed"));
      }
    } catch (error) {
      console.error("Register error:", error);
      toast.error(t("auth.registerFailed"));
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
                <UserPlus className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-normal text-foreground">
              {t("auth.register")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {t("auth.registerFor")}
            </p>
          </CardHeader>
          <CardContent className="px-10 pb-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-muted-foreground text-xs font-medium"
                >
                  {t("auth.email")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.emailRequired")}
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="h-12 rounded-md border-input focus:border-primary focus:ring-primary bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="captcha"
                  className="text-muted-foreground text-xs font-medium"
                >
                  {t("auth.captcha")}
                </Label>
                <div className="flex gap-3">
                  <Input
                    id="captcha"
                    placeholder={t("auth.captchaRequired")}
                    value={form.captcha}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, captcha: e.target.value }))
                    }
                    className="h-12 flex-1 rounded-md border-input focus:border-primary focus:ring-primary bg-background"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 px-4 whitespace-nowrap border-input text-primary hover:bg-accent hover:text-primary"
                    onClick={sendCode}
                    disabled={codeLoading || countdown > 0}
                  >
                    {countdown > 0 ? `${countdown}s` : t("auth.sendCode")}
                  </Button>
                </div>
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
                  className="h-12 rounded-md border-input focus:border-primary focus:ring-primary bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-muted-foreground text-xs font-medium"
                >
                  {t("auth.confirmPassword")}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t("auth.passwordMismatch")}
                  value={form.confirmPassword}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  className="h-12 rounded-md border-input focus:border-primary focus:ring-primary bg-background"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <Link
                  to="/login"
                  className="text-sm text-primary hover:text-primary/80 font-medium"
                >
                  {t("auth.hasAccount")}
                </Link>
                <Button
                  type="submit"
                  className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md"
                  disabled={loading}
                >
                  {loading ? t("auth.registering") : t("auth.register")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
