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

    // Navigation
    nav_dashboard: "Dashboard",
    nav_deals: "Deals",
    nav_analytics: "Analytics",
    nav_settings: "Settings",

    // Metrics
    metrics_total_deals: "Total Deals",
    metrics_new_deals: "New Deals",
    metrics_funded_deals: "Funded Deals",
    metrics_avg_amount: "Avg Amount",

    // Analytics
    loan_amount_over_time: "Loan Amounts Over Time",

    // Settings page
    parsing_sync_configuration: "Parsing & Sync Configuration",
    test_mode: "Test Mode",
    test_mode_desc: "Use mock data from the Edge Function to validate the pipeline.",
    gmail_search_query: "Gmail Search Query",
    save: "Save",
    run_test_sync: "Run Test Sync",
    detailed_error_log: "Detailed Error Log",
    clear_log: "Clear Log",
    time: "Time",
    source: "Source",
    code: "Code",
    message: "Message",
    details: "Details",
    no_errors_logged_yet: "No errors logged yet.",

    // Deal detail
    loading_deal_details: "Loading deal details...",
    deal_not_found: "Deal not found",
    loan_amount: "Loan Amount",
    date_submitted: "Date Submitted",
    contact_information: "Contact Information",
    employment_information: "Employment Information",
    employment_type: "Employment Type",
    employer: "Employer",
    job_title: "Job Title",
    annual_salary: "Annual Salary",
    loan_purpose: "Loan Purpose",
    referral: "Referral",
    ai_insights: "AI Insights",
    summary: "Summary",
    next_best_action: "Next Best Action",
    notes: "Notes",
    add_note: "Add Note",
    adding: "Adding...",
    original_emails: "Original Emails",
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

    // Navigation
    nav_dashboard: "Panel",
    nav_deals: "Operaciones",
    nav_analytics: "Analítica",
    nav_settings: "Configuración",

    // Metrics
    metrics_total_deals: "Operaciones Totales",
    metrics_new_deals: "Operaciones Nuevas",
    metrics_funded_deals: "Operaciones Financiadas",
    metrics_avg_amount: "Monto Promedio",

    // Analytics
    loan_amount_over_time: "Montos de Préstamo en el Tiempo",

    // Settings page
    parsing_sync_configuration: "Configuración de Parseo y Sincronización",
    test_mode: "Modo de Prueba",
    test_mode_desc: "Usa datos simulados del Edge Function para validar el flujo.",
    gmail_search_query: "Consulta de búsqueda en Gmail",
    save: "Guardar",
    run_test_sync: "Ejecutar Prueba de Sincronización",
    detailed_error_log: "Registro Detallado de Errores",
    clear_log: "Limpiar Registro",
    time: "Hora",
    source: "Fuente",
    code: "Código",
    message: "Mensaje",
    details: "Detalles",
    no_errors_logged_yet: "No hay errores registrados aún.",

    // Deal detail
    loading_deal_details: "Cargando detalles de la operación...",
    deal_not_found: "Operación no encontrada",
    loan_amount: "Monto del Préstamo",
    date_submitted: "Fecha de envío",
    contact_information: "Información de Contacto",
    employment_information: "Información Laboral",
    employment_type: "Tipo de Empleo",
    employer: "Empleador",
    job_title: "Cargo",
    annual_salary: "Salario Anual",
    loan_purpose: "Propósito del Préstamo",
    referral: "Referencia",
    ai_insights: "Ideas de IA",
    summary: "Resumen",
    next_best_action: "Próxima Mejor Acción",
    notes: "Notas",
    add_note: "Agregar Nota",
    adding: "Agregando...",
    original_emails: "Correos Originales",
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