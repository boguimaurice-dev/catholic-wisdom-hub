import { BrandMark } from "./components/Brand";
import { AuthScreen } from "./components/AuthScreen";
import { Toaster } from "./components/ui";
import { VaultShell } from "./components/VaultShell";
import { VaultProvider, useVault } from "./context/VaultContext";

function Splash() {
  return (
    <div className="auth auth--center">
      <div className="auth__aurora" aria-hidden="true" />
      <div className="splash">
        <BrandMark size={52} />
        <span className="spinner" aria-label="Chargement" />
      </div>
    </div>
  );
}

function Gate() {
  const { status } = useVault();
  if (status === "loading") return <Splash />;
  if (status === "unlocked") return <VaultShell />;
  return <AuthScreen />;
}

export default function App() {
  return (
    <VaultProvider>
      <Gate />
      <Toaster />
    </VaultProvider>
  );
}
