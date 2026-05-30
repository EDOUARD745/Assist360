# Script de démo Assist360 - 3-5 minutes

> Avant de démarrer : ouvrir Chrome plein écran sur http://localhost:3000.
> Avoir l'onglet de secours sur TKT-2026-0001 (au cas où).
> Vérifier la connectivité internet (Groq = appel API).

---

## 0. Accroche (15 s)

> « Aujourd'hui, **43 % des réclamations** clients La Poste sont encore traitées par téléphone. Les conseillers jonglent entre 5 outils, doivent comprendre, traduire, prioriser, rédiger - sous pression. **Assist360**, c'est une plateforme qui prend tout ce travail invisible et le donne à l'IA, en gardant la décision finale au conseiller. »

---

## 1. Dashboard - la file d'attente intelligente (45 s)

**Action** : on est sur `/`

> « Voici l'écran de Marie, conseillère N2. Sa journée commence ici. »

Pointer les **KPIs** :
- 12 tickets ouverts, 6 urgents (en rouge)
- **Temps moyen de traitement : 4,2 min, contre 9,8 min avant**
- −57 % vs baseline, satisfaction client 4,6 / 5

> « L'IA a déjà fait le travail invisible : tout est trié par urgence, et chaque ticket porte sa carte d'identité. »

Pointer la liste :
- Drapeaux 🇫🇷 🇬🇧 🇪🇸 → multi-canal, multi-langue
- Badges urgence (haute / moyenne / basse) et type (réclamation, indemnisation, suivi colis…)
- Résumé en une ligne

> « Marie sait en une seconde où porter son attention. Ouvrons le plus urgent. »

**Action** : cliquer sur **TKT-2026-0001 - Sophie Bernard - Colis non livré**.

---

## 2. Vue ticket - analyse IA (50 s)

> « Sophie a perdu un colis avec un ordinateur portable à 1200 €. Elle est en colère. »

À gauche : le message brut. À droite : **l'Assistant IA**.

Pointer l'onglet **Analyse** :
- **Résumé** auto en 1 phrase
- Signaux : urgence haute · ton "en colère" · langue FR · type réclamation
- Citation explicative *« Le client a besoin de l'ordinateur pour son travail et le délai est dépassé »*
- **Infos extraites** : numéro de colis `6A24567891FR`, montant 1200€, date évènement
- **Infos manquantes** (en orange) : *preuve d'achat*
- **3 actions suggérées** par l'IA

> « Cette analyse, c'est 10 minutes de lecture et de relecture économisées. Et c'est juste le début. »

---

## 3. Génération de réponse (45 s)

**Action** : clic sur **« Suggérer une réponse »**.

Pendant les ~2 s d'attente :

> « Le modèle utilisé ici, c'est Llama 3.3 70B - modèle open-source de Meta, donc déployable sur infra souveraine, pas de dépendance OpenAI. »

La réponse apparaît dans la textarea : empathique, factuelle, proposition concrète d'enquête + indemnisation.

> « Réponse personnalisée, ton ajusté, proposition concrète. Marie la lit, peut la modifier d'un mot. La validation humaine reste au cœur du process. »

**Action** : cliquer **« Envoyer »** → confirmation verte « ✓ Réponse envoyée au client »

---

## 4. Chatbot interne (45 s)

**Action** : cliquer sur l'onglet **Chatbot interne**.

> « Mais l'IA ne sert pas qu'à répondre au client. Marie peut aussi l'interroger sur les procédures internes - sans changer d'outil. »

**Action** : taper *« Quel est le délai d'indemnisation pour un colis perdu ? »*

La réponse arrive : structurée, avec délai 48h + 15 jours, et **`[Source : 01_indemnisation_colis.md]`**.

> « L'IA cite sa source. Pas d'hallucination, pas d'à-peu-près. C'est sourcé sur la documentation interne de La Poste. »

---

## 5. Multilingue (35 s)

**Action** : retour file (clic sidebar) → ouvrir **TKT-2026-0002 - James Carter, en anglais**.

> « James écrit en anglais. Marie ne parle pas anglais couramment. Pas de problème. »

Pointer : **drapeau 🇬🇧**, l'analyse est déjà en français, et un toggle *« Voir la traduction française »* sous le message.

**Action** : clic **« Suggérer une réponse »** - la réponse est générée **automatiquement en anglais** (panneau indique « Votre réponse (en en) »).

> « L'IA détecte la langue, traduit pour Marie, et répond dans la langue du client. Zéro friction. »

---

## 6. Conclusion (30 s)

> « Ce qu'on a vu, c'est un conseiller qui passe de 9,8 min à 4,2 min par ticket - **−57 %** - sans perdre en qualité, sans déléguer la décision. »

Bénéfices à dire :
1. **Productivité** : ×2 sur le volume traité
2. **QVT** : réduction de la charge cognitive (résumés, priorisation, recherche)
3. **Expérience client** : réponses plus rapides, multilingues, cohérentes
4. **Souveraineté** : modèle open-source Llama 3.3, déployable sur infra La Poste

> « Assist360, c'est l'IA au service du conseiller - pas à sa place. Merci. »

---

## Cas de démo de secours (si question)

| Ticket | Cas illustré |
|---|---|
| TKT-2026-0001 | Réclamation urgente, ton colère, infos extraites |
| TKT-2026-0002 | Anglais, traduction auto |
| TKT-2026-0003 | Formulaire incomplet, infos manquantes détectées |
| TKT-2026-0004 | Appel téléphonique transcrit |
| TKT-2026-0006 | Espagnol + sujet sensible (médicaments) |
| TKT-2026-0009 | Client multi-relance, ton agressif |
| TKT-2026-0011 | Cas juridique (recommandé contesté) |
| TKT-2026-0012 | Blocage douane international |

## Si question "et l'hallucination ?"

> « Le chatbot interne s'appuie strictement sur une base documentaire injectée - il ne répond JAMAIS hors de cette base. Il indique la source. Pour la génération de réponse client, le conseiller relit et valide systématiquement. C'est le principe Human-in-the-Loop. »

## Si question "et la confidentialité ?"

> « Llama 3.3 est un modèle open-source. Dans une vraie mise en production La Poste, il serait hébergé sur des serveurs internes ou un cloud souverain européen - aucune donnée client ne sortirait de l'infrastructure La Poste. Pour la démo on utilise Groq car c'est rapide et gratuit. »
