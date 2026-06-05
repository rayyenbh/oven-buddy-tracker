import { createFileRoute } from "@tanstack/react-router";

// La page de login est gérée directement dans AppShell (__root.tsx)
// Ce fichier existe uniquement pour que TanStack Router reconnaisse la route /login
export const Route = createFileRoute("/login")({
  component: () => null,
  head: () => ({ meta: [{ title: "Connexion — ThermoTrack" }] }),
});
