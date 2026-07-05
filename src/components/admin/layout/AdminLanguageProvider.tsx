"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ADMIN_LANGUAGE_COOKIE_NAME,
  ADMIN_LANGUAGE_STORAGE_KEY,
  getAdminDirection,
  translateAdminText,
  type AdminDirection,
  type AdminLanguage,
} from "@/lib/admin/admin-i18n";

interface AdminLanguageContextValue {
  language: AdminLanguage;
  dir: AdminDirection;
  setLanguage: (language: AdminLanguage) => void;
  toggleLanguage: () => void;
  t: (english: string) => string;
  localize: (value: { en?: string | null; ar?: string | null }, fallback?: string) => string;
  formatNumber: (value: number) => string;
  formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  currency: string;
}

const AdminLanguageContext = createContext<AdminLanguageContextValue | null>(null);

interface TranslationState {
  english: string;
  arabic: string;
}

const textTranslations = new WeakMap<Text, TranslationState>();
const attributeTranslations = new WeakMap<Element, Map<string, TranslationState>>();
const TRANSLATED_ATTRIBUTES = ["placeholder", "aria-label", "title"] as const;

function preserveOuterWhitespace(source: string, translation: string): string {
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translation}${trailing}`;
}

function translateTextNode(node: Text, language: AdminLanguage) {
  const current = node.nodeValue ?? "";
  let state = textTranslations.get(node);

  if (!state) {
    state = {
      english: current,
      arabic: preserveOuterWhitespace(current, translateAdminText(current, "ar")),
    };
    textTranslations.set(node, state);
  } else if (language === "ar" && current !== state.arabic && current !== state.english) {
    state.english = current;
    state.arabic = preserveOuterWhitespace(current, translateAdminText(current, "ar"));
  }

  const next = language === "ar" ? state.arabic : state.english;
  if (current !== next) node.nodeValue = next;
}

function translateElementAttributes(element: Element, language: AdminLanguage) {
  let states = attributeTranslations.get(element);
  if (!states) {
    states = new Map();
    attributeTranslations.set(element, states);
  }

  for (const attribute of TRANSLATED_ATTRIBUTES) {
    const current = element.getAttribute(attribute);
    if (current == null) continue;

    let state = states.get(attribute);
    if (!state) {
      state = { english: current, arabic: translateAdminText(current, "ar") };
      states.set(attribute, state);
    } else if (language === "ar" && current !== state.arabic && current !== state.english) {
      state = { english: current, arabic: translateAdminText(current, "ar") };
      states.set(attribute, state);
    }

    const next = language === "ar" ? state.arabic : state.english;
    if (current !== next) element.setAttribute(attribute, next);
  }
}

function translateAdminTree(root: HTMLElement, language: AdminLanguage) {
  translateElementAttributes(root, language);

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  );

  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (
        parent &&
        !parent.closest("[data-admin-no-translate]") &&
        parent.tagName !== "SCRIPT" &&
        parent.tagName !== "STYLE"
      ) {
        translateTextNode(node as Text, language);
      }
    } else {
      const element = node as Element;
      if (!element.closest("[data-admin-no-translate]")) {
        translateElementAttributes(element, language);
      }
    }
    node = walker.nextNode();
  }
}

function persistLanguage(language: AdminLanguage) {
  window.localStorage.setItem(ADMIN_LANGUAGE_STORAGE_KEY, language);
  document.cookie = `${ADMIN_LANGUAGE_COOKIE_NAME}=${language};path=/;max-age=31536000;SameSite=Lax`;
}

export default function AdminLanguageProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage: AdminLanguage;
}) {
  const [language, setLanguageState] = useState<AdminLanguage>(initialLanguage);
  const rootRef = useRef<HTMLDivElement>(null);
  const dir = getAdminDirection(language);

  const setLanguage = useCallback((nextLanguage: AdminLanguage) => {
    setLanguageState(nextLanguage);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((current) => (current === "en" ? "ar" : "en"));
  }, []);

  useEffect(() => {
    persistLanguage(language);
  }, [language]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    translateAdminTree(root, language);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          const text = mutation.target as Text;
          if (!text.parentElement?.closest("[data-admin-no-translate]")) {
            translateTextNode(text, language);
          }
          continue;
        }

        for (const addedNode of mutation.addedNodes) {
          if (addedNode.nodeType === Node.TEXT_NODE) {
            const text = addedNode as Text;
            if (!text.parentElement?.closest("[data-admin-no-translate]")) {
              translateTextNode(text, language);
            }
          } else if (addedNode instanceof HTMLElement) {
            if (!addedNode.closest("[data-admin-no-translate]")) {
              translateAdminTree(addedNode, language);
            }
          }
        }
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [language]);

  const value = useMemo<AdminLanguageContextValue>(
    () => ({
      language,
      dir,
      setLanguage,
      toggleLanguage,
      t: (english) => translateAdminText(english, language),
      localize: (localized, fallback = "") =>
        (language === "ar" ? localized.ar || localized.en : localized.en || localized.ar) ||
        fallback,
      formatNumber: (number) =>
        new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-EG").format(number),
      formatDate: (date, options) =>
        new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-EG", options).format(
          new Date(date),
        ),
      currency: language === "ar" ? "ج.م" : "EGP",
    }),
    [dir, language, setLanguage, toggleLanguage],
  );

  return (
    <AdminLanguageContext.Provider value={value}>
      <div
        ref={rootRef}
        className="contents admin-language-root"
        lang={language}
        dir={dir}
        data-admin-language={language}
      >
        {children}
      </div>
    </AdminLanguageContext.Provider>
  );
}

export function useAdminLanguage(): AdminLanguageContextValue {
  const context = useContext(AdminLanguageContext);
  if (!context) {
    throw new Error("useAdminLanguage must be used within AdminLanguageProvider.");
  }
  return context;
}
