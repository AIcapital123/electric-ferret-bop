"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type Lang = "en" | "es";

type Translations = Record<Lang, Record<string, string>>;

const translations: Translations = {
  en: {
    app_title: "GK Live Deal Tracker",
    live_badge: "LiveDealUpdate",
    refresh: "Refresh",
    filters: "Filters",
    date_range: "Date Range",
    start_date: "Start date",
    end_date: "End date",
    loan_type: "Loan Type",
    min_amount: "Min Amount",
    max_amount: "Max Amount",
    status: "Status",
    apply: "Apply",
    reset_filters: "Reset Filters",
    table_date_submitted: "Date Submitted",
    table_loan_type: "Loan Type",
    table_company_name: "Legal Company Name",
    table_client_name: "Client Name",
    table_loan_amount: "Loan Amount",
    table_status: "Status",
    loading_deals: "Loading deals...",
    no_deals_found: "No deals found",
    sync_emails: "Sync Emails",
    settings: "Settings",
    new_app_in: "New application received",
    view: "View",
    open_dashboard: "Open Dashboard",
  },
  es: {
    app_title: "GK Rastreador de Operaciones en Vivo",
    live_badge: "Actualización en vivo",
    refresh: "Actualizar",
    filters: "Filtros",
    date_range: "Rango de fechas",
    start_date: "Fecha inicial",
    end_date: "Fecha final",
    loan_type: "Tipo de préstamo",
    min_amount: "Monto mínimo",
    max_amount: "Monto máximo",
    status: "Estado",
    apply: "Aplicar",
    reset_filters: "Restablecer filtros",
    table_date_submitted: "Fecha de envío",
    table_loan_type: "Tipo de préstamo",
    table_company_name: "Razón social",
    table_client_name: "Nombre del cliente",
    table_loan_amount: "Monto del préstamo",
    table_status: "Estado",
    loading_deals: "Cargando operaciones...",
    no_deals_found: "No se encontraron operaciones",
    sync_emails: "Sincronizar correos",
    settings: "Configuración",
    new_app_in: "Nueva solicitud recibida",
    view: "Ver",
    open_dashboard: "Abrir Panel",
  },
};

type LanguageContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  const t = useMemo(() => {
    const dict = translations[lang];
    return (key: string) => dict[key] ?? key;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}