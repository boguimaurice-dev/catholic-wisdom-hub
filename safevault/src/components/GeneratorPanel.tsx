import { useEffect, useState } from "react";
import { useVault } from "../context/VaultContext";
import { copyText } from "../lib/clipboard";
import {
  DEFAULT_PASSWORD_OPTIONS,
  generatePassphrase,
  generatePassword,
  passphraseWordsCount,
  type PasswordOptions,
} from "../lib/crypto";
import { toast } from "../lib/toast";
import { Check, Copy, Dice, Info, Refresh } from "./icons";
import { Button, Field, Segmented, StrengthMeter, Switch } from "./ui";

type Mode = "password" | "passphrase";

export function GeneratorPanel() {
  const { settings } = useVault();
  const [mode, setMode] = useState<Mode>("password");
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS);
  const [words, setWords] = useState(5);
  const [separator, setSeparator] = useState("-");
  const [value, setValue] = useState("");
  const [copied, setCopied] = useState(false);

  const regenerate = () => {
    setValue(
      mode === "password"
        ? generatePassword(options)
        : generatePassphrase(words, separator === "espace" ? " " : separator),
    );
    setCopied(false);
  };

  useEffect(() => {
    setValue(
      mode === "password"
        ? generatePassword(options)
        : generatePassphrase(words, separator === "espace" ? " " : separator),
    );
    setCopied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, options, words, separator]);

  const toggle = (key: keyof PasswordOptions) => {
    setOptions((current) => ({ ...current, [key]: !current[key] }));
  };

  const copy = async () => {
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
      toast("Copie impossible sur ce navigateur.", "error");
    }
  };

  const entropyPerWord = Math.log2(passphraseWordsCount());

  return (
    <div className="panel">
      <header className="panel__head">
        <div>
          <span className="eyebrow">Générateur</span>
          <h2>Créez un secret solide</h2>
          <p className="muted">
            Généré localement avec le générateur cryptographique de votre appareil.
          </p>
        </div>
      </header>

      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: "password", label: "Mot de passe" },
          { value: "passphrase", label: "Phrase de passe" },
        ]}
      />

      <div className="generator-output">
        <code>{value}</code>
        <div className="generator-output__actions">
          <button type="button" className="icon-btn" onClick={regenerate} aria-label="Régénérer">
            <Refresh size={18} />
          </button>
          <Button
            variant={copied ? "soft" : "primary"}
            size="sm"
            icon={copied ? <Check size={16} /> : <Copy size={16} />}
            onClick={copy}
          >
            {copied ? "Copié" : "Copier"}
          </Button>
        </div>
      </div>

      {mode === "password" ? (
        <>
          <StrengthMeter password={value} showAdvice={false} />

          <div className="generator-options">
            <Field
              label={`Longueur — ${options.length} caractères`}
              hint={options.length >= 16 ? "Excellent pour les comptes sensibles." : "16 caractères ou plus recommandé."}
            >
              <input
                type="range"
                min={8}
                max={64}
                value={options.length}
                onChange={(event) =>
                  setOptions((current) => ({ ...current, length: Number(event.target.value) }))
                }
                className="range"
                aria-label="Longueur du mot de passe"
              />
            </Field>

            <div className="switch-grid">
              <Switch
                checked={options.lowercase}
                onChange={() => toggle("lowercase")}
                label="Minuscules"
              />
              <Switch
                checked={options.uppercase}
                onChange={() => toggle("uppercase")}
                label="Majuscules"
              />
              <Switch checked={options.digits} onChange={() => toggle("digits")} label="Chiffres" />
              <Switch
                checked={options.symbols}
                onChange={() => toggle("symbols")}
                label="Symboles"
              />
              <Switch
                checked={options.avoidAmbiguous}
                onChange={() => toggle("avoidAmbiguous")}
                label="Éviter les caractères ambigus"
                description="Sans I, l, 1, O, 0…"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="generator-options">
            <Field
              label={`Nombre de mots — ${words}`}
              hint={`≈ ${Math.round(words * entropyPerWord)} bits d'entropie (${passphraseWordsCount()} mots disponibles).`}
            >
              <input
                type="range"
                min={3}
                max={10}
                value={words}
                onChange={(event) => setWords(Number(event.target.value))}
                className="range"
                aria-label="Nombre de mots"
              />
            </Field>
            <Field label="Séparateur">
              <Segmented
                value={separator}
                onChange={setSeparator}
                options={[
                  { value: "-", label: "Tiret" },
                  { value: ".", label: "Point" },
                  { value: "_", label: "Tiret bas" },
                  { value: "espace", label: "Espace" },
                ]}
              />
            </Field>
          </div>
        </>
      )}

      <div className="callout callout--info">
        <Info size={16} />
        <div>
          Une phrase de passe de 5 mots est plus facile à mémoriser et souvent plus solide qu'un mot de
          passe court avec symboles. Utilisez un secret différent par service.
        </div>
      </div>

      <Button variant="soft" icon={<Dice size={16} />} onClick={regenerate} full>
        Générer un autre secret
      </Button>
    </div>
  );
}
