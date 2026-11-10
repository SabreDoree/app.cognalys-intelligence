# Cognalys Intelligence — Application de démonstration

Application HTML, CSS et JavaScript publiée par GitHub Pages. Le formulaire rapide et la conversation audio ou texte permettent de préparer un devis. La vérification du formulaire précède la génération du PDF. Le montant HT par intervention est facultatif et saisi manuellement. La surface et la fréquence ne déterminent aucun prix.

## Conversation et devis PDF

Le microphone envoie un formulaire multipart (`audio`, `sessionId`) au webhook de transcription. Le texte transcrit est ensuite transmis au Chat Trigger avec le même identifiant. La conversation, les champs et les métadonnées des devis restent en mémoire côté navigateur. Seul l’identifiant de conversation est enregistré dans `sessionStorage`. Après rechargement de l’onglet, la rubrique **Devis PDF** recharge les documents côté n8n. **Créer un autre devis** conserve la conversation. **Nouvelle conversation**, dans le chat, démarre une session distincte.

Les quatre routes de production utilisent la base `https://n8n.cognalys-intelligence.fr/webhook/cognalys/devis/`.

| Méthode et route | Entrée | Réponse utilisée |
| --- | --- | --- |
| POST `generer` | JSON avec `sessionId`, `dossierId` facultatif, `formulaire`, `montant_ht`, `mode_tva`, `taux_tva` | `status: pdf_genere`, numéro, session correspondante, jeton et URL de consultation |
| GET `lister?sessionId=…` | Identifiant de la conversation | Objet `devis` contenant la liste, les clients, prestations, dates, statuts et décisions |
| GET `voir?token=…` | Jeton du devis | Fichier `application/pdf` pour le lecteur intégré, l’ouverture dans un onglet ou le téléchargement |
| POST `decision` | JSON avec `sessionId`, `token` et `decision` (`autorise` ou `refuse`) | `success: true`, jeton et `decision_brouillon_mail` correspondant à la demande |

Le workflow de formulaire exploite `name`, `service`, `area`, `frequency`, `street`, `city` et `notes`. Les champs de tarification inconnus sont transmis sous forme de chaînes vides. Les régimes acceptés sont `a_preciser`, `franchise` et `taux` (pourcentage obligatoire pour ce dernier).

L’interface accepte uniquement les liens de consultation HTTPS du webhook prévu, vérifie le type et la signature du PDF, et refuse les redirections pour ces requêtes. Un navigateur sans lecteur intégré peut ouvrir le fichier dans un nouvel onglet ou le télécharger. Après un échec de génération, la liste est relue avant toute nouvelle tentative manuelle.

## Configuration côté n8n

Publier les quatre workflows, avec les méthodes ci-dessus et CORS pour l’origine de l’application, y compris le précontrôle des POST JSON. Le générateur doit disposer de son moteur PDF, de son stockage et de la table de métadonnées. Pour créer un PDF depuis le chat, relier le générateur comme Tool de l’AI Agent et lui transmettre le même `sessionId`. Après la réponse du chat, le site relit uniquement la liste. Un texte de l’assistant ne constitue pas une confirmation de création.

La validation et l’envoi historiques restent des simulations locales. Les actions de décision enregistrent uniquement une autorisation pour une future fonctionnalité. Aucun appel Gmail, aucune création de brouillon email, aucun envoi. Cette démonstration est sans comptes. Le `sessionId` regroupe les devis et le jeton permet leur consultation. Un déploiement commercial multi-clients exige une authentification et des contrôles d’accès côté serveur.
