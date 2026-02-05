import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSetAtom } from "jotai";
import { setTokenAtom } from "@/stores/auth";
import api from "@/services/api";
import type { LoginResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function Login() {
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
      toast.error("请输入用户名");
      return;
    }
    if (!form.password || form.password.length < 6) {
      toast.error("密码长度不能少于6位");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<LoginResponse>("/user/login", {
        username: form.username,
        password: form.password,
      });

      if (response.data.status_code === 1000 && response.data.token) {
        setToken(response.data.token);
        toast.success("登录成功");
        navigate("/menu");
      } else {
        toast.error(response.data.status_msg || "登录失败");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("登录失败，请重试");
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
            登录
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                placeholder="请输入用户名"
                value={form.username}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, username: e.target.value }))
                }
                className="h-12 transition-all focus:scale-[1.02]"
              />
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
                className="h-12 transition-all focus:scale-[1.02]"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              disabled={loading}
            >
              {loading ? "登录中..." : "登录"}
            </Button>

            <div className="text-center">
              <Link
                to="/register"
                className="text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
              >
                还没有账号？去注册
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
