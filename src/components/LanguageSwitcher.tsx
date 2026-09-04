import { Languages } from "lucide-react";
import { LANGUAGES, useI18n, type Lang } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();

  return (
    <div className={`flex items-center gap-2 print:hidden ${className ?? ""}`}>
      <Languages className="size-4 opacity-80" aria-hidden />
      <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
        <SelectTrigger className="h-9 w-[9.5rem]" aria-label={t("common.language")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((l) => (
            <SelectItem key={l.value} value={l.value}>
              {l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
