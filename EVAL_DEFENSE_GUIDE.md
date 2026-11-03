# 42bet - Script Oral de Defense (version detaillee)

Ce document ne contient que des reponses orales et des defenses.
Objectif: quand un evaluateur dit "explique", n importe quel membre peut repondre en detail, avec une logique claire et complete.

## 1) Pitch oral commun (30 secondes)
Notre projet est une plateforme de prediction markets autour de l ecosysteme 42. Un utilisateur s authentifie, consulte des marches, prend des positions YES/NO, suit son portefeuille et ses performances, puis recoit des notifications temps reel. L architecture est full stack: Angular pour le frontend, Spring Boot pour l API metier, PostgreSQL pour les donnees relationnelles, et Docker pour un deploiement reproductible. Notre defense repose sur trois axes: securite, coherence metier, et fiabilite operationnelle.

## 2) Reponse orale detaillee par notion (base a memoriser)

### Notion A - Architecture full stack
Reponse orale detaillee:
On a separe le systeme en trois couches explicites. La couche presentation est geree par Angular, qui porte la navigation, les formulaires, les vues dashboard et l experience utilisateur. La couche metier est dans Spring Boot: elle applique les regles de permissions, les regles de trading, la validation des donnees, et le controle de securite. La couche persistance est PostgreSQL, avec un schema relationnel qui represente proprement les utilisateurs, les marches, les ordres, les positions et les historiques. Cette separation permet une maintenabilite forte: on peut faire evoluer l interface sans casser le coeur metier, et faire evoluer le metier sans recompiler la logique UI.

Defense si challenge evaluateur:
Si on me demande pourquoi ce decouplage est important, je reponds que c est la base d un systeme stable: isolation des responsabilites, meilleure testabilite, audit de securite simplifie, et capacite a scaler chaque couche selon sa charge.

### Notion B - Deploiement et reproductibilite
Reponse orale detaillee:
On a dockerise l ensemble pour figer l environnement d execution. Le frontend, le backend et la base tournent dans des conteneurs coordonnes, ce qui garantit qu un meme build se comporte de la meme maniere sur une machine de dev ou en soutenance. Cette reproductibilite est essentielle en evaluation parce qu elle limite le risque "ca marche sur mon poste".

Defense si challenge evaluateur:
Si on me demande la valeur technique de Docker ici, je reponds que c est un contrat d execution: versions, dependances, reseau inter-services et demarrage sont standardises, donc l equipe prouve la robustesse operationnelle, pas seulement le code.

### Notion C - Securite auth classique (email/password)
Reponse orale detaillee:
Le flux est: inscription, stockage securise du mot de passe, authentification, puis gestion de session/token. Le mot de passe n est jamais stocke en clair: il est transforme via un algorithme de hachage adapte aux mots de passe (BCrypt), avec verification a la connexion. Cote backend, la validation est obligatoire et centralisee pour empecher qu un client malicieux contourne les controles frontend. Cote frontend, on guide l utilisateur avec validation de formulaire, mais l autorite finale reste l API.

Defense si challenge evaluateur:
Si on me dit "la validation frontend suffit", je reponds non: le frontend est modifiable par l utilisateur, donc seule la validation backend est une vraie barriere de securite.

### Notion D - OAuth2 (auth federée)
Reponse orale detaillee:
OAuth2 sert a deleguer l authentification a un fournisseur de confiance, ici 42 et GitHub. Le principe est que l utilisateur prouve son identite chez le fournisseur, puis notre application recoit une preuve d authentification et mappe cette identite a un compte local. Ce choix reduit la friction de connexion, augmente l adoption, et permet une experience moderne sans gerer nous-memes tous les secrets utilisateurs.

Defense si challenge evaluateur:
Si on me demande le benefice reel, je reponds triple benefice: UX plus rapide, reduction des abandons a l inscription, et securite appuyee sur des fournisseurs matures.

### Notion E - Permissions avancees (RBAC)
Reponse orale detaillee:
On applique un controle d acces base sur les roles: USER et ADMIN n ont pas les memes capacites. La defense est faite sur deux niveaux. Niveau 1, frontend: les routes et boutons admin ne sont pas proposes a un utilisateur standard pour eviter les erreurs d usage. Niveau 2, backend: meme si quelqu un forge une requete manuellement, l API refuse si le role est insuffisant. Cette double barriere est obligatoire dans un vrai systeme.

