# Cognalys Intelligence — Démonstration de devis V2

Application statique HTML/CSS/JavaScript. Le chat, le formulaire dossiers, le catalogue et les devis utilisent le même service métier n8n. Aucun email, facture ou validation simulée.

## Utilisation

1. Ouvrir **Tarifs**, créer ses propres désignations (libellé, description, unité, prix HT, TVA, activation). Aucun prix prédéfini.
2. Raconter une demande dans **Assistant**, ou l’enregistrer dans **Dossiers**. Nom identifiable et prestation suffisent pour une demande incomplète.
3. Compléter le dossier plus tard. Le chat recherche le dossier avant une correction ; le formulaire transmet sa révision pour éviter les écrasements obsolètes.
4. Créer un devis en sélectionnant dossier, désignations et quantités. Le serveur calcule les montants en centimes, produit le PDF via Gotenberg, écrit le fichier puis conserve l’instantané avant de confirmer la réussite.
5. **Devis PDF** affiche les versions courantes ; cocher l’historique pour les anciennes. **Corriger** crée une nouvelle version, avec un nouveau jeton et fichier. Les lignes existantes conservent leurs prix ; les nouvelles lignes prennent les tarifs actifs du catalogue.
6. « Montre-moi le devis d’Emma » utilise la recherche, sans génération. Un numéro avec suffixe `-V1` permet de demander cette version exacte. Le chat ouvre ou télécharge uniquement le document confirmé par son outil serveur.

## Espace privé, conversations et données personnelles

La connexion utilise Firebase Authentication, projet `cognalys-intelligence-devis`, avec e-mail et mot de passe. Aucun Analytics n’est initialisé. Les comptes peuvent s’inscrire mais restent en attente tant qu’un administrateur n’a pas ajouté une appartenance active dans `cognalys_memberships`. Le mot de passe n’est envoyé qu’à Firebase ; n8n reçoit un jeton Firebase, jamais le mot de passe.

Chaque point d’entrée (API, chat, PDF et audio) appelle `COGNALYS V2 - Accès Firebase`. Google vérifie le jeton via accounts:lookup ; le workflow contrôle aussi le projet, le sujet, les dates, la désactivation et la révocation, puis recherche l’UID dans la table d’appartenance. L’espace métier vient uniquement de cette table côté serveur. Une clé privée de démonstration, un scope ou un UID transmis par le navigateur ne donnent aucun accès.

Table `cognalys_memberships` (`rGN4lPFNidKYXSDq`) : `uid`, `email`, `scope` (64 caractères hexadécimaux), `company`, `active`. Pour activer un compte, vérifier son UID dans Firebase, choisir un scope aléatoire inédit pour une nouvelle entreprise puis insérer une unique ligne active. Pour plusieurs membres de la même entreprise, réutiliser son scope. Pour suspendre, mettre active à false : le prochain appel est refusé. Des lignes multiples pour le même UID sont refusées. L’activation reste administrative dans n8n, sans interface publique d’administration et sans facturation automatique.

Les anciens espaces et PDF sont conservés. Leur clé locale n’est plus acceptée pour se connecter. Un administrateur peut associer leur empreinte SHA-256 au compte du propriétaire après vérification de possession, sans déplacer ni réécrire les devis. Aucun rattachement automatique au premier compte inscrit.

Le `sessionId` est un UUID de conversation conservé en `sessionStorage` (avec repli historique si le stockage est refusé). **Nouvelle conversation** génère un autre UUID sans changer l’espace. La mémoire du modèle est limitée à cinq interactions et indexée par empreinte d’espace + conversation. Les données métier sont relues depuis la table. L’historique visuel du chat n’est pas restauré au rechargement.

Quatre identifiants distincts :

- conversation : `sessionId`, UUID, contrôlé par le serveur ; un `DOS-…` est refusé ;
- demande durable : `dossierId`, `DOS-` suivi d’un UUID ;
- devis : `DEV-AAAAMMJJ-…`, stable, avec numéro de version `-Vn` ;
- PDF : jeton UUID propre à chaque version ; le jeton seul ne suffit pas sur le webhook V2.

## API et stockage n8n

Base : `https://n8n.cognalys-intelligence.fr/webhook/cognalys/v2/`.

| POST | Entrée | Sortie |
| --- | --- | --- |
| `api` | `idToken`, `sessionId`, `command`, `params`, `requestId` facultatif | `ok:true` et données confirmées, ou `ok:false,error` pour les refus métier |
| `chat` | `idToken`, `sessionId`, `chatInput` | `output`, document confirmé éventuel |
| `pdf` | `idToken`, `sessionId`, `params:{token}` | fichier PDF existant ; 404 pour un jeton absent de cet espace |

Commandes : `catalog.list/save/delete`, `dossier.list/search/save`, `quote.list/find/create/revise`. `requestId` permet la répétition séquentielle d’une même mutation sans duplication ; sa réutilisation avec un contenu différent est refusée. En cas de délai dépassé, le résultat est incertain : relire les données avant de réessayer. Aucun succès n’est affiché avant confirmation du serveur.

