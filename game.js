// game.js - COMPLETE MODIFIED CODE with Stock Recycle Counter
class SolitaireGame {
    constructor() {
        this.SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
        this.RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.RANK_VALUES = {
            'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
            '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
        };
        
        // Custom Data Structures
        this.stock = [];
        this.waste = [];
        this.foundations = {
            'hearts': new Stack(),
            'diamonds': new Stack(),
            'clubs': new Stack(),
            'spades': new Stack()
        };
        this.tableau = [
            new LinkedList(), new LinkedList(), new LinkedList(),
            new LinkedList(), new LinkedList(), new LinkedList(),
            new LinkedList()
        ];
        this.moveHistory = new MoveHistory();
        
        this.moveCount = 0;
        this.score = 0;
        this.startTime = Date.now();
        this.timerInterval = null;
        this.draggedCard = null;
        this.dragSource = null;
        this.consecutiveNoMoves = 0;
        this.moveCheckInterval = null;
        
        // NEW: Stock recycle counter
        this.stockRecycleCount = 0;
        this.maxStockRecycles = 5; // Show message after 5 full stock cycles

        this.initializeGame();
        this.setupEventListeners();
        this.startTimer();
        this.setupDragAndDrop();
        this.startMoveChecker();
    }

    initializeGame() {
        console.log("🎮 Starting Solitaire Game...");
        
        // Create and shuffle deck
        const deck = this.createDeck();
        this.shuffleDeck(deck);
        
        // Deal to tableau with ORIGINAL STAIR PATTERN
        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                if (deck.length > 0) {
                    const card = deck.pop();
                    // ONLY the top card (last card) in each column is face up
                    card.face_up = (row === col);
                    this.tableau[col].append(card);
                }
            }
        }
        
        // Remaining cards go to stock (as array)
        this.stock = deck;
        
        // NEW: Reset recycle counter
        this.stockRecycleCount = 0;
        
        this.saveGameState();
        this.renderGame();
        this.updateStats();
    }

    createDeck() {
        const deck = [];
        for (const suit of this.SUITS) {
            for (const rank of this.RANKS) {
                deck.push({
                    suit: suit,
                    rank: rank,
                    face_up: false,
                    color: (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black',
                    id: `${suit}-${rank}-${Math.random().toString(36).substr(2, 9)}`
                });
            }
        }
        return deck;
    }

    shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    // NEW: Start automatic move checking
    startMoveChecker() {
        // Check for moves every 10 seconds
        this.moveCheckInterval = setInterval(() => {
            this.checkForPossibleMoves();
        }, 10000);
    }

    // NEW: Check for possible moves automatically
    checkForPossibleMoves() {
        // First check if we've hit the stock recycle limit
        if (this.stockRecycleCount >= this.maxStockRecycles) {
            this.showStockRecycleLimitMessage();
            return;
        }
        
        if (this.hasPossibleMoves()) {
            this.consecutiveNoMoves = 0;
        } else {
            this.consecutiveNoMoves++;
            if (this.consecutiveNoMoves >= 2) { // Only show after 2 consecutive checks
                this.showOutOfMovesMessage();
            }
        }
    }

    // NEW: Comprehensive move checking
    hasPossibleMoves() {
        // If we've hit the stock recycle limit, no more moves are possible
        if (this.stockRecycleCount >= this.maxStockRecycles) {
            return false;
        }
        
        // Check waste to tableau moves
        if (this.hasWasteToTableauMoves()) return true;
        
        // Check waste to foundation moves
        if (this.hasWasteToFoundationMoves()) return true;
        
        // Check tableau to tableau moves
        if (this.hasTableauToTableauMoves()) return true;
        
        // Check tableau to foundation moves
        if (this.hasTableauToFoundationMoves()) return true;
        
        // Check if we can draw cards (considering recycle limit)
        if (this.stock.length > 0 || (this.stock.length === 0 && this.waste.length > 0 && this.stockRecycleCount < this.maxStockRecycles)) {
            return true;
        }
        
        return false;
    }

    // NEW: Check for waste to tableau moves
    hasWasteToTableauMoves() {
        if (this.waste.length === 0) return false;
        
        const visibleWasteCards = this.getVisibleWasteCards();
        for (let wasteIndex = 0; wasteIndex < visibleWasteCards.length; wasteIndex++) {
            const card = visibleWasteCards[wasteIndex];
            for (let col = 0; col < 7; col++) {
                if (this.canMoveToTableau(card, col)) {
                    return true;
                }
            }
        }
        return false;
    }

    // NEW: Check for waste to foundation moves
    hasWasteToFoundationMoves() {
        if (this.waste.length === 0) return false;
        
        const visibleWasteCards = this.getVisibleWasteCards();
        for (let wasteIndex = 0; wasteIndex < visibleWasteCards.length; wasteIndex++) {
            const card = visibleWasteCards[wasteIndex];
            if (this.canMoveToFoundation(card)) {
                return true;
            }
        }
        return false;
    }

    // NEW: Check for tableau to tableau moves
    hasTableauToTableauMoves() {
        for (let fromCol = 0; fromCol < 7; fromCol++) {
            const sourceArray = this.tableau[fromCol].toArray();
            for (let cardIndex = 0; cardIndex < sourceArray.length; cardIndex++) {
                const card = sourceArray[cardIndex];
                if (card.face_up) {
                    // Check if this starts a valid sequence
                    const sequence = sourceArray.slice(cardIndex);
                    if (this.isValidCardSequence(sequence)) {
                        for (let toCol = 0; toCol < 7; toCol++) {
                            if (fromCol !== toCol && this.canMoveToTableau(card, toCol)) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    // NEW: Check for tableau to foundation moves
    hasTableauToFoundationMoves() {
        for (let col = 0; col < 7; col++) {
            if (!this.tableau[col].isEmpty()) {
                const card = this.tableau[col].getLast();
                if (card.face_up && this.canMoveToFoundation(card)) {
                    return true;
                }
            }
        }
        return false;
    }

    // NEW: Show out of moves message
    showOutOfMovesMessage() {
        console.log("🚫 No more moves available!");
        
        // Create or show out of moves message
        let outOfMovesEl = document.getElementById('outOfMovesMessage');
        if (!outOfMovesEl) {
            outOfMovesEl = document.createElement('div');
            outOfMovesEl.id = 'outOfMovesMessage';
            outOfMovesEl.className = 'message-overlay';
            outOfMovesEl.innerHTML = `
                <div class="message-box">
                    <h2>No More Moves! 🎴</h2>
                    <p>You've run out of possible moves.</p>
                    <p>Final Score: <span id="finalScoreOut">${this.score}</span></p>
                    <p>Moves: <span id="finalMovesOut">${this.moveCount}</span></p>
                    <p>Time: <span id="finalTimeOut">${document.getElementById('timer').textContent}</span></p>
                    <div class="message-buttons">
                        <button id="newGameOut" class="btn btn-primary">New Game</button>
                        <button id="continueGame" class="btn btn-secondary">Continue Anyway</button>
                    </div>
                </div>
            `;
            document.body.appendChild(outOfMovesEl);
            
            // Add event listeners
            document.getElementById('newGameOut').addEventListener('click', () => {
                this.newGame();
                outOfMovesEl.remove();
            });
            
            document.getElementById('continueGame').addEventListener('click', () => {
                outOfMovesEl.remove();
                this.consecutiveNoMoves = 0;
            });
        }
        
        outOfMovesEl.classList.remove('hidden');
    }

    // NEW: Show message when stock recycle limit is reached
    showStockRecycleLimitMessage() {
        console.log("🎴 Stock recycle limit reached - showing message");
        
        // Create or show stock recycle limit message
        let recycleLimitEl = document.getElementById('stockRecycleLimitMessage');
        if (!recycleLimitEl) {
            recycleLimitEl = document.createElement('div');
            recycleLimitEl.id = 'stockRecycleLimitMessage';
            recycleLimitEl.className = 'message-overlay';
            recycleLimitEl.innerHTML = `
                <div class="message-box">
                    <h2>Stock Limit Reached! ⚠️</h2>
                    <p>You've recycled through the stock pile ${this.stockRecycleCount} times.</p>
                    <p>The game allows maximum ${this.maxStockRecycles} full stock cycles.</p>
                    <p>Final Score: <span id="finalScoreRecycle">${this.score}</span></p>
                    <p>Moves: <span id="finalMovesRecycle">${this.moveCount}</span></p>
                    <p>Time: <span id="finalTimeRecycle">${document.getElementById('timer').textContent}</span></p>
                    <div class="message-buttons">
                        <button id="newGameRecycle" class="btn btn-primary">New Game</button>
                        <button id="continueRecycle" class="btn btn-secondary">Continue Anyway</button>
                    </div>
                </div>
            `;
            document.body.appendChild(recycleLimitEl);
            
            // Add event listeners
            document.getElementById('newGameRecycle').addEventListener('click', () => {
                this.newGame();
                recycleLimitEl.remove();
            });
            
            document.getElementById('continueRecycle').addEventListener('click', () => {
                recycleLimitEl.remove();
                // Allow continuing but don't reset the counter
            });
        }
        
        recycleLimitEl.classList.remove('hidden');
    }

    // FIXED: THREE-CARD DRAW with stock recycle counting
    drawCard() {
        if (this.stock.length === 0 && this.waste.length === 0) {
            // Check if truly out of moves when stock and waste are empty
            setTimeout(() => this.checkForPossibleMoves(), 500);
            return false;
        }
        
        const previousState = this.getGameState();
        
        if (this.stock.length === 0) {
            // Reset stock from waste - INCREMENT RECYCLE COUNTER
            console.log("🔄 Resetting stock from waste...");
            this.stockRecycleCount++;
            console.log(`📊 Stock recycle count: ${this.stockRecycleCount}/${this.maxStockRecycles}`);
            
            const wasteCards = [...this.waste];
            this.waste = [];
            
            wasteCards.reverse().forEach(card => {
                card.face_up = false;
                this.stock.push(card);
            });
            
            console.log("✅ Stock reset with", this.stock.length, "cards");
            
            // NEW: Check if we've reached the maximum recycle limit
            if (this.stockRecycleCount >= this.maxStockRecycles) {
                console.log("🚫 Maximum stock recycles reached!");
                setTimeout(() => this.showStockRecycleLimitMessage(), 500);
            } else {
                // Check for moves after reset
                setTimeout(() => this.checkForPossibleMoves(), 500);
            }
        } else {
            // Draw THREE cards
            let cardsDrawn = 0;
            while (this.stock.length > 0 && cardsDrawn < 3) {
                const card = this.stock.pop();
                card.face_up = true;
                this.waste.push(card);
                cardsDrawn++;
            }
            this.moveCount++;
            this.consecutiveNoMoves = 0; // Reset no-moves counter
        }
        
        this.moveHistory.recordMove('draw', previousState, { 
            cardsDrawn: 3,
            stockRecycleCount: this.stockRecycleCount // Track in history
        });
        this.updateStats();
        this.renderGame();
        return true;
    }

    // FIXED: Move ANY waste card to tableau with move checking
    moveWasteCardToTableau(wasteIndex, toCol) {
        const visibleWasteCards = this.getVisibleWasteCards();
        if (wasteIndex < 0 || wasteIndex >= visibleWasteCards.length) return false;
        
        const actualIndex = this.waste.length - visibleWasteCards.length + wasteIndex;
        if (actualIndex < 0 || actualIndex >= this.waste.length) return false;
        
        const card = this.waste[actualIndex];
        
        if (this.canMoveToTableau(card, toCol)) {
            const previousState = this.getGameState();
            
            const movedCard = this.waste.splice(actualIndex, 1)[0];
            this.tableau[toCol].append(movedCard);
            this.moveCount++;
            this.consecutiveNoMoves = 0;
            
            this.moveHistory.recordMove('waste_to_tableau', previousState, { 
                toCol: toCol, 
                card: movedCard,
                wasteIndex: actualIndex
            });
            this.updateStats();
            this.renderGame();
            
            // Check for moves after successful move
            setTimeout(() => this.checkForPossibleMoves(), 100);
            return true;
        }
        return false;
    }

    // FIXED: Move ANY waste card to foundation with move checking
    moveWasteCardToFoundation(wasteIndex) {
        const visibleWasteCards = this.getVisibleWasteCards();
        if (wasteIndex < 0 || wasteIndex >= visibleWasteCards.length) return false;
        
        const actualIndex = this.waste.length - visibleWasteCards.length + wasteIndex;
        if (actualIndex < 0 || actualIndex >= this.waste.length) return false;
        
        const card = this.waste[actualIndex];
        
        if (this.canMoveToFoundation(card)) {
            const previousState = this.getGameState();
            
            const movedCard = this.waste.splice(actualIndex, 1)[0];
            this.foundations[movedCard.suit].push(movedCard);
            this.moveCount++;
            this.consecutiveNoMoves = 0;
            
            this.moveHistory.recordMove('waste_to_foundation', previousState, {
                card: movedCard,
                wasteIndex: actualIndex
            });
            this.updateStats();
            this.renderGame();
            
            this.checkWinCondition();
            // Check for moves after successful move
            setTimeout(() => this.checkForPossibleMoves(), 100);
            return true;
        }
        return false;
    }

    // FIXED: Get only the visible waste cards
    getVisibleWasteCards() {
        const startIndex = Math.max(0, this.waste.length - 3);
        return this.waste.slice(startIndex);
    }

    moveTableauToFoundation(fromCol) {
        if (this.tableau[fromCol].isEmpty()) return false;
        
        const card = this.tableau[fromCol].getLast();
        if (this.canMoveToFoundation(card)) {
            const previousState = this.getGameState();
            const movedCard = this.tableau[fromCol].removeLast();
            this.foundations[movedCard.suit].push(movedCard);
            
            if (!this.tableau[fromCol].isEmpty()) {
                const newTopCard = this.tableau[fromCol].getLast();
                newTopCard.face_up = true;
            }
            
            this.moveCount++;
            this.consecutiveNoMoves = 0;
            
            this.moveHistory.recordMove('tableau_to_foundation', previousState, {
                fromCol: fromCol,
                card: movedCard
            });
            this.updateStats();
            this.renderGame();
            
            this.checkWinCondition();
            // Check for moves after successful move
            setTimeout(() => this.checkForPossibleMoves(), 100);
            return true;
        }
        return false;
    }

    // FIXED: Move sequence of cards between tableau columns with move checking
    moveTableauToTableau(fromCol, cardIndex, toCol) {
        if (fromCol < 0 || fromCol > 6 || toCol < 0 || toCol > 6) return false;
        if (this.tableau[fromCol].isEmpty()) return false;
        
        const sourceArray = this.tableau[fromCol].toArray();
        if (cardIndex < 0 || cardIndex >= sourceArray.length) return false;
        
        const movingCards = sourceArray.slice(cardIndex);
        const allFaceUp = movingCards.every(card => card.face_up);
        if (!allFaceUp) return false;
        
        const isValidSequence = this.isValidCardSequence(movingCards);
        if (!isValidSequence) return false;
        
        const movingCard = movingCards[0];
        if (!this.canMoveToTableau(movingCard, toCol)) return false;
        
        const previousState = this.getGameState();
        
        const remainingCards = sourceArray.slice(0, cardIndex);
        this.tableau[fromCol] = new LinkedList();
        remainingCards.forEach(card => this.tableau[fromCol].append(card));
        
        movingCards.forEach(card => {
            this.tableau[toCol].append(card);
        });
        
        if (!this.tableau[fromCol].isEmpty()) {
            const newTopCard = this.tableau[fromCol].getLast();
            newTopCard.face_up = true;
        }
        
        this.moveCount++;
        this.consecutiveNoMoves = 0;
        
        this.moveHistory.recordMove('tableau_to_tableau', previousState, {
            fromCol: fromCol,
            toCol: toCol,
            cardIndex: cardIndex,
            movedCards: movingCards
        });
        this.updateStats();
        this.renderGame();
        
        // Check for moves after successful move
        setTimeout(() => this.checkForPossibleMoves(), 100);
        return true;
    }

    // Validate card sequence
    isValidCardSequence(cards) {
        if (cards.length === 1) return true;
        
        for (let i = 0; i < cards.length - 1; i++) {
            const currentCard = cards[i];
            const nextCard = cards[i + 1];
            
            if (currentCard.color === nextCard.color) return false;
            if (this.RANK_VALUES[currentCard.rank] !== this.RANK_VALUES[nextCard.rank] + 1) return false;
        }
        
        return true;
    }

    // Move validation methods
    canMoveToTableau(card, targetCol) {
        const targetPile = this.tableau[targetCol];
        
        if (targetPile.isEmpty()) {
            return card.rank === 'K';
        }
        
        const topCard = targetPile.getLast();
        return (card.color !== topCard.color) && 
               (this.RANK_VALUES[card.rank] === this.RANK_VALUES[topCard.rank] - 1);
    }

    canMoveToFoundation(card) {
        const foundation = this.foundations[card.suit];
        
        if (card.rank === 'A') {
            return foundation.isEmpty();
        }
        
        if (foundation.isEmpty()) {
            return false;
        }
        
        const topCard = foundation.peek();
        return this.RANK_VALUES[card.rank] === this.RANK_VALUES[topCard.rank] + 1;
    }

    // Undo/Redo functionality
    undo() {
        const move = this.moveHistory.undo();
        if (move) {
            this.restoreGameState(move.gameState);
            this.updateStats();
            this.renderGame();
            return true;
        }
        return false;
    }

    redo() {
        const move = this.moveHistory.redo();
        if (move) {
            this.restoreGameState(move.gameState);
            this.updateStats();
            this.renderGame();
            return true;
        }
        return false;
    }

    // MODIFIED: Update game state to include stock recycle count
    getGameState() {
        return {
            stock: [...this.stock],
            waste: [...this.waste],
            foundations: {
                'hearts': this.foundations.hearts.toArray(),
                'diamonds': this.foundations.diamonds.toArray(),
                'clubs': this.foundations.clubs.toArray(),
                'spades': this.foundations.spades.toArray()
            },
            tableau: this.tableau.map(pile => pile.toArray()),
            moveCount: this.moveCount,
            score: this.score,
            stockRecycleCount: this.stockRecycleCount // NEW: Include in saved state
        };
    }

    // MODIFIED: Restore game state to include stock recycle count
    restoreGameState(state) {
        this.stock = [...state.stock];
        this.waste = [...state.waste];
        
        Object.keys(this.foundations).forEach(suit => {
            this.foundations[suit].clear();
        });
        Object.keys(state.foundations).forEach(suit => {
            state.foundations[suit].forEach(card => this.foundations[suit].push(card));
        });
        
        this.tableau.forEach((pile, index) => {
            pile.items = [];
            state.tableau[index].forEach(card => pile.append(card));
        });
        
        this.moveCount = state.moveCount;
        this.score = state.score;
        this.stockRecycleCount = state.stockRecycleCount || 0; // NEW: Restore recycle count
    }

    // Rendering methods
    renderGame() {
        this.renderStockAndWaste();
        this.renderFoundations();
        this.renderTableau();
        this.updateUndoRedoButtons();
    }

    renderStockAndWaste() {
        const stock = document.getElementById('stock');
        const waste = document.getElementById('waste');
        
        stock.innerHTML = '';
        waste.innerHTML = '';
        
        if (this.stock.length > 0) {
            const stackSize = Math.min(3, this.stock.length);
            let stackHTML = '<div class="card-stack">';
            for (let i = 0; i < stackSize; i++) {
                stackHTML += '<div class="card back animated-card"></div>';
            }
            stackHTML += '</div>';
            stock.innerHTML = stackHTML;
        }
        
        const visibleWasteCards = this.getVisibleWasteCards();
        if (visibleWasteCards.length > 0) {
            visibleWasteCards.forEach((card, visibleIndex) => {
                const cardEl = this.createCardElement(card, 'waste', visibleIndex);
                const offset = visibleIndex * 25;
                cardEl.style.transform = `translateX(${offset}px)`;
                cardEl.style.zIndex = visibleIndex;
                
                cardEl.setAttribute('draggable', 'true');
                cardEl.classList.add('accessible-card');
                cardEl.style.cursor = 'pointer';
                
                waste.appendChild(cardEl);
            });

            if (this.waste.length > 3) {
                const countIndicator = document.createElement('div');
                countIndicator.className = 'waste-count-indicator';
                countIndicator.textContent = `+${this.waste.length - 3} more`;
                countIndicator.style.cssText = `
                    position: absolute;
                    bottom: -25px;
                    left: 50%;
                    transform: translateX(-50%);
                    color: white;
                    font-size: 12px;
                    background: rgba(0,0,0,0.7);
                    padding: 2px 8px;
                    border-radius: 10px;
                    white-space: nowrap;
                `;
                waste.appendChild(countIndicator);
            }
        }

        stock.addEventListener('click', () => this.drawCard());
    }

    renderFoundations() {
        for (const [suit, foundation] of Object.entries(this.foundations)) {
            const foundationEl = document.querySelector(`.foundation[data-suit="${suit}"]`);
            if (!foundationEl) continue;
            
            foundationEl.innerHTML = '';
            
            if (!foundation.isEmpty()) {
                const topCard = foundation.peek();
                const cardEl = this.createCardElement(topCard, 'foundation', 0);
                foundationEl.appendChild(cardEl);
            }
        }
    }

    renderTableau() {
        const tableau = document.getElementById('tableau');
        
        this.tableau.forEach((column, colIndex) => {
            const columnEl = tableau.querySelector(`[data-col="${colIndex}"]`);
            if (!columnEl) return;
            
            columnEl.innerHTML = '';
            columnEl.setAttribute('data-col', colIndex);
            
            const cards = column.toArray();
            cards.forEach((card, cardIndex) => {
                const cardEl = this.createCardElement(card, 'tableau', cardIndex, colIndex);
                cardEl.style.marginTop = `${cardIndex * 30}px`;
                columnEl.appendChild(cardEl);
                
                if (card.face_up) {
                    const sequenceFromHere = cards.slice(cardIndex);
                    const isValidSequence = this.isValidCardSequence(sequenceFromHere);
                    
                    if (isValidSequence) {
                        cardEl.classList.add('accessible-card');
                        cardEl.setAttribute('draggable', 'true');
                        cardEl.style.cursor = 'grab';
                    } else {
                        cardEl.setAttribute('draggable', 'false');
                        cardEl.style.cursor = 'default';
                    }
                } else {
                    cardEl.setAttribute('draggable', 'false');
                    cardEl.style.cursor = 'default';
                }
            });
        });
    }

    createCardElement(card, location, visibleIndex, colIndex = null) {
        const cardEl = document.createElement('div');
        cardEl.className = `card ${card.face_up ? 'front' : 'back'}`;
        cardEl.setAttribute('data-card-id', card.id);
        
        if (card.face_up) {
            cardEl.classList.add(card.color);
            cardEl.innerHTML = `
                <div class="corner top-left">
                    <div class="rank">${card.rank}</div>
                    <div class="suit">${this.getSuitSymbol(card.suit)}</div>
                </div>
                <div class="corner top-right">
                    <div class="rank">${card.rank}</div>
                    <div class="suit">${this.getSuitSymbol(card.suit)}</div>
                </div>
                <div class="corner bottom-left">
                    <div class="suit">${this.getSuitSymbol(card.suit)}</div>
                    <div class="rank">${card.rank}</div>
                </div>
                <div class="corner bottom-right">
                    <div class="suit">${this.getSuitSymbol(card.suit)}</div>
                    <div class="rank">${card.rank}</div>
                </div>
            `;

            if (location === 'waste') {
                cardEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!this.moveWasteCardToFoundation(visibleIndex)) {
                        let moved = false;
                        for (let col = 0; col < 7; col++) {
                            if (this.moveWasteCardToTableau(visibleIndex, col)) {
                                moved = true;
                                break;
                            }
                        }
                        if (!moved) {
                            this.checkForPossibleMoves();
                        }
                    }
                });
            }
            
            if (location === 'tableau') {
                const cards = this.tableau[colIndex].toArray();
                if (visibleIndex === cards.length - 1) {
                    cardEl.addEventListener('click', () => {
                        this.moveTableauToFoundation(colIndex);
                    });
                }
            }
        }

        cardEl.setAttribute('data-location', location);
        cardEl.setAttribute('data-index', visibleIndex);
        if (colIndex !== null) {
            cardEl.setAttribute('data-col', colIndex);
        }

        return cardEl;
    }

    getSuitSymbol(suit) {
        const symbols = {
            'hearts': '♥', 'diamonds': '♦', 'clubs': '♣', 'spades': '♠'
        };
        return symbols[suit];
    }

    // Drag and drop setup
    setupDragAndDrop() {
        let dragOverElement = null;

        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('card') && e.target.getAttribute('draggable') === 'true') {
                this.draggedCard = e.target;
                const location = e.target.getAttribute('data-location');
                const visibleIndex = parseInt(e.target.getAttribute('data-index'));
                const colIndex = e.target.hasAttribute('data-col') ? parseInt(e.target.getAttribute('data-col')) : null;
                
                this.dragSource = {
                    location: location,
                    col: colIndex,
                    index: visibleIndex,
                    sequence: location === 'tableau' && colIndex !== null ? 
                        this.getDraggableSequence(colIndex, visibleIndex) : null
                };
                
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', e.target.getAttribute('data-card-id'));
                
                setTimeout(() => {
                    if (this.dragSource.sequence && this.dragSource.sequence.length > 1) {
                        this.highlightSequence(this.dragSource.sequence);
                    } else {
                        e.target.style.opacity = '0.4';
                    }
                }, 0);
            }
        });

        document.addEventListener('dragend', (e) => {
            if (this.draggedCard) {
                if (this.dragSource.sequence) {
                    this.removeSequenceHighlight(this.dragSource.sequence);
                } else {
                    this.draggedCard.style.opacity = '1';
                }
                this.draggedCard = null;
                this.dragSource = null;
            }
            if (dragOverElement) {
                dragOverElement.classList.remove('drag-over');
                dragOverElement = null;
            }
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            const target = e.target.closest('.tableau-column') || 
                          e.target.closest('.foundation');
            
            if (target && target !== dragOverElement) {
                if (dragOverElement) {
                    dragOverElement.classList.remove('drag-over');
                }
                dragOverElement = target;
                target.classList.add('drag-over');
            }
        });

        document.addEventListener('dragleave', (e) => {
            const target = e.target.closest('.tableau-column') || 
                          e.target.closest('.foundation');
            
            if (target && target === dragOverElement) {
                if (!target.contains(e.relatedTarget)) {
                    target.classList.remove('drag-over');
                    dragOverElement = null;
                }
            }
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            
            if (dragOverElement) {
                dragOverElement.classList.remove('drag-over');
                dragOverElement = null;
            }
            
            if (!this.draggedCard || !this.dragSource) return;

            const target = e.target.closest('.tableau-column') || 
                          e.target.closest('.foundation');
            
            if (!target) return;

            if (target.classList.contains('tableau-column')) {
                const toCol = parseInt(target.getAttribute('data-col'));
                this.handleTableauDrop(toCol);
            } else if (target.classList.contains('foundation')) {
                this.handleFoundationDrop();
            }

            this.draggedCard = null;
            this.dragSource = null;
        });
    }

    getDraggableSequence(fromCol, cardIndex) {
        const sourceArray = this.tableau[fromCol].toArray();
        if (cardIndex < 0 || cardIndex >= sourceArray.length) return null;
        
        const potentialSequence = sourceArray.slice(cardIndex);
        if (this.isValidCardSequence(potentialSequence)) {
            return potentialSequence;
        }
        
        return [sourceArray[cardIndex]];
    }

    highlightSequence(sequence) {
        sequence.forEach(card => {
            const cardEl = document.querySelector(`[data-card-id="${card.id}"]`);
            if (cardEl) {
                cardEl.style.opacity = '0.6';
                cardEl.style.boxShadow = '0 0 10px gold';
            }
        });
    }

    removeSequenceHighlight(sequence) {
        sequence.forEach(card => {
            const cardEl = document.querySelector(`[data-card-id="${card.id}"]`);
            if (cardEl) {
                cardEl.style.opacity = '1';
                cardEl.style.boxShadow = '';
            }
        });
    }

    handleTableauDrop(toCol) {
        const sourceLocation = this.dragSource.location;

        if (sourceLocation === 'tableau') {
            const fromCol = this.dragSource.col;
            if (this.dragSource.sequence && this.dragSource.sequence.length > 0) {
                const sourceArray = this.tableau[fromCol].toArray();
                const firstCardInSequence = this.dragSource.sequence[0];
                const cardIndex = sourceArray.findIndex(card => card.id === firstCardInSequence.id);
                if (cardIndex !== -1) {
                    this.moveTableauToTableau(fromCol, cardIndex, toCol);
                }
            } else {
                const sourceArray = this.tableau[fromCol].toArray();
                const cardIndex = sourceArray.findIndex(card => card.id === this.draggedCard.getAttribute('data-card-id'));
                if (cardIndex !== -1) {
                    this.moveTableauToTableau(fromCol, cardIndex, toCol);
                }
            }
        } else if (sourceLocation === 'waste') {
            this.moveWasteCardToTableau(this.dragSource.index, toCol);
        }
    }

    handleFoundationDrop() {
        const sourceLocation = this.dragSource.location;

        if (sourceLocation === 'tableau') {
            const fromCol = this.dragSource.col;
            this.moveTableauToFoundation(fromCol);
        } else if (sourceLocation === 'waste') {
            this.moveWasteCardToFoundation(this.dragSource.index);
        }
    }

    // Game management methods
    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            document.getElementById('timer').textContent = `${minutes}:${seconds}`;
        }, 1000);
    }

    calculateScore() {
        const elapsedSeconds = (Date.now() - this.startTime) / 1000;
        let score = 1000;
        score -= this.moveCount * 2;
        score -= Math.floor(elapsedSeconds / 10);
        
        let foundationCards = 0;
        for (const suit of this.SUITS) {
            foundationCards += this.foundations[suit].size();
        }
        score += foundationCards * 50;
        
        this.score = Math.max(100, Math.floor(score));
        return this.score;
    }

    // MODIFIED: Update stats to show recycle count
    updateStats() {
        document.getElementById('moveCount').textContent = this.moveCount;
        document.getElementById('score').textContent = this.calculateScore();
        
        // Optional: Show recycle count in UI for player awareness
        let recycleCounter = document.getElementById('recycleCounter');
        if (!recycleCounter) {
            // Create recycle counter display if it doesn't exist
            const statsContainer = document.querySelector('.game-stats');
            if (statsContainer) {
                recycleCounter = document.createElement('div');
                recycleCounter.id = 'recycleCounter';
                recycleCounter.className = 'stat-item';
                recycleCounter.innerHTML = `
                    <span class="stat-label">Stock Cycles:</span>
                    <span class="stat-value">${this.stockRecycleCount}/${this.maxStockRecycles}</span>
                `;
                statsContainer.appendChild(recycleCounter);
            }
        } else {
            recycleCounter.innerHTML = `
                <span class="stat-label">Stock Cycles:</span>
                <span class="stat-value">${this.stockRecycleCount}/${this.maxStockRecycles}</span>
            `;
        }
    }

    updateUndoRedoButtons() {
        document.getElementById('undoBtn').disabled = !this.moveHistory.canUndo();
        document.getElementById('redoBtn').disabled = !this.moveHistory.canRedo();
    }

    checkWinCondition() {
        for (const suit of this.SUITS) {
            if (this.foundations[suit].size() !== 13) {
                return false;
            }
        }
        
        this.showWinMessage();
        return true;
    }

    showWinMessage() {
        clearInterval(this.timerInterval);
        clearInterval(this.moveCheckInterval);
        document.getElementById('finalMoves').textContent = this.moveCount;
        document.getElementById('finalTime').textContent = document.getElementById('timer').textContent;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('winMessage').classList.remove('hidden');
    }

    showHint() {
        document.getElementById('hintText').textContent = "💡 TIP: Look for Aces to start foundations. Move Kings to empty columns. You can drag sequences of cards! If stuck, the game will notify you.";
        document.getElementById('hintMessage').classList.remove('hidden');
        
        // Auto-hide hint after 5 seconds
        setTimeout(() => {
            this.hideHint();
        }, 5000);
    }

    hideHint() {
        document.getElementById('hintMessage').classList.add('hidden');
    }

    // MODIFIED: New game to reset recycle counter
    newGame() {
        clearInterval(this.timerInterval);
        clearInterval(this.moveCheckInterval);
        this.moveHistory.clear();
        
        this.stock = [];
        this.waste = [];
        this.foundations = {
            'hearts': new Stack(),
            'diamonds': new Stack(),
            'clubs': new Stack(),
            'spades': new Stack()
        };
        this.tableau = [
            new LinkedList(), new LinkedList(), new LinkedList(),
            new LinkedList(), new LinkedList(), new LinkedList(),
            new LinkedList()
        ];
        
        this.moveCount = 0;
        this.score = 0;
        this.startTime = Date.now();
        this.consecutiveNoMoves = 0;
        this.stockRecycleCount = 0; // NEW: Reset recycle counter
        
        this.initializeGame();
        
        // Hide all messages
        document.getElementById('winMessage').classList.add('hidden');
        document.getElementById('hintMessage').classList.add('hidden');
        const outOfMovesEl = document.getElementById('outOfMovesMessage');
        if (outOfMovesEl) outOfMovesEl.remove();
        const recycleLimitEl = document.getElementById('stockRecycleLimitMessage');
        if (recycleLimitEl) recycleLimitEl.remove();
        
        this.startTimer();
        this.startMoveChecker();
    }

    setupEventListeners() {
        document.getElementById('newGame').addEventListener('click', () => this.newGame());
        document.getElementById('drawCard').addEventListener('click', () => this.drawCard());
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('playAgain').addEventListener('click', () => this.newGame());
        document.getElementById('closeHint').addEventListener('click', () => this.hideHint());
    }

    saveGameState() {
        // Called automatically when moves are recorded
    }
}

// Start the game
document.addEventListener('DOMContentLoaded', () => {
    new SolitaireGame();
});