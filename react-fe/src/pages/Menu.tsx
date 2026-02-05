import { useNavigate } from "react-router-dom";
import { useSetAtom } from "jotai";
import { setTokenAtom } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function Menu() {
  const navigate = useNavigate();
  const setToken = useSetAtom(setTokenAtom);

  const handleLogout = () => {
    setToken(null);
    toast.success("退出登录成功");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="bg-white/10 backdrop-blur-xl border-b border-white/10 shadow-lg relative z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">AI应用平台</h1>
          <Button
            variant="ghost"
            className="text-white hover:bg-white/20 gap-2"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
          {/* AI Chat Card */}
          <Card
            className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl cursor-pointer transition-all duration-300 hover:-translate-y-4 hover:shadow-[0_20px_60px_rgba(0,0,0,0.2)] group animate-in fade-in slide-in-from-bottom-8 duration-700"
            onClick={() => navigate("/ai-chat")}
          >
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3">
                <MessageSquare className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3 transition-colors group-hover:text-blue-600">
                AI聊天
              </h3>
              <p className="text-gray-500 text-lg">与AI进行智能对话</p>
            </CardContent>
          </Card>

          {/* Placeholder for future features */}
          <Card className="bg-white/50 backdrop-blur-xl border-0 shadow-xl opacity-60 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-lg">
                <span className="text-3xl text-white">+</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-500 mb-3">
                更多功能
              </h3>
              <p className="text-gray-400 text-lg">敬请期待</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
