import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import zh from "./locales/zh";

// Get saved language from localStorage or default to system language
const getSavedLanguage = (): string => {
  const saved = localStorage.getItem("language");
  if (saved && ["zh", "en"].includes(saved)) {
    return saved;
  }
  // Default to Chinese if browser language starts with zh, otherwise English
  const browserLang = navigator.language.toLowerCase();
  return browserLang.startsWith("zh") ? "zh" : "en";
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: getSavedLanguage(),
  fallbackLng: "zh",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
