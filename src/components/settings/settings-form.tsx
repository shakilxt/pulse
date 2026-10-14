"use client";

import { type ReactNode, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Activity, Check, CirclePause, CreditCard, FileText, Monitor, Moon, RotateCcw, Sun, UserRound, type LucideIcon } from "lucide-react";
import { setThemePreference, useThemePreference } from "@/components/theme/theme-store";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { RANGE_PRESET_LABELS } from "@/lib/dates";
import { CURRENCY_CODES, type CurrencyCode, DEMO_EXCHANGE_RATE_NOTE } from "@/lib/money";
import {
  CHART_MOTION_OPTIONS,
  type ChartMotion,
  DEFAULT_PERIOD_OPTIONS,
  DEFAULT_SETTINGS,
  type DefaultPeriod,
  PAGE_DEFAULT_PERIOD,
  type Settings,
  type SettingsErrors,
  WORKSPACE_NAME_MAX,
  normalizeWorkspaceName,
  settingsEqual,
  validateSettings,
} from "@/lib/settings";
import { THEME_PREFERENCES, type ThemePreference } from "@/lib/theme";
import { NOTIFICATION_CATEGORIES, type NotificationCategory } from "@/types/domain";
import { writeSavedSettings } from "./settings-store";

const THEME_OPTIONS: Record<ThemePreference, { label: string; description: string; icon: LucideIcon }> = {
  system: { label: "System", description: "Follow the device setting", icon: Monitor },
  light: { label: "Light", description: "Ivory surfaces", icon: Sun },
  dark: { label: "Dark", description: "Deep botanical green", icon: Moon },
};

const CURRENCY_OPTIONS: Record<CurrencyCode, { label: string; symbol: string }> = {
  USD: { label: "US dollar", symbol: "$" },
  EUR: { label: "Euro", symbol: "€" },
  GBP: { label: "Pound sterling", symbol: "£" },
};

const MOTION_OPTIONS: Record<ChartMotion, { label: string; description: string; icon: LucideIcon }> = {
  system: { label: "Follow system", description: "Animate unless the device asks for reduced motion", icon: Activity },
  off: { label: "Off", description: "Charts appear without animating", icon: CirclePause },
};

const NOTIFICATION_OPTIONS: Record<NotificationCategory, { label: string; description: string; icon: LucideIcon }> = {
  payments: { label: "Payments", description: "Pending, failed and refunded charges", icon: CreditCard },
  customers: { label: "Customers", description: "Large new orders and customer milestones", icon: UserRound },
  reports: { label: "Reports", description: "Weekly and monthly summaries when they are ready", icon: FileText },
};

function periodLabel(period: DefaultPeriod): string {
  return period === PAGE_DEFAULT_PERIOD ? "Each page's own default" : RANGE_PRESET_LABELS[period];
}

interface SettingsFormProps {
  /** The settings saved in this browser, read on the server. */
  saved: Settings;
}

/**
 * Interface preferences, applied when saved and kept in this browser's
 * cookies. Nothing is sent to an account or a remote service.
 */