Defense si challenge evaluateur:
Si on me dit "vous cachez juste des boutons", je reponds que cacher un bouton n est jamais une securite. La vraie securite est la verification serveur du role avant execution de l action.

### Notion F - Base de donnees relationnelle et ORM
Reponse orale detaillee:
Le domaine metier est relationnel par nature: un utilisateur possede des ordres, un ordre cible un marche, un marche genere des resultats et impacte le portefeuille. On a donc choisi PostgreSQL pour la fiabilite transactionnelle, puis JPA/Hibernate pour mapper proprement les objets metier vers les tables SQL. L ORM nous fait gagner en lisibilite, limite le SQL repetitif, et conserve une structure coherente des relations.

Defense si challenge evaluateur:
Si on me demande pourquoi pas du NoSQL, je reponds que notre probleme est fortement relationnel et transactionnel. Le besoin principal est la coherence, pas seulement la flexibilite de schema.

### Notion G - Temps reel avec SSE
Reponse orale detaillee:
Notre besoin est principalement unidirectionnel: le serveur doit pousser des notifications vers le client quand des evenements metier se produisent. SSE est adapte a ce besoin car il etablit un flux simple serveur vers navigateur, avec une complexite inferieure a WebSocket pour ce cas. On l utilise pour notifier en temps reel des changements pertinents (etat de marche, evenements utilisateur), ce qui renforce la perception de systeme vivant.

Defense si challenge evaluateur:
Si on me demande "pourquoi pas WebSocket", je reponds que WebSocket est excellent pour bidirectionnel intense, mais pour du push serveur simple SSE est plus lisible, plus rapide a maintenir, et totalement conforme au besoin fonctionnel.

### Notion H - SSR Angular
Reponse orale detaillee:
Le SSR signifie que le premier rendu HTML est prepare cote serveur avant hydratation cote client. Le gain principal est un premier affichage plus propre et une meilleure robustesse de rendu initial, surtout quand le client a des conditions reseau variables. Dans notre contexte de soutenance, cela montre aussi la maitrise d une architecture frontend plus avancee qu un simple SPA classique.

Defense si challenge evaluateur:
Si on me dit "votre app pouvait etre en SPA", je reponds oui, mais SSR ajoute de la maturite sur la livraison de la premiere vue et la perception de performance.

### Notion I - i18n (FR/EN/RU)
Reponse orale detaillee:
La traduction est geree par cles de texte et fichiers de langue. On ne code pas du texte en dur dans chaque composant, on reference des cles qui pointent vers les ressources FR/EN/RU. Ce choix rend le produit evolutif: ajouter une langue devient une tache de contenu, pas une refonte de composants.

Defense si challenge evaluateur:
Si on me demande l interet reel, je reponds que l i18n n est pas cosmetique: elle impacte accessibilite, adoption utilisateur et qualite produit a long terme.

### Notion J - Dashboard utilisateur et analytics avance
Reponse orale detaillee:
On distingue deux niveaux. Niveau 1: dashboard utilisateur, focalise sur l activite personnelle (historique, etat des positions, tendance de performance). Niveau 2: analytics avancees, avec visualisations et filtres pour analyser les resultats sous differents angles, plus export de donnees. Cette separation est importante parce qu elle repond a deux usages differents: suivi quotidien rapide et analyse decisionnelle plus profonde.

Defense si challenge evaluateur:
Si on me dit "ce ne sont que des graphes", je reponds que la valeur est dans la pipeline complete: collecte, aggregation, filtrage, interpretation, et export exploitable.

### Notion K - Design system reutilisable
Reponse orale detaillee:
On a factorise des composants UI reutilisables pour eviter la duplication et garder une coherence visuelle. Le design system diminue les regressions, accelere les nouvelles pages et facilite la maintenance. C est un choix d ingenierie, pas seulement de style: moins de divergence, moins de bugs UI, plus de vitesse de developpement.

Defense si challenge evaluateur:
Si on me demande la preuve de reutilisabilite, je reponds que les memes briques UI sont appelees dans plusieurs ecrans fonctionnels, avec des variations controlees.

### Notion L - Compatibilite navigateurs
Reponse orale detaillee:
On a valide les parcours critiques sur plusieurs moteurs navigateur pour reduire le risque de bug specifique a une implementation. Ce n est pas juste ouvrir la page: on rejoue des flux metier complets (auth, navigation, actions principales, affichage dynamique).

