import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";

const MASTER = "Phrase-de-passe-tres-solide-42";

async function createVault(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  await screen.findByRole("heading", { name: /créez votre mot de passe maître/i });

  await user.type(screen.getByLabelText(/^mot de passe maître$/i), MASTER);
  await user.type(screen.getByLabelText(/^confirmation$/i), MASTER);
  await user.click(screen.getByRole("checkbox"));
  await user.click(screen.getByRole("button", { name: /créer mon coffre/i }));

  await screen.findByText(/votre coffre est vide/i, undefined, { timeout: 15_000 });
}

describe("Coffre", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("affiche l'écran de création au premier lancement", async () => {
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: /créez votre mot de passe maître/i }),
    ).toBeInTheDocument();
  });

  it("crée un coffre, ajoute un secret puis le retrouve après verrouillage", async () => {
    const user = userEvent.setup();
    await createVault(user);

    await user.click(screen.getAllByRole("button", { name: /ajouter un secret/i })[0]);

    await screen.findByRole("heading", { name: /nouvel élément/i });
    await user.type(screen.getByLabelText(/^titre$/i), "Gmail");
    await user.type(screen.getByLabelText(/^identifiant$/i), "moi@exemple.com");
    await user.type(screen.getByLabelText(/^mot de passe$/i), "Str0ng!Passphrase#42");
    await user.click(screen.getByRole("button", { name: /ajouter au coffre/i }));

    await waitFor(() => expect(screen.getAllByText("Gmail").length).toBeGreaterThan(0));

    // Le coffre est bien persisté sous forme chiffrée
    const stored = localStorage.getItem("coffre.envelope");
    expect(stored).toBeTruthy();
    expect(stored).not.toContain("Str0ng!Passphrase#42");
    expect(stored).not.toContain("Gmail");

    // Verrouillage manuel
    await user.click(screen.getByRole("button", { name: /^verrouiller$/i }));
    await screen.findByRole("heading", { name: /coffre verrouillé/i });

    // Mauvais mot de passe
    await user.type(screen.getByLabelText(/mot de passe maître/i), "mauvais-mot-de-passe");
    await user.click(screen.getByRole("button", { name: /déverrouiller/i }));
    await screen.findByText(/mot de passe maître incorrect/i, undefined, { timeout: 15_000 });

    // Bon mot de passe : les données reviennent
    const input = screen.getByLabelText(/mot de passe maître/i);
    await user.clear(input);
    await user.type(input, MASTER);
    await user.click(screen.getByRole("button", { name: /déverrouiller/i }));
    await screen.findByText("Gmail", undefined, { timeout: 15_000 });
  });

  it("génère un mot de passe et l'ajoute au presse-papiers", async () => {
    const user = userEvent.setup();
    await createVault(user);

    await user.click(screen.getByRole("button", { name: /^générateur$/i }));
    await waitFor(() => {
      const code = document.querySelector(".generator-output code");
      expect(code?.textContent ?? "").toHaveLength(20);
      expect(code?.textContent ?? "").toMatch(/[A-Z]/);
      expect(code?.textContent ?? "").toMatch(/\d/);
    });
  });
});
