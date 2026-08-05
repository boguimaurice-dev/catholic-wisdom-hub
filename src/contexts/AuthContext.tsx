import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    (async () => {
      let { data: { session } } = await supabase.auth.getSession();
      // Si le jeton local est expiré (appareil resté inactif), on tente un refresh
      // silencieux avant de considérer l'utilisateur comme déconnecté.
      if (!session) {
        const { data } = await supabase.auth.refreshSession();
        session = data.session ?? null;
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    })();

    // Revalide la session quand l'app revient au premier plan (PWA / onglet dormant)
    const onFocus = () => {
      if (document.visibilityState === "visible") {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) supabase.auth.refreshSession();
        });
      }
    };
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);


  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