export function SettingsForm({ saved }: SettingsFormProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const savedTheme = useThemePreference();
  const [draft, setDraft] = useState<Settings>(saved);
  // Null until the visitor picks a theme here, so the form always shows the theme in effect.
  const [themeDraft, setThemeDraft] = useState<ThemePreference | null>(null);
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const ids = { name: useId(), nameHelp: useId(), nameError: useId(), period: useId(), periodHelp: useId() };

  const theme = themeDraft ?? savedTheme;
  const dirty = !settingsEqual(draft, saved) || theme !== savedTheme;

  function update(patch: Partial<Settings>) {
    setDraft((current) => ({ ...current, ...patch }));
    setStatus(null);
  }

  function save() {
    const next = { ...draft, workspaceName: normalizeWorkspaceName(draft.workspaceName) };
    const found = validateSettings(next);
    setErrors(found);
    if (found.workspaceName) {
      setStatus({ tone: "error", text: "Settings were not saved. Fix the highlighted field and try again." });
      nameRef.current?.focus();
      return;
    }
    writeSavedSettings(next);
    if (theme !== savedTheme) setThemePreference(theme);
    setDraft(next);
    setThemeDraft(null);
    setStatus({ tone: "success", text: "Settings saved in this browser. Every page now uses them." });
    // Server-rendered figures (currency, period, names) re-render with the new cookie.
    startRefresh(() => router.refresh());
  }

  function discard() {
    setDraft(saved);
    setThemeDraft(null);
    setErrors({});
    setStatus(null);
  }

  return (
    <form
      noValidate
      aria-label="Settings"
      className="mt-7"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="divide-y divide-line rounded-xl border border-line bg-surface">
        <SettingsSection
          id="workspace"
          title="Workspace"
          description="How the workspace is named across the sidebar, menus, greeting and reports."
        >
          <div>
            <label htmlFor={ids.name} className="block text-sm font-medium text-ink">
              Workspace name
            </label>
            <input
              ref={nameRef}
              id={ids.name}
              name="workspaceName"
              type="text"
              autoComplete="organization"
              required
              maxLength={WORKSPACE_NAME_MAX + 20}
              value={draft.workspaceName}
              aria-invalid={errors.workspaceName ? true : undefined}
              aria-describedby={errors.workspaceName ? `${ids.nameError} ${ids.nameHelp}` : ids.nameHelp}
              onChange={(event) => {
                update({ workspaceName: event.target.value });
                if (errors.workspaceName) setErrors(validateSettings({ ...draft, workspaceName: event.target.value }));
              }}
              onBlur={() => setErrors(validateSettings(draft))}
              className={cn(
                "mt-2 h-10 w-full max-w-md rounded-md border bg-surface px-3 text-sm text-ink transition-colors placeholder:text-ink-muted",
                errors.workspaceName ? "border-danger" : "border-line-strong hover:border-ink-muted",
              )}
            />
            {errors.workspaceName ? (
              <p id={ids.nameError} className="mt-2 text-sm font-medium text-danger">
                {errors.workspaceName}
              </p>
            ) : null}
            <p id={ids.nameHelp} className="mt-2 text-xs text-ink-muted">
              2 to {WORKSPACE_NAME_MAX} characters. The fictional data stays the same whatever the name.
            </p>
          </div>
        </SettingsSection>

        <SettingsSection id="appearance" title="Appearance" description="Theme for this browser. System follows your device.">
          <ChoiceGroup legend="Theme" columns={3}>
            {THEME_PREFERENCES.map((value) => {
              const option = THEME_OPTIONS[value];
              return (
                <ChoiceCard
                  key={value}
                  name="theme"
                  value={value}
                  checked={theme === value}
                  onChange={() => {
                    setThemeDraft(value);
                    setStatus(null);
                  }}
                  icon={option.icon}
                  label={option.label}
                  description={option.description}
                />
              );
            })}
          </ChoiceGroup>
        </SettingsSection>

        <SettingsSection
          id="currency"
          title="Display currency"
          description="Every amount, chart and report is shown in this currency. The ledger itself is in US dollars."
        >
          <ChoiceGroup legend="Currency" columns={3} note={DEMO_EXCHANGE_RATE_NOTE}>
            {CURRENCY_CODES.map((code) => {
              const option = CURRENCY_OPTIONS[code];
              return (
                <ChoiceCard
                  key={code}
                  name="currency"
                  value={code}
                  checked={draft.currency === code}
                  onChange={() => update({ currency: code })}
                  symbol={option.symbol}
                  label={code}
                  description={option.label}
                />
              );
            })}
          </ChoiceGroup>
        </SettingsSection>

        <SettingsSection id="display" title="Display options" description="Where reporting pages start and how charts behave.">
          <div className="space-y-6">
            <div>
              <label htmlFor={ids.period} className="block text-sm font-medium text-ink">
                Default date range
              </label>
              <Select
                id={ids.period}
                name="defaultPeriod"
                aria-describedby={ids.periodHelp}
                value={draft.defaultPeriod}
                onChange={(event) => {
                  const value = DEFAULT_PERIOD_OPTIONS.find((option) => option === event.target.value);
                  if (value) update({ defaultPeriod: value });
                }}
                className="mt-2 w-full max-w-xs"
              >
                {DEFAULT_PERIOD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {periodLabel(option)}
                  </option>
                ))}
              </Select>
              <p id={ids.periodHelp} className="mt-2 text-xs text-ink-muted">
                Used by Overview, Analytics, Products and Reports when the address has no range. Each page&apos;s own default
                is 30 days on Overview and Reports, 90 days on Analytics and Products.
              </p>
            </div>
            <ChoiceGroup legend="Chart animation" columns={2}>
              {CHART_MOTION_OPTIONS.map((value) => (
                <ChoiceCard
                  key={value}
                  name="chartMotion"
                  value={value}
                  checked={draft.chartMotion === value}
                  onChange={() => update({ chartMotion: value })}
                  label={MOTION_OPTIONS[value].label}
                  description={MOTION_OPTIONS[value].description}
                  icon={MOTION_OPTIONS[value].icon}
                />
              ))}
            </ChoiceGroup>
          </div>
        </SettingsSection>

        <SettingsSection
          id="notifications"
          title="Notifications"
          description="Which demo notifications appear in the bell menu. They are in-app only: nothing is emailed or sent."
        >
          <fieldset>
            <legend className="text-sm font-medium text-ink">Show in the notifications menu</legend>
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
              {NOTIFICATION_CATEGORIES.map((category) => {
                const option = NOTIFICATION_OPTIONS[category];
                return (
                  <li key={category}>
                    <label className="relative flex cursor-pointer items-center gap-3 px-4 py-3">
                      <option.icon aria-hidden className="size-4 shrink-0 text-accent-ink" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink">{option.label}</span>
                        <span className="block text-xs text-ink-muted">{option.description}</span>
                      </span>
                      <input
                        type="checkbox"
                        role="switch"
                        name={`notify-${category}`}
                        checked={draft.notifications[category]}
                        onChange={(event) =>
                          update({ notifications: { ...draft.notifications, [category]: event.target.checked } })
                        }
                        className="peer absolute inset-0 m-0 cursor-pointer appearance-none opacity-0"
                      />
                      <span
                        aria-hidden
                        className="relative h-6 w-10 shrink-0 rounded-full bg-line-strong transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-ink after:absolute after:top-1 after:left-1 after:size-4 after:rounded-full after:bg-surface after:shadow-sm after:transition-transform peer-checked:after:translate-x-4"
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        </SettingsSection>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink-muted">
        Settings are stored in a cookie in this browser so pages render with them from the first request. Clearing site data
        restores the defaults.
      </p>

      <div
        className={cn(
          // The bar follows the visitor down the page only while there is something to save.
          dirty && "sticky bottom-4 z-20 shadow-pop",
          "mt-6 flex flex-col gap-3 rounded-xl border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:pl-5",
          status?.tone === "error" ? "border-danger/60" : "border-line",
        )}
      >
        <p
          role="status"
          className={cn(
            "flex items-center gap-2 text-sm",
            status?.tone === "error" ? "font-medium text-danger" : status ? "text-positive" : "text-ink-muted",
          )}
        >
          {status?.tone === "success" ? <Check aria-hidden className="size-4" /> : null}
          {status ? status.text : dirty ? "You have unsaved changes." : isRefreshing ? "Applying settings…" : "No unsaved changes."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              setDraft(DEFAULT_SETTINGS);
              setThemeDraft("system");
              setErrors({});
              setStatus(null);
            }}
          >
            <RotateCcw aria-hidden />
            Restore defaults
          </Button>
          <Button variant="secondary" size="md" disabled={!dirty} onClick={discard}>
            Discard
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={!dirty && !errors.workspaceName}>
            Save changes
          </Button>
        </div>
      </div>
    </form>
  );
}

function SettingsSection({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid scroll-mt-24 gap-5 p-5 sm:p-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 id={`${id}-title`} className="text-base font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function ChoiceGroup({ legend, columns, note, children }: { legend: string; columns: 2 | 3; note?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">{legend}</legend>
      <div className={cn("mt-3 grid gap-2", columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>{children}</div>
      {note ? <p className="mt-2 text-xs text-ink-muted">{note}</p> : null}
    </fieldset>
  );
}

interface ChoiceCardProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
  icon?: LucideIcon;
  symbol?: string;
}

/** A native radio styled as a card, so arrow keys, forms and screen readers behave as usual. */
function ChoiceCard({ name, value, checked, onChange, label, description, icon: Icon, symbol }: ChoiceCardProps) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-ink",
        checked ? "border-accent-ink/60 bg-sage/40" : "border-line-strong hover:bg-surface-sunken",
      )}
    >
      {/* Transparent and stretched over the card: the whole card is the hit area, focus stays on the radio. */}
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="absolute inset-0 m-0 cursor-pointer appearance-none rounded-lg opacity-0"
      />
      <span
        aria-hidden
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-md border text-sm font-semibold",
          checked ? "border-accent-ink/40 bg-surface text-accent-ink" : "border-line bg-surface-sunken text-ink-muted",
        )}
      >
        {Icon ? <Icon className="size-4" /> : symbol}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs leading-snug text-ink-muted">{description}</span>
      </span>
    </label>
  );
}
