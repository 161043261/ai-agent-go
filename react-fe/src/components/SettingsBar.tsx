import { useTranslation } from "react-i18next";
import { useAtom } from "jotai";
import { themeAtom, type Theme } from "@/stores/settings";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Monitor, Languages, Check } from "lucide-react";

export function SettingsBar() {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useAtom(themeAtom);

  const currentLang = i18n.language;

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="w-4 h-4" />;
      case "dark":
        return <Moon className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* Language Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 gap-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
          >
            <Languages className="w-4 h-4" />
            <span className="text-sm">{currentLang === "zh" ? "中文" : "EN"}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[120px]">
          <DropdownMenuItem
            onClick={() => handleLanguageChange("zh")}
            className="flex items-center justify-between cursor-pointer"
          >
            <span>中文</span>
            {currentLang === "zh" && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleLanguageChange("en")}
            className="flex items-center justify-between cursor-pointer"
          >
            <span>English</span>
            {currentLang === "en" && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Theme Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
          >
            {getThemeIcon()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          <DropdownMenuItem
            onClick={() => handleThemeChange("light")}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4" />
              <span>{t("theme.light")}</span>
            </div>
            {theme === "light" && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleThemeChange("dark")}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4" />
              <span>{t("theme.dark")}</span>
            </div>
            {theme === "dark" && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleThemeChange("system")}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              <span>{t("theme.system")}</span>
            </div>
            {theme === "system" && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