Defense si challenge evaluateur:
Si on me demande pourquoi c est important, je reponds qu un produit web doit etre fiable dans des environnements utilisateur heterogenes, pas seulement sur le poste de dev.

### Notion M - Modules of choice (moteur prediction + integration 42)
Reponse orale detaillee:
Le moteur de prediction base sur des signaux objectifs 42 est un choix fort car il cree une logique metier specifique et non triviale: generation de marche, suivi d etat, resolution, impact portefeuille, propagation analytics/notifications. L integration profil 42 donne le contexte communautaire et l identite utilisateur qui rendent le produit coherent avec sa cible.

Defense si challenge evaluateur:
Si on me demande pourquoi ces modules valent des points, je reponds qu ils sont full stack, metier, integraux au produit, et techniquement plus exigeants qu un simple ajout cosmetique.

## 3) Reponses orales modules (version eval directe)

### Module 1 - Framework frontend + backend (Major)
Reponse orale prete:
On a implemente un frontend Angular et un backend Spring Boot relies par API. Angular gere les vues et l interaction, Spring gere les regles metier et la securite. Cette combinaison offre separation des responsabilites, testabilite et evolution propre du produit.

Defense detaillee si on insiste:
Ce module n est pas juste un choix de techno. Il definit la colonne vertebrale du projet: frontend pour la presentation, backend pour la logique autoritaire, base relationnelle pour la coherence transactionnelle.

### Module 2 - Real-time features SSE (Major)
Reponse orale prete:
On a mis en place des notifications temps reel via SSE. Le serveur pousse les evenements vers les clients connectes, ce qui permet un retour immediat sans polling agressif.

Defense detaillee si on insiste:
Le choix SSE est intentionnel: besoin unidirectionnel serveur vers client, integration navigateur simple, maintenance plus legere, et comportement robuste pour des notifications metier.

### Module 3 - ORM (Minor)
Reponse orale prete:
On utilise JPA/Hibernate pour mapper le modele metier vers PostgreSQL. Les relations entre entites sont explicites et la logique de persistance est factorisee.

Defense detaillee si on insiste:
Ce choix reduit le code SQL repetitif, garde la cohesion du modele objet, et limite les erreurs de manipulation manuelle des relations.

### Module 4 - SSR (Minor)
Reponse orale prete:
Le frontend est prepare en mode SSR pour fournir un rendu initial plus solide et une meilleure perception de performance.

Defense detaillee si on insiste:
SSR apporte une couche de maturite de livraison frontend, surtout sur premier affichage et robustesse en environnement variable.

### Module 5 - Design system (Minor)
Reponse orale prete:
On a construit des composants reutilisables communs pour standardiser l interface et accelerer les evolutions.

Defense detaillee si on insiste:
C est un levier de qualite: moins de duplication, moins de regressions visuelles, meilleure coherence UX.

### Module 6 - Multi-langues (Minor)
Reponse orale prete:
L application supporte FR/EN/RU via un systeme de cles de traduction centralise.

Defense detaillee si on insiste:
Ce n est pas une traduction ponctuelle. C est une architecture i18n durable qui facilite l extension produit.

### Module 7 - Additional browser (Minor)
Reponse orale prete:
On a valide les parcours critiques sur plusieurs navigateurs pour assurer une experience stable au-dela de l environnement de dev.

Defense detaillee si on insiste:
La validation couvre des flux metier complets, pas seulement un affichage statique de page.

### Module 8 - OAuth2 (Minor)
Reponse orale prete:
On a integre OAuth2 (42/GitHub) pour simplifier l authentification et fiabiliser l identite federée.

Defense detaillee si on insiste:
Ce flux reduit la friction d entree, ameliore l adoption, et s appuie sur des fournisseurs d identite reconnus.

### Module 9 - Advanced permissions (Major)
Reponse orale prete:
Les permissions sont enforcees cote interface et surtout cote backend pour differencier strictement USER et ADMIN.

Defense detaillee si on insiste:
La securite reelle est serveur. Meme avec requete forgee, une action admin est refusee si role insuffisant.

### Module 10 - User activity dashboard (Minor)
Reponse orale prete:
On a un dashboard centré utilisateur qui transforme les actions de trading en indicateurs lisibles.

