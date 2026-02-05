import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/services/api";
import type { ApiResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function Register() {
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
      toast.warning("请先输入邮箱");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("请输入正确的邮箱格式");
      return;
    }

    setCodeLoading(true);
    try {
      const response = await api.post<ApiResponse>("/user/captcha", {
        email: form.email,
      });

      if (response.data.status_code === 1000) {
        toast.success("验证码发送成功");
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
        toast.error(response.data.status_msg || "验证码发送失败");
      }
    } catch (error) {
      console.error("Send code error:", error);
      toast.error("验证码发送失败，请重试");
    } finally {
      setCodeLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("请输入正确的邮箱格式");
      return;
    }
    if (!form.captcha) {
      toast.error("请输入验证码");
      return;
    }
    if (!form.password || form.password.length < 6) {
      toast.error("密码长度不能少于6位");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("两次输入密码不一致");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<ApiResponse>("/user/register", {
        email: form.email,
        captcha: form.captcha,
        password: form.password,
      });

      if (response.data.status_code === 1000) {
        toast.success("注册成功，请登录");
        navigate("/login");
      } else {
        toast.error(response.data.status_msg || "注册失败");
      }
    } catch (error) {
      console.error("Register error:", error);
      toast.error("注册失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-[420px] bg-white/95 backdrop-blur-xl shadow-2xl border-0 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            注册
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="请输入邮箱"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                className="h-11 transition-all focus:scale-[1.02]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="captcha">验证码</Label>
              <div className="flex gap-3">
                <Input
                  id="captcha"
                  placeholder="请输入验证码"
                  value={form.captcha}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, captcha: e.target.value }))
                  }
                  className="h-11 flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 px-4 whitespace-nowrap"
                  onClick={sendCode}
                  disabled={codeLoading || countdown > 0}
                >
                  {countdown > 0 ? `${countdown}s` : "发送验证码"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
                className="h-11 transition-all focus:scale-[1.02]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                className="h-11 transition-all focus:scale-[1.02]"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              disabled={loading}
            >
              {loading ? "注册中..." : "注册"}
            </Button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
              >
                已有账号？去登录
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
