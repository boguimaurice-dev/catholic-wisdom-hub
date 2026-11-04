import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { useVault } from "../context/VaultContext";
import { copyText } from "../lib/clipboard";
import { estimateStrength } from "../lib/crypto";
import { toast, useToastFeed } from "../lib/toast";
import { Check, Copy, Eye, EyeOff, X } from "./icons";

/* ------------------------------------------------------------------ */
/*  Boutons                                                            */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "soft" | "ghost" | "outline" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  loading?: boolean;
  full?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  full = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant} btn--${size} ${full ? "btn--full" : ""} ${className}`.trim()}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : icon}
      {children ? <span>{children}</span> : null}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: "default" | "danger" | "accent";
}

export function IconButton({ label, tone = "default", className = "", children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-btn icon-btn--${tone} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Champs                                                             */
/* ------------------------------------------------------------------ */

interface FieldProps {
  label?: string;
  hint?: ReactNode;
  error?: string | null;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, htmlFor, children, className = "" }: FieldProps) {
  const generatedId = useId();
  const fieldId = htmlFor ?? generatedId;
  const content = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string }>, {
        id: (children.props as { id?: string }).id ?? fieldId,
      })
    : children;

  return (
    <div className={`field ${className}`.trim()}>
      {label ? (
        <label className="field__label" htmlFor={fieldId}>
          {label}
        </label>
      ) : null}
      {content}
      {error ? <p className="field__error">{error}</p> : null}
      {hint && !error ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`.trim()} {...rest} />;
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`input textarea ${className}`.trim()} {...rest} />;
}

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  revealLabel?: string;
}

export function PasswordInput({ className = "", ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-input">
      <input type={visible ? "text" : "password"} className={`input ${className}`.trim()} {...rest} />
      <button
        type="button"
        className="password-input__toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer" : "Afficher"}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export function Switch({ checked, onChange, label, description }: SwitchProps) {
  const id = useId();
  return (
    <div className="switch-row">
      <div className="switch-row__text">
        <label htmlFor={id}>{label}</label>
        {description ? <p>{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch ${checked ? "switch--on" : ""}`.trim()}
        onClick={() => onChange(!checked)}
      >
        <span className="switch__thumb" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modale                                                             */
/* ------------------------------------------------------------------ */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Empêche la fermeture par clic extérieur (formulaires avec saisie). */
  dismissible?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  dismissible = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [dismissible, onClose, open]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal"
      role="presentation"
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`modal__panel modal__panel--${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal__header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <IconButton label="Fermer" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/*  Copie                                                              */
/* ------------------------------------------------------------------ */

interface CopyButtonProps {
  value: string;
  label?: string;
  compact?: boolean;
  variant?: ButtonVariant;
}

export function CopyButton({ value, label = "Copier", compact = true, variant = "soft" }: CopyButtonProps) {
  const { settings } = useVault();
  const [copied, setCopied] = useState(false);

  const handle = async () => {
    const ok = await copyText(value, settings.copyClearSeconds);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      toast(
        settings.copyClearSeconds > 0
          ? `Copié — effacement dans ${settings.copyClearSeconds} s`
          : "Copié dans le presse-papiers",
      );
    } else {
      toast("Impossible de copier automatiquement. Sélectionnez le texte.", "error");
    }
  };

  if (compact) {
    return (
      <IconButton
        label={copied ? "Copié !" : label}
        onClick={handle}
        className={copied ? "is-copied" : ""}
      >
        {copied ? <Check size={17} /> : <Copy size={17} />}
      </IconButton>
    );
  }

  return (
    <Button variant={variant} size="sm" icon={copied ? <Check size={16} /> : <Copy size={16} />} onClick={handle}>
      {copied ? "Copié" : label}
    </Button>
  );
}

interface SecretValueProps {
  value: string;
  label: string;
  mono?: boolean;
  multiline?: boolean;
}

export function SecretValue({ value, label, mono = true, multiline = false }: SecretValueProps) {
  const [visible, setVisible] = useState(false);
  const hasValue = value.trim().length > 0;
  return (
    <div className={`secret-value ${multiline ? "secret-value--multiline" : ""}`.trim()}>
      <div className="secret-value__content">
        {!hasValue ? (
          <span className="secret-value__empty">Non renseigné</span>
        ) : visible ? (
          <span className={mono ? "mono" : ""}>{value}</span>
        ) : (
          <span className="secret-value__mask" aria-hidden="true">
            {multiline ? "•".repeat(Math.min(28, Math.max(12, value.length))) : "•".repeat(Math.min(24, Math.max(10, value.length)))}
          </span>
        )}
      </div>
      {hasValue ? (
        <div className="secret-value__actions">
          <IconButton
            label={visible ? "Masquer" : `Afficher ${label.toLowerCase()}`}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </IconButton>
          <CopyButton value={value} label={`Copier ${label.toLowerCase()}`} />
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Force du mot de passe                                              */
/* ------------------------------------------------------------------ */

export function StrengthMeter({ password, showAdvice = true }: { password: string; showAdvice?: boolean }) {
  const strength = estimateStrength(password);
  return (
    <div className="strength">
      <div className="strength__bars" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => (
          <span
            key={index}
            className={`strength__bar ${index <= strength.score && password ? `is-on strength__bar--${strength.score}` : ""}`.trim()}
          />
        ))}
      </div>
      <div className="strength__label">
        <span className={`strength__text strength__text--${strength.score}`}>
          {password ? strength.label : "—"}
        </span>
        {password ? <span className="strength__bits">{strength.entropyBits} bits</span> : null}
      </div>
      {showAdvice && password && strength.advice.length > 0 ? (
        <ul className="strength__advice">
          {strength.advice.map((advice) => (
            <li key={advice}>{advice}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Divers                                                             */
/* ------------------------------------------------------------------ */

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "danger" | "gold" }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          className={`segmented__item ${value === option.value ? "is-active" : ""}`.trim()}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Toaster() {
  const messages = useToastFeed();
  const ref = useRef<HTMLDivElement>(null);
  if (messages.length === 0) return null;
  return createPortal(
    <div className="toaster" ref={ref} aria-live="polite">
      {messages.map((message) => (
        <div key={message.id} className={`toast toast--${message.kind}`}>
          {message.kind === "success" ? <Check size={16} /> : null}
          {message.kind === "error" ? <X size={16} /> : null}
          <span>{message.message}</span>
        </div>
      ))}
    </div>,
    document.body,
  );
}
