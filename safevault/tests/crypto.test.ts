import { describe, expect, it } from "vitest";
import {
  createKdf,
  decryptJson,
  deriveAesKey,
  encryptBytes,
  decryptBytes,
  encryptJson,
  estimateStrength,
  exportRawKey,
  generatePassphrase,
  generatePassword,
  importRawKey,
  PIN_KDF_ITERATIONS,
  pinKdf,
  randomId,
  toBase64,
  fromBase64,
} from "../src/lib/crypto";

describe("chiffrement", () => {
  const payload = { items: [{ title: "Banque", secret: "s3cr3t-éàü" }], createdAt: 1 };

  it("chiffre et déchiffre un coffre", async () => {
    const kdf = createKdf();
    const key = await deriveAesKey("mot-de-passe-de-test", kdf);
    const blob = await encryptJson(key, payload);
    expect(JSON.stringify(blob)).not.toContain("Banque");
    await expect(decryptJson(key, blob)).resolves.toEqual(payload);
  });

  it("rejette un mauvais mot de passe", async () => {
    const kdf = createKdf();
    const key = await deriveAesKey("correct", kdf);
    const blob = await encryptJson(key, payload);
    const bad = await deriveAesKey("incorrect", kdf);
    await expect(decryptJson(bad, blob)).rejects.toBeTruthy();
  });

  it("déverrouille via la clé emballée par le code PIN", async () => {
    const kdf = createKdf();
    const key = await deriveAesKey("maitre", kdf);
    const blob = await encryptJson(key, payload);

    const pKdf = pinKdf();
    const pinKey = await deriveAesKey("738214", pKdf);
    const wrapped = await encryptBytes(pinKey, await exportRawKey(key));

    const unwrapKey = await deriveAesKey("738214", pKdf);
    const restored = await importRawKey(await decryptBytes(unwrapKey, wrapped));
    await expect(decryptJson(restored, blob)).resolves.toEqual(payload);
    expect(pKdf.iterations).toBe(PIN_KDF_ITERATIONS);
  });

  it("utilise un sel et un IV différents à chaque opération", async () => {
    const a = createKdf();
    const b = createKdf();
    expect(a.salt).not.toBe(b.salt);

    const key = await deriveAesKey("test", a);
    const one = await encryptJson(key, payload);
    const two = await encryptJson(key, payload);
    expect(one.iv).not.toBe(two.iv);
    expect(one.data).not.toBe(two.data);
  });

  it("encode correctement le base64 sur de grands volumes", () => {
    const bytes = new Uint8Array(120_000).map((_, index) => index % 251);
    const roundtrip = fromBase64(toBase64(bytes));
    expect(roundtrip.length).toBe(bytes.length);
    expect(roundtrip[119_999]).toBe(bytes[119_999]);
  });
});

describe("génération", () => {
  it("respecte la longueur et les jeux de caractères", () => {
    const password = generatePassword({
      length: 32,
      lowercase: false,
      uppercase: true,
      digits: true,
      symbols: false,
      avoidAmbiguous: false,
    });
    expect(password).toHaveLength(32);
    expect(password).toMatch(/^[A-Z2-9]+$/);
  });

  it("évite les caractères ambigus à la demande", () => {
    for (let i = 0; i < 20; i += 1) {
      const password = generatePassword({
        length: 40,
        lowercase: true,
        uppercase: true,
        digits: true,
        symbols: true,
        avoidAmbiguous: true,
      });
      expect(password).not.toMatch(/[Il1O0o|`']/);
    }
  });

  it("génère des identifiants uniques", () => {
    const ids = new Set(Array.from({ length: 200 }, () => randomId()));
    expect(ids.size).toBe(200);
  });

  it("produit une phrase de passe du bon nombre de mots", () => {
    const phrase = generatePassphrase(6);
    expect(phrase.split("-")).toHaveLength(6);
    expect(phrase.length).toBeGreaterThan(20);
  });
});

describe("évaluation de la force", () => {
  it("classe les mots de passe courants comme très faibles", () => {
    expect(estimateStrength("password").score).toBe(0);
    expect(estimateStrength("123456").score).toBe(0);
    expect(estimateStrength("azerty").score).toBeLessThanOrEqual(1);
  });

  it("classe un mot de passe long et varié comme excellent", () => {
    const strength = estimateStrength("Tr0ub4dor&3-Phrase-Longue!");
    expect(strength.score).toBeGreaterThanOrEqual(3);
    expect(strength.entropyBits).toBeGreaterThan(60);
  });
});
