## Plan d'évolution complet

### 1. Authentification & rôles (admin / technicien)

**Base de données** (migration unique) :
- Table `profiles` (id ↔ `auth.users`, email, full_name)
- Enum `app_role` (`admin`, `technicien`)
- Table `user_roles` (user_id, role) + fonction `has_role()` SECURITY DEFINER
- Trigger `handle_new_user` : crée le profil ET attribue automatiquement le rôle :
  - `admin` si c'est le tout premier compte (table vide) — bootstrap pratique
  - `technicien` pour tous les suivants (l'admin pourra promouvoir ensuite)
- RLS resserrée :
  - `ovens`, `operations`, `reservations` : lecture pour tous les utilisateurs connectés
  - `ovens` : INSERT/UPDATE/DELETE réservé aux admins
  - `operations`, `reservations` : INSERT/UPDATE/DELETE pour tous les connectés
  - `profiles`/`user_roles` : lecture pour soi, gestion par admin

**Frontend** :
- Page `/auth` : login + signup (email/password + Google via broker Lovable)
- Layout `_authenticated` (intégration Supabase managée) protège tout sauf `/auth`
- Hook `useUserRole()` qui retourne `'admin' | 'technicien'`
- Page `/admin` : redirige si pas admin
- Nouvelle page `/admin/users` (admin uniquement) : liste des comptes, bouton pour passer technicien ↔ admin
- Header : badge du rôle + nom + bouton déconnexion ; lien "Étuves" masqué pour technicien
- Le champ "Demandeur" est pré-rempli avec le nom de l'utilisateur connecté

### 2. Traduction « four » → « étuve » (féminin)

Remplacements UI avec accords corrects, dans toutes les pages :
- "Four" → "Étuve", "Fours" → "Étuves"
- "le four" → "l'étuve", "un four" → "une étuve", "ce four" → "cette étuve"
- "Libérer le four" → "Libérer l'étuve", "Numéro interne du four" etc.
- Titres de pages / nav / dialogs / toasts / messages d'erreur
- Le schéma BDD (`ovens`, `oven_id`) **reste inchangé** pour ne rien casser. Seuls les libellés UI changent.

### 3. Formulaire d'opération : champs obligatoires

Validation Zod stricte dans `StartOperationDialog` :
- Tous les champs deviennent requis : Demandeur, Réalisateur, Projet, CDC, Essai, Spécification, Date début, Heure début, Température
- Au moins 1 câble (avec Type, Section, Couleur tous requis)
- Date/heure de fin : remplies automatiquement (pas saisies manuellement)
- Messages d'erreur clairs sous chaque champ

### 4. Température + durée en heures avec calcul auto

**BDD** : ajouter à `operations` :
- `temperature` (numeric, °C) — requis pour nouvelles opérations
- `duree_heures` (numeric) — durée du traitement

**UI** :
- Nouveau champ "Température (°C)"
- Nouveau champ "Durée (heures)" (accepte décimaux : 1.5h = 1h30)
- Saisie : Date début + Heure début + Durée → Date fin + Heure fin calculées et affichées en lecture seule
- Même logique pour la page Planification (réservations)

### 5. Multi-câbles dans une seule étuve

**BDD** : nouvelle table `operation_cables` :
- id, operation_id (FK), type, section, couleur, position
- RLS : même règles que `operations`
- Les colonnes `type`, `section`, `couleur` restent sur `operations` (nullables) pour l'historique existant ; non utilisées pour les nouvelles opérations

**UI dans `StartOperationDialog`** :
- Section "Caractéristiques câbles" avec liste dynamique
- Au moins 1 câble (bloc avec Type / Section / Couleur)
- Bouton ➕ "Ajouter un câble" → ajoute un nouveau bloc
- Bouton 🗑️ par câble (sauf si c'est le dernier)
- À la validation : insert dans `operations` puis insert batch dans `operation_cables`

**Affichage** :
- `OvenDetailsDialog` : liste tous les câbles d'une opération en cours
- `historique.tsx` : ajout d'une colonne "Câbles" (résumé : "3 câbles" + tooltip détaillé, ou expansion)

### 6. Mise à jour de la mémoire projet

Mettre à jour `mem://index.md` : l'app n'est plus open-access, il y a maintenant 2 rôles (admin/technicien) avec RLS appropriée.

---

### Détails techniques

- **Migration unique** dans l'ordre : profiles → enum → user_roles → has_role → trigger handle_new_user → ALTER operations (temperature, duree_heures) → CREATE operation_cables → GRANTs → RLS policies (drop puis recreate avec rôles).
- **Bootstrap admin** : le trigger vérifie `(SELECT COUNT(*) FROM user_roles WHERE role='admin') = 0` pour assigner admin au premier compte.
- **OAuth Google** : activé via `supabase--configure_social_auth` + bouton dans `/auth` utilisant `lovable.auth.signInWithOAuth("google", ...)`.
- **Pages publiques** : aucune. Toutes les pages (sauf `/auth`) sont sous `_authenticated`.
- **Realtime** : conservé tel quel (déjà actif sur `ovens` et `operations`).

---

### Ordre d'exécution

1. Migration BDD (validation par toi)
2. Configuration Google OAuth
3. Fichiers auth : `/auth`, `_authenticated/route.tsx`, hook `useUserRole`
4. Mise à jour `__root.tsx` (nav avec rôle + déconnexion)
5. Refonte `StartOperationDialog` (champs requis + température + durée auto + multi-câbles)
6. Mise à jour `OvenDetailsDialog` (affichage câbles)
7. Mise à jour `planification.tsx` (durée auto)
8. Page `/admin/users`
9. Traduction four → étuve dans toute l'UI
10. Mise à jour mémoire

Confirme et je lance la migration.