import { createContext, useContext } from "react";
import en from "./en.json";
import zh from "./zh-CN.json";
import type { Language } from "../core/types";
export function translate(language: Language, key: string): string {
  return (language === "en" ? en : zh)[key as keyof typeof en] ?? key;
}
export function initialLanguage(): Language {
  const saved = localStorage.getItem("focusgo-language");
  return saved === "en" || saved === "zh-CN"
    ? saved
    : navigator.language.startsWith("en")
      ? "en"
      : "zh-CN";
}
export const I18nContext = createContext<{
  language: Language;
  setLanguage: (l: Language) => void;
}>({ language: "zh-CN", setLanguage: () => {} });
export function useI18n() {
  const ctx = useContext(I18nContext);
  return { ...ctx, t: (key: string) => translate(ctx.language, key) };
}
