# 📊 42Bets - Système de Marchés et Ordre Book

Documentation complète du système de marchés de prédiction (prediction markets) et du système d'administration des marchés pour les nouveaux contributeurs.

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture générale](#architecture-générale)
3. [Système d'Ordre Book](#système-dordre-book)
4. [Implémentation Backend](#implémentation-backend)
5. [Implémentation Frontend](#implémentation-frontend)
6. [Système d'Administration](#système-dadministration)
7. [API Endpoints](#api-endpoints)
8. [Exemples d'utilisation](#exemples-dutilisation)

---

## Vue d'ensemble

### Qu'est-ce qu'un Prediction Market ?

Un **market** (ou marché de prédiction) est une question binaire (OUI/NON) sur un événement futur où les utilisateurs peuvent placer des ordres pour exprimer leur conviction sur le résultat.

**Exemples:**
- "La France gagnera la Coupe du Monde 2026?"
- "Bitcoin dépassera $100k avant fin 2026?"
- "L'IA aura un impact positif en 2026?"

### Concepts clés

| Terme | Définition |
|-------|-----------|
| **Market** | Une question binaire avec deux côtés: YES et NO |
| **Side** | Le côté de la pari: `YES` ou `NO` |
| **Price** | Le prix d'un contrat (généralement 0-100, où 100 = certitude) |
| **Amount** | La quantité de contrats à acheter |
| **Order Book** | La liste des ordres ouverts agrégés par prix |
| **Liquidity** | Le volume total des contrats disponibles |
| **Probability** | La probabilité implicite calculée à partir de la liquidity (Oui% = YES Liquidity / Total Liquidity * 100) |

---

## Architecture générale

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Angular)                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Markets Component    │ Admin Panel               │   │
│  │ - Order Book Display │ - Manage Markets         │   │
│  │ - Place Orders       │ - Generate Markets       │   │
│  │ - View Markets List  │ - Edit Market Details    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↕ (HTTP/REST)
┌─────────────────────────────────────────────────────────┐
│                  Backend (Spring Boot)                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ MarketController     │ AdminUserController       │   │
│  │ - GET /api/markets   │ - GET /api/admin/markets │   │
│  │ - GET /order-book    │ - POST /generate         │   │
│  │ - POST /orders       │                          │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↓                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │ MarketService        │ OrderService              │   │
│  │ - Gestion des markets│ - Gestion des commandes  │   │
│  │ - Calcul probability │ - Agrégation du book     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Base de données                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Tables:                                          │   │
│  │ - markets           │ - market_orders            │   │
│  │ - app_user          │ - refresh_tokens           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Système d'Ordre Book

### Fonctionnement

L'ordre book est un système **agrégé par prix** qui permet de voir la liquidité disponible à chaque niveau de prix.

### Exemple de structure

```
Market: "Bitcoin > $100k en 2026?"

Côté YES (Acheteurs - pensent OUI):
Price  | Amount | Orders
-------|--------|-------
99     | 500    | 12
98     | 750    | 18
97     | 1000   | 25

Côté NO (Acheteurs - pensent NON):
Price  | Amount | Orders
-------|--------|-------
1      | 800    | 15
2      | 600    | 10
3      | 1200   | 28
```

### Calcul de la probabilité implicite

```
Total YES Liquidity: 500 + 750 + 1000 = 2250
Total NO Liquidity:  800 + 600 + 1200 = 2600
Total Liquidity:     4850

Probabilité YES = (2250 / 4850) * 100 = 46.39%
Probabilité NO  = (2600 / 4850) * 100 = 53.61%
```

---

## Implémentation Backend

### 1. Modèle Market

**Fichier:** `transcendence/src/main/java/com/ft/transcendence/model/Market.java`

```java
@Entity
@Table(name = "markets")
public class Market {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String question;        // La question du marché
    
    @Column(nullable = false)
    private String category;        // Catégorie: "Sports", "Politique", etc.
    
    @Column(length = 2000)
    private String description;     // Description détaillée
    
    @Column(name = "source_system", nullable = false)
    private String sourceSystem;    // Provenance: "API", "MANUAL", etc.
    
    @Column(name = "source_key", nullable = false, unique = true)
    private String sourceKey;       // ID unique de la source externe
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "end_date")
    private LocalDateTime endDate;   // Quand le marché se termine
    
    @Column(nullable = false)
    private boolean resolved;        // Le marché est-il résolu?
    
    @Column(name = "resolved_outcome")
    private String resolvedOutcome;  // "YES" ou "NO" après résolution
    
    @OneToMany(mappedBy = "market", cascade = CascadeType.ALL)
    private List<MarketOrder> orders;  // Les ordres associés
}
```

### 2. Modèle MarketOrder

**Fichier:** `transcendence/src/main/java/com/ft/transcendence/model/MarketOrder.java`

```java
@Entity
@Table(name = "market_orders")
public class MarketOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "market_id", nullable = false)
    private Market market;          // Le marché auquel appartient l'ordre
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;              // L'utilisateur qui a placé l'ordre
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MarketSide side;        // YES ou NO
    
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;       // Prix du contrat (0.00-100.00)
    
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;      // Quantité de contrats
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MarketOrderStatus status; // OPEN, FILLED, CANCELLED
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
```

### 3. MarketService

**Fichier:** `transcendence/src/main/java/com/ft/transcendence/service/MarketService.java`

#### Méthode clé: `getOrderBook()`

```java
public MarketOrderBookResponse getOrderBook(Long marketId) {
    Market market = requireMarket(marketId);
    
    // Récupère tous les ordres ouverts triés par prix DESC, puis par date ASC
    List<MarketOrder> openOrders = marketOrderRepository
        .findByMarketIdAndStatusOrderByPriceDescCreatedAtAsc(
            marketId,
            MarketOrderStatus.OPEN
        );
    
    MarketOrderBookResponse response = new MarketOrderBookResponse();
    response.setMarket(toMarketResponse(market));
    
    // Agrège les ordres par prix pour YES et NO
    response.setYesLevels(aggregateLevels(openOrders, MarketSide.YES));
    response.setNoLevels(aggregateLevels(openOrders, MarketSide.NO));
    
    return response;
}
```

#### Méthode clé: `aggregateLevels()`

```java
private List<OrderBookLevel> aggregateLevels(List<MarketOrder> orders, MarketSide side) {
    // Agrège les ordres par prix avec un TreeMap (ordres par prix décroissant)
    Map<BigDecimal, LevelAccumulator> grouped = new TreeMap<>(Comparator.reverseOrder());
    
    for (MarketOrder order : orders) {
        if (order.getSide() != side) continue;  // Filtre par côté
        
        BigDecimal price = normalizePrice(order.getPrice());
        LevelAccumulator acc = grouped.computeIfAbsent(price, key -> new LevelAccumulator());
        
        // Accumule le montant et le nombre d'ordres
        acc.amount = acc.amount.add(normalizeAmount(order.getAmount()));
        acc.orderCount++;
    }
    
    // Convertit en liste
    List<OrderBookLevel> levels = new ArrayList<>();
    for (Map.Entry<BigDecimal, LevelAccumulator> entry : grouped.entrySet()) {
        levels.add(new OrderBookLevel(
            entry.getKey(),
            entry.getValue().amount,
            entry.getValue().orderCount
        ));
    }
    return levels;
}
```

#### Calcul de la probabilité implicite

```java
private MarketResponse toMarketResponse(Market market) {
    List<MarketOrder> openOrders = marketOrderRepository
        .findByMarketIdAndStatusOrderByPriceDescCreatedAtAsc(
            market.getId(),
            MarketOrderStatus.OPEN
        );
    
    BigDecimal yesLiquidity = sumAmount(openOrders, MarketSide.YES);
    BigDecimal noLiquidity = sumAmount(openOrders, MarketSide.NO);
    BigDecimal totalLiquidity = yesLiquidity.add(noLiquidity);
    
    // Probabilité YES = (Liquidity YES / Total) * 100
    BigDecimal yesProbability = totalLiquidity.compareTo(BigDecimal.ZERO) == 0
        ? BigDecimal.ZERO
        : yesLiquidity
            .multiply(BigDecimal.valueOf(100))
            .divide(totalLiquidity, 2, RoundingMode.HALF_UP);
    
    MarketResponse response = new MarketResponse();
    response.setYesProbability(yesProbability);
    response.setYesLiquidity(yesLiquidity);
    response.setNoLiquidity(noLiquidity);
    response.setOpenOrderCount(openOrders.size());
    
    return response;
}
```

### 4. Placer un ordre

```java
@Transactional
public MarketOrderResponse placeOrder(Long marketId, Principal principal, MarketOrderRequest request) {
    // Validation de l'authentification
    if (principal == null || principal.getName() == null) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
    }
    
    // Vérification que le marché existe et n'est pas résolu
    Market market = requireMarket(marketId);
    if (market.isResolved()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Market already resolved");
    }
    
    // Récupération de l'utilisateur
    User user = userRepository.findByUsername(principal.getName())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    
    // Création de l'ordre
    MarketOrder order = new MarketOrder();
    order.setMarket(market);
    order.setUser(user);
    order.setSide(request.getSide());
    order.setPrice(normalizePrice(request.getPrice()));
    order.setAmount(normalizeAmount(request.getAmount()));
    order.setStatus(MarketOrderStatus.OPEN);
    
    return toOrderResponse(marketOrderRepository.save(order));
}
```

---

## Implémentation Frontend

### 1. Service MarketsService

**Fichier:** `42bets-frontend/src/app/services/markets.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class MarketsService {
  private readonly apiUrl = `${appConfig.apiUrl}/api/markets`;
  
  constructor(private readonly http: HttpClient) {}
  
  // Récupère tous les marchés
  getMarkets(): Observable<MarketSummary[]> {
    return this.http.get<MarketSummary[]>(this.apiUrl, { withCredentials: true });
  }
  
  // Récupère un marché spécifique
  getMarket(marketId: number): Observable<MarketSummary> {
    return this.http.get<MarketSummary>(`${this.apiUrl}/${marketId}`, { withCredentials: true });
  }
  
  // Récupère l'ordre book agrégé
  getOrderBook(marketId: number): Observable<MarketOrderBook> {
    return this.http.get<MarketOrderBook>(`${this.apiUrl}/${marketId}/order-book`, {
      withCredentials: true,
    });
  }
  
  // Place un nouvel ordre
  placeOrder(marketId: number, request: MarketOrderRequest): Observable<MarketOrderResponse> {
    return this.http.post<MarketOrderResponse>(
      `${this.apiUrl}/${marketId}/orders`,
      request,
      { withCredentials: true }
    );
  }
}
```

### 2. Composant MarketsComponent

**Fichier:** `42bets-frontend/src/app/markets/markets.component.ts`

```typescript
@Component({
  selector: 'app-markets',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './markets.component.html',
  styleUrl: './markets.component.scss',
})
export class MarketsComponent implements OnInit {
  // Signals pour la réactivité (Angular 16+)
  protected readonly markets = signal<MarketSummary[]>([]);
  protected readonly selectedMarketId = signal<number | null>(null);
  protected readonly orderBook = signal<MarketOrderBook | null>(null);
  protected readonly loading = signal(false);
  protected readonly placingOrder = signal(false);
  protected readonly error = signal<string | null>(null);
  
  // Paramètres de l'ordre
  protected readonly side = signal<MarketSide>('YES');
  protected readonly price = signal<number>(50);
  protected readonly amount = signal<number>(1);
  
  private readonly marketsService = inject(MarketsService);
  
  ngOnInit(): void {
    this.loadMarkets();
  }
  
  protected selectMarket(marketId: number): void {
    this.selectedMarketId.set(marketId);
    this.error.set(null);
    
    this.marketsService
      .getOrderBook(marketId)
      .pipe(catchError((error) => {
        this.error.set(error?.error?.error ?? 'Erreur de chargement');
        return of(null);
      }))
      .subscribe((orderBook) => {
        if (orderBook) this.orderBook.set(orderBook);
      });
  }
  
  protected placeOrder(): void {
    const marketId = this.selectedMarketId();
    if (!marketId) return;
    
    this.placingOrder.set(true);
    this.error.set(null);
    
    const request: MarketOrderRequest = {
      side: this.side(),
      price: this.price(),
      amount: this.amount(),
    };
    
    this.marketsService
      .placeOrder(marketId, request)
      .pipe(
        catchError((error) => {
          this.error.set(error?.error?.error ?? 'Erreur lors de la création');
          return of(null);
        }),
        finalize(() => this.placingOrder.set(false)),
      )
      .subscribe(() => this.loadMarkets(marketId));
  }
}
```

---

## Système d'Administration

### Vue d'ensemble

Le panneau d'administration permet aux **ADMIN** de:
- ✅ Gérer les marchés (créer, modifier, supprimer)
- ✅ Générer automatiquement des marchés
- ✅ Voir les détails des marchés
- ✅ Gérer les utilisateurs

### 1. Composant AdminUsersComponent

**Fichier:** `42bets-frontend/src/app/admin/admin-users/admin-users.component.ts`

#### Deux onglets principaux

```typescript
export class AdminUsersComponent implements OnInit {
  activeTab: 'users' | 'markets' = 'users';
  
  // État des marchés
  markets: MarketSummary[] = [];
  marketsLoading = false;
  marketsError: string | null = null;
  generationResult: string | null = null;
  
  constructor(private adminService: AdminService) {}
  
  ngOnInit() {
    this.loadUsers();
    this.loadMarkets();
  }
  
  setTab(tab: 'users' | 'markets') {
    this.activeTab = tab;
  }
}
```

#### Gestion des marchés

##### Charger les marchés

```typescript
loadMarkets() {
  this.marketsLoading = true;
  this.marketsError = null;
  this.adminService.getMarkets().subscribe(
    (data: MarketSummary[]) => {
      this.markets = data;
      this.marketsLoading = false;
    },
    (err: any) => {
      this.marketsError = 'Erreur lors du chargement des markets';
      this.marketsLoading = false;
      console.error(err);
    },
  );
}
```

##### Générer des marchés

```typescript
generateMarkets() {
  this.marketsLoading = true;
  this.generationResult = null;
  this.adminService.generateMarkets().subscribe(
    (result: any) => {
      // Exemple de réponse:
      // { message: "Markets generated", createdCount: 5, totalMarkets: 42 }
      this.generationResult = 
        `${result.message} (${result.createdCount} créés, ${result.totalMarkets} au total)`;
      this.loadMarkets();  // Recharge la liste
    },
    (err: any) => {
      this.marketsError = 'Erreur lors de la génération';
      this.marketsLoading = false;
    },
  );
}
```

### 2. Service AdminService

**Fichier:** `42bets-frontend/src/app/services/admin.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly apiUrl = `${appConfig.apiUrl}/api/admin`;
  
  constructor(private readonly http: HttpClient) {}
  
  // Marchés
  getMarkets(): Observable<MarketSummary[]> {
    return this.http.get<MarketSummary[]>(`${this.apiUrl}/markets`);
  }
  
  generateMarkets(): Observable<{ 
    message: string; 
    createdCount: number; 
    totalMarkets: number 
  }> {
    return this.http.post<any>(`${this.apiUrl}/markets/generate`, {});
  }
  
  // Utilisateurs
  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`);
  }
  
  getUserById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users/${id}`);
  }
}
```

### 3. Affichage du tableau des marchés

**Template:** `42bets-frontend/src/app/admin/admin-users/admin-users.component.html`

```html
<section *ngIf="activeTab === 'markets'" class="markets-admin-panel">
  <div class="panel-actions">
    <button (click)="loadMarkets()" class="btn btn-primary">
      Refresh markets
    </button>
    <button (click)="generateMarkets()" class="btn btn-success">
      Generate markets
    </button>
  </div>

  <div *ngIf="marketsLoading" class="loading">Loading markets...</div>
  <div *ngIf="marketsError" class="error">{{ marketsError }}</div>
  <div *ngIf="generationResult" class="success-banner">
    {{ generationResult }}
  </div>

  <table class="users-table" *ngIf="markets.length > 0">
    <thead>
      <tr>
        <th>ID</th>
        <th>Question</th>
        <th>Category</th>
        <th>Source</th>
        <th>YES %</th>
        <th>Orders</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr *ngFor="let market of markets">
        <td>{{ market.id }}</td>
        <td>
          <div class="market-question">{{ market.question }}</div>
          <small>{{ market.description }}</small>
        </td>
        <td>{{ market.category }}</td>
        <td>{{ market.sourceSystem }}</td>
        <td>{{ market.yesProbability | number: '1.0-2' }}%</td>
        <td>{{ market.openOrderCount }}</td>
        <td>
          <span class="status-badge"
            [class.status-on]="!market.resolved"
            [class.status-off]="market.resolved">
            {{ market.resolved ? 'Resolved' : 'Open' }}
          </span>
        </td>
      </tr>
    </tbody>
  </table>

  <p *ngIf="markets.length === 0 && !marketsLoading">
    No market found
  </p>
</section>
```

---

## API Endpoints

### Markets Publics

| Méthode | Endpoint | Description | Authentification |
|---------|----------|-------------|------------------|
| GET | `/api/markets` | Liste tous les marchés | ❌ Non requise |
| GET | `/api/markets/{id}` | Récupère un marché spécifique | ❌ Non requise |
| GET | `/api/markets/{id}/order-book` | Récupère l'ordre book agrégé | ❌ Non requise |
| POST | `/api/markets/{id}/orders` | Place un nouvel ordre | ✅ Requise (utilisateur) |

### Markets Admin

| Méthode | Endpoint | Description | Authentification |
|---------|----------|-------------|------------------|
| GET | `/api/admin/markets` | Liste les marchés (admin) | ✅ Requise (ADMIN) |
| POST | `/api/admin/markets/generate` | Génère de nouveaux marchés | ✅ Requise (ADMIN) |

---

## Exemples d'utilisation

### 1. Récupérer tous les marchés

```bash
curl -X GET http://localhost:8080/api/markets
```

**Réponse:**
```json
[
  {
    "id": 1,
    "question": "Bitcoin dépassera-t-il $100k avant fin 2026?",
    "category": "Crypto",
    "description": "Prix du Bitcoin en USD",
    "sourceSystem": "API",
    "sourceKey": "crypto_btc_100k",
    "createdAt": "2026-05-21T10:30:00",
    "endDate": "2026-12-31T23:59:59",
    "resolved": false,
    "resolvedOutcome": null,
    "yesLiquidity": 2500.00,
    "noLiquidity": 3200.00,
    "yesProbability": 43.86,
    "openOrderCount": 42
  }
]
```

### 2. Récupérer l'ordre book d'un marché

```bash
curl -X GET http://localhost:8080/api/markets/1/order-book
```

**Réponse:**
```json
{
  "market": {
    "id": 1,
    "question": "Bitcoin dépassera-t-il $100k?",
    "yesProbability": 43.86,
    ...
  },
  "yesLevels": [
    {
      "price": 75.00,
      "amount": 500.00,
      "orderCount": 8
    },
    {
      "price": 50.00,
      "amount": 1200.00,
      "orderCount": 15
    }
  ],
  "noLevels": [
    {
      "price": 25.00,
      "amount": 800.00,
      "orderCount": 12
    },
    {
      "price": 10.00,
      "amount": 600.00,
      "orderCount": 10
    }
  ]
}
```

### 3. Placer un ordre

```bash
curl -X POST http://localhost:8080/api/markets/1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "side": "YES",
    "price": 45.50,
    "amount": 10.00
  }'
```

**Réponse:**
```json
{
  "id": 123,
  "marketId": 1,
  "username": "user@example.com",
  "side": "YES",
  "price": 45.50,
  "amount": 10.00,
  "status": "OPEN",
  "createdAt": "2026-05-21T14:22:15"
}
```

### 4. Générer des marchés (Admin)

```bash
curl -X POST http://localhost:8080/api/admin/markets/generate \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Réponse:**
```json
{
  "message": "Markets generated successfully",
  "createdCount": 5,
  "totalMarkets": 47
}
```

---

## Architecture des dossiers

```
42bets-frontend/
├── src/
│   └── app/
│       ├── markets/
│       │   ├── markets.component.ts       # Composant principal
│       │   ├── markets.component.html     # Template
│       │   └── markets.component.scss     # Styles
│       ├── admin/
│       │   └── admin-users/
│       │       ├── admin-users.component.ts
│       │       ├── admin-users.component.html
│       │       └── admin-users.component.scss
│       └── services/
│           ├── markets.ts                 # Service des marchés
│           └── admin.service.ts           # Service d'admin

transcendence/
├── src/main/java/com/ft/transcendence/
│   ├── controller/
│   │   ├── MarketController.java          # Endpoints publics
│   │   └── AdminUserController.java       # Endpoints admin
│   ├── service/
│   │   └── MarketService.java             # Logique métier
│   ├── model/
│   │   ├── Market.java                    # Entité Market
│   │   └── MarketOrder.java               # Entité Order
│   ├── dto/
│   │   ├── MarketResponse.java
│   │   ├── MarketOrderRequest.java
│   │   ├── MarketOrderResponse.java
│   │   └── MarketOrderBookResponse.java
│   └── repository/
│       └── MarketOrderRepository.java
```

---

## Points clés à retenir

### Backend
- 🔐 La sécurité est gérée par les annotations `@PreAuthorize` 
- 💾 Les ordres sont stockés individuellement dans la BD
- 📊 L'ordre book est **calculé et agrégé** à la volée depuis les ordres individuels
- 🔢 Les prix et montants utilisent `BigDecimal` pour la précision
- 🔄 Utilisation de `@Transactional` pour les opérations critiques

### Frontend
- ⚡ Utilisation des **Signals** (Angular 16+) pour la réactivité
- 🎯 Les composants sont **standalone** (pas de NgModule)
- 🔌 Communication via service injecté avec `inject()`
- 🔐 Les tokens JWT sont envoyés automatiquement par l'interceptor
- 📱 Responsive design avec SCSS

### Sécurité
- ✅ Authentification requise pour placer des ordres
- ✅ Seuls les ADMIN peuvent accéder au panneau d'admin
- ✅ Les données sensibles (password, tokens) ne sont jamais retournées par l'API
- ✅ CORS configuré pour les environnements Docker et localhost

---

## Questions fréquentes

**Q: Comment fonctionne le calcul de probabilité?**  
R: C'est basique: (Montant YES / Montant total) * 100. Plus simple que les AMM complexes.

**Q: Les ordres sont-ils automatiquement matchés?**  
R: Non, c'est un **order book passif**. Les ordres restent ouverts jusqu'à être cancelés ou manuellement matchés.

**Q: Comment ajouter un nouveau marché?**  
R: Via l'endpoint POST `/api/admin/markets/generate` ou en insérant directement en BD.

**Q: Pourquoi utiliser BigDecimal?**  
R: Les float/double ne sont pas suffisamment précis pour l'argent. BigDecimal évite les erreurs d'arrondi.

---

## Pour les contributeurs

1. **Avant de modifier**: Comprendre l'architecture existante
2. **Tester**: Vérifier que les tests passent (`mvn test`, `ng test`)
3. **Code review**: Un collègue doit revoir les changements
4. **Documentation**: Mettre à jour ce README si vous changez l'API

---

**Dernière mise à jour:** 21 mai 2026  
**Mainteneurs:** Équipe 42Bets
