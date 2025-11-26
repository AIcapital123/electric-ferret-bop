"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "./language-provider";

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <Select value={lang} onValueChange={(val) => setLang(val as "en" | "es")}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="es">Español</SelectItem>
      </SelectContent>
    </Select>
  );
}