Defense detaillee si on insiste:
La valeur vient de la chaine complete: capture des evenements, consolidation des donnees, restitution utile pour piloter ses decisions.

### Module 11 - Advanced analytics dashboard (Major)
Reponse orale prete:
On fournit des graphes, des filtres et des exports pour passer d une simple consultation a une vraie analyse.

Defense detaillee si on insiste:
C est un module metier d aide a la decision, pas un simple habillage visuel. L utilisateur peut segmenter, comparer, puis exporter.

### Module 12 - Custom Major: Prediction Market Engine depuis donnees 42
Reponse orale prete:
On a construit un moteur metier qui transforme des signaux 42 en marches exploitables, avec cycle de vie complet.

Defense detaillee si on insiste:
Le module couvre generation, suivi, resolution et propagation d impact. C est un coeur metier original et techniquement profond.

### Module 13 - Custom Minor: Integration profil communaute 42
Reponse orale prete:
On relie l identite et le contexte profil 42 a l application pour un produit coherent avec sa cible.

Defense detaillee si on insiste:
L integration n est pas decorative: elle nourrit les flux utilisateur, renforce la coherence produit, et soutient les modules metier.

## 4) Questions de jury difficiles (reponses longues pretes)

### Question: "Expliquez la securite de bout en bout"
Reponse orale detaillee:
Notre securite est en couches. Premiere couche, authentification: credential classique securise ou OAuth2 federé. Deuxieme couche, stockage des secrets: mot de passe hache, jamais en clair. Troisieme couche, autorisation: verification role/permissions sur le backend avant chaque action sensible. Quatrieme couche, validation d entree: controles frontend pour UX et controles backend obligatoires pour l integrite. Cinquieme couche, transport: exposition HTTPS en entree utilisateur. Le point important est qu aucune couche prise seule n est suffisante; c est leur combinaison qui rend le systeme robuste.

### Question: "Expliquez votre logique metier prediction market"
Reponse orale detaillee:
On modelise un marche comme une entite avec etat, conditions, temporalite, et interactions utilisateur via ordres/positions. Les utilisateurs prennent des decisions YES/NO, puis le systeme suit l evolution et applique les regles de resolution quand les conditions sont atteintes. Les impacts sont reportes sur portefeuille, historique, indicateurs et notifications. Cette chaine complete garantit la coherence metier: une action utilisateur n est jamais isolee, elle a des consequences tracees de bout en bout.

### Question: "Expliquez pourquoi votre architecture tient la charge et evolue"
Reponse orale detaillee:
Notre architecture est evolutive car elle est modulaire. Le frontend peut evoluer sans toucher les regles critiques. Le backend centralise le domaine, donc les regles restent coherentes. La base relationnelle protege la coherence transactionnelle. Docker rend les environnements predictibles. Pour la charge, on peut scaler horizontalement les couches exposees selon besoin, et la separation des responsabilites limite les effets de bord. La maintenabilite vient de cette discipline d architecture, pas d un composant magique.

### Question: "Expliquez ce que chaque membre peut defendre"
Reponse orale detaillee:
Chaque membre doit etre capable de couvrir trois niveaux. Niveau produit: expliquer le besoin utilisateur et la valeur fonctionnelle. Niveau architecture: expliquer comment frontend, backend, base et temps reel cooperent. Niveau preuve: expliquer un module concret avec decisions techniques, compromis, et limites connues. La regle est simple: on ne recite pas une liste, on raconte un flux complet avec cause, implementation, et impact.

## 5) Regle orale equipe (a suivre strictement)

1. Commencer par le besoin, pas par le framework.
2. Donner la decision technique et le pourquoi en une phrase claire.
3. Expliquer le compromis: ce qu on gagne et ce qu on accepte.
4. Conclure par la valeur utilisateur ou valeur fiabilite.
5. Si une limite existe, la dire franchement puis donner la mitigation.

## 6) Reponse finale de cloture (30 secondes)
On ne defend pas juste des features isolees. On defend un systeme coherent: securise, modulaire, et operable, avec une logique metier claire de prediction market. Les modules ne sont pas ajoutes pour faire du point, ils servent un meme fil conducteur produit. C est cette coherence entre architecture, securite, temps reel et experience utilisateur qui fait la valeur technique du projet.
