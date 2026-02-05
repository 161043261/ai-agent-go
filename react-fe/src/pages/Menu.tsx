import { useNavigate } from "react-router-dom";
import { useSetAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { setTokenAtom } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, LogOut, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SettingsBar } from "@/components/SettingsBar";

export default function Menu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setToken = useSetAtom(setTokenAtom);

  const handleLogout = () => {
    setToken(null);
    toast.success(t("auth.logoutSuccess"));
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-normal text-foreground">{t("menu.title")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <SettingsBar />
            <div className="h-6 w-px bg-border mx-2" />
            <Button
              variant="ghost"
              className="text-muted-foreground hover:bg-muted gap-2"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              {t("auth.logout")}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-normal text-foreground mb-4">
              {t("menu.welcome")}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t("menu.selectApp")}
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Chat Card */}
            <Card
              className="bg-card border border-border hover:border-primary cursor-pointer transition-all duration-200 hover:shadow-lg group"
              onClick={() => navigate("/ai-chat")}
            >
              <CardContent className="p-8">
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-primary">
                    <MessageSquare className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-2 group-hover:text-primary transition-colors">
                      {t("menu.aiChat")}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {t("menu.aiChatDesc")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Coming Soon Card */}
            <Card className="bg-card border border-border opacity-60">
              <CardContent className="p-8">
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl text-muted-foreground">+</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">
                      {t("menu.moreFeatures")}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {t("menu.moreFeaturesDesc")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2024 {t("menu.title")}</span>
          <div className="flex gap-6">
            <span className="hover:text-foreground cursor-pointer">{t("menu.privacyPolicy")}</span>
            <span className="hover:text-foreground cursor-pointer">{t("menu.termsOfService")}</span>
            <span className="hover:text-foreground cursor-pointer">{t("menu.help")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