Table `cognalys_demo_v2_events` (`8aCc7MSHqBrdBtGH`) : `scope`, `kind`, `entity`, `requestId`, `payload`. Les événements sont ajoutés sans modifier les instantanés précédents. Les dossiers et désignations sont reconstruits à partir de leur dernière révision. Les devis conservent client, lignes, libellés, unité, quantité, prix, TVA, totaux, parent et version. La version courante est une feuille de la chaîne ; plusieurs feuilles sont affichées en conflit et ne peuvent pas être révisées silencieusement.

Les anciennes tables `devis_demo` et `devis_pdf_demo` sont préservées. Elles ne sont pas automatiquement importées dans les espaces V2, faute d’une attribution fiable à un propriétaire. Les anciennes routes sont désactivées après séparation de la transcription. L’application ne dépend plus des workflows V1. Les anciennes données et les définitions des workflows sont conservées ; les anciens liens PDF V1 ne sont plus servis tant que leur workflow reste hors ligne.

Workflows publiés dans le projet personnel n8n existant :

- `DkVsfDUoyZIjCDyh` — COGNALYS V2 - API métier privée ;
- `fG204l6OTpk0Lste` — COGNALYS V2 - Assistant devis privé ;
- `HpwGF5OGfm4j6oCJ` — COGNALYS V2 - Consultation PDF privée ;
- `u3VnqXbcfWf0Ea2d` — COGNALYS V2 - Accès Firebase ;
- `uytilDGsbu5B8aYS` — COGNALYS V2 - Transcription audio : microphone indépendant de la V1, même OpenRouter Whisper.

Les sept workflows V1 sont hors ligne : principal, enregistrement, recherche, génération PDF, liste PDF, consultation PDF et décision email. Ils sont conservés pour permettre une réactivation manuelle.

Les exports dans `n8n/` décrivent la configuration déployée. Le workflow audio reprend le parcours V1 : fichier binaire, Base64, OpenRouter `openai/whisper-1`, texte confirmé. Aucun credential OpenRouter n’est exposé au navigateur. `service.cjs` contient les règles testables ; `render.cjs` le modèle PDF. L’instance conserve son moteur Gotenberg et le répertoire `/files/devis/`. Le modèle OpenRouter reste `openai/gpt-oss-20b`, avec température 0,1 et maximum 3 000 tokens de sortie. Les données métier utiles et les cinq interactions sont envoyées au modèle ; ce plafond ne constitue pas un budget mensuel garanti.

## Vérifications et limites

`node --test tests/service.test.cjs` vérifie les identifiants, les mises à jour partielles, les révisions obsolètes, les nombres, l’isolation et la répétition des requêtes. Les tests réels ont vérifié deux clients, catalogue créé puis modifié, dossier incomplet complété, devis chiffré, versions V1/V2/V3, recherche exacte par chat, nouvelle conversation, absence d’accès dans un autre espace et vrais fichiers PDF distincts.

L’aperçu utilise PDF.js 6.5.438, livré localement dans `assets/vendor/` avec sa licence Apache 2.0 ; le SDK officiel Firebase Authentication est chargé depuis gstatic ; aucun SDK Analytics n’est chargé. Le téléchargement utilise le même fichier PDF que l’aperçu. La transcription utilise désormais POST `cognalys/v2/audio` (multipart `audio`, `sessionId` et `idToken`). Elle renvoie `ok:true`, `sessionId` et `transcription` ; les erreurs sont explicites. WebM et M4A ont été vérifiés avec des fichiers de parole réels. La sélection du format du microphone suit les capacités du navigateur. Une capture physique dépend toujours de son autorisation.

Limites assumées : usage de démonstration séquentiel. Les tables n8n ne fournissent pas de transaction métier ni de verrou distribué ; des écritures strictement simultanées dans plusieurs onglets peuvent créer des conflits, malgré les révisions et l’idempotence séquentielle. La table est relue par espace et n’est pas dimensionnée pour un gros historique. Les PDF sont des brouillons : identité légale du prestataire et conditions restent à renseigner. Le catalogue utilise un taux numérique de TVA, sans gestion fiscale avancée. Les quantités et unités sont choisies explicitement, sans déduction automatique des passages depuis la fréquence.

## Publication

Seul `SabreDoree/app.cognalys-intelligence` est concerné. GitHub Pages sert `https://sabredoree.github.io/app.cognalys-intelligence/`. Le domaine demandé `app.cognalys-intelligence.fr` ne se résolvait pas en DNS lors de la reprise du 11 novembre 2026 ; sa remise en service exige une configuration DNS/hébergement hors de ce dépôt. Le dépôt vitrine `SabreDoree/cognalys-intelligence` n’est pas modifié.


## Tests audio

`node --test tests/audio.test.cjs` vérifie capture et arrêt des pistes, formats WebM/M4A, appel du webhook V2, transmission au chat, refus des sessions incohérentes, erreur serveur, relance sans duplication du texte et réponse tardive après changement de conversation. Ces tests simulent les API matérielles ; les tests HTTP utilisent des fichiers audio réels. Aucun quota OpenRouter ou mécanisme d’abonnement n’a été ajouté dans cette modification.

