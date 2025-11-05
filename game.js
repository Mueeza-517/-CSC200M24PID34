// game.js 
class SolitaireGame {
    constructor() {
        this.SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
        this.RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.RANK_VALUES = {
            'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
            '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
        };

        // Custom Data Structures
        this.stock = new Stack();
        this.waste = new Stack();
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

        // USING QUEUE for recent moves display
        this.recentMovesQueue = new Queue(); // Queue to track recent moves for display

        this.moveCount = 0;
        this.score = 0;
        this.startTime = Date.now();
        this.timerInterval = null;
        this.draggedCard = null;
        this.dragSource = null;
        this.consecutiveNoMoves = 0;
        this.moveCheckInterval = null;

        // Stock recycle counter
        this.stockRecycleCount = 0;
        this.maxStockRecycles = 5;

        // Track if event listeners are already set up
        this.eventListenersSetup = false;

        // Show instructions first, then initialize game
        this.showInstructions();
    }

    initializeGame() {
        console.log("🎮 Starting Solitaire Game...");

        // Create and shuffle deck using custom structures
        const deck = this.createDeck();
        this.shuffleDeck(deck);

        // Deal to tableau with ORIGINAL STAIR PATTERN
        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                if (!deck.isEmpty()) {
                    const card = deck.pop();
                    // ONLY the top card (last card) in each column is face up
                    card.face_up = (row === col);
                    this.tableau[col].append(card);
                }
            }
        }

        // Remaining cards go to stock
        while (!deck.isEmpty()) {
            this.stock.push(deck.pop());
        }

        // Reset recycle counter
        this.stockRecycleCount = 0;

        // Initialize recent moves queue
        this.recentMovesQueue.clear();
        this.addRecentMove("Game started");

        this.saveGameState();
        this.renderGame();
        this.updateStats();

        // Setup event listeners and start game features
        this.setupEventListeners();
        this.startTimer();
        this.setupDragAndDrop();
        this.startMoveChecker();
    }

    // USING QUEUE: Add recent move to queue and maintain only last 5 moves
    addRecentMove(moveDescription) {
        this.recentMovesQueue.enqueue({
            timestamp: new Date().toLocaleTimeString(),
            description: moveDescription
        });

        // Keep only the last 5 moves in the queue
        while (this.recentMovesQueue.size() > 5) {
            this.recentMovesQueue.dequeue();
        }
    }

    // USING QUEUE: Get recent moves for display
    getRecentMoves() {
        const movesArray = [];
        const queueItems = this.recentMovesQueue.toArray();
        
        for (let key in queueItems) {
            if (queueItems.hasOwnProperty(key)) {
                movesArray.push(queueItems[key]);
            }
        }
        
        return movesArray;
    }

    createDeck() {
        // Deck is creating
        const deck = new Stack();
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
        // Convert stack to array for shuffling, then back to stack
        const tempArray = [];
        while (!deck.isEmpty()) {
            tempArray.push(deck.pop());
        }

        // Shuffle the array
        for (let i = tempArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tempArray[i], tempArray[j]] = [tempArray[j], tempArray[i]];
        }

        // Push back to stack in shuffled order
        for (let i = 0; i < tempArray.length; i++) {
            deck.push(tempArray[i]);
        }
    }

    // Show instructions in the hint message box before game starts
    showInstructions() {
        // Hide the close button for instructions
        document.getElementById('closeHint').style.display = 'none';

        // Use the existing hint message box to show instructions
        document.getElementById('hintText').innerHTML = `
            <div style="text-align: center; max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <h2 style="color: #2E7D32; margin-bottom: 25px; font-size: 28px;">🎮 Welcome to Solitaire!</h2>
                
                <div style="margin-bottom: 20px; text-align: left; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <h3 style="color: #1565C0; margin-bottom: 10px; font-size: 18px;">🎯 Game Objective:</h3>
                    <p style="margin: 5px 0; font-size: 15px;">Build all four foundations up from Ace to King, sorted by suit.</p>
                </div>

                <div style="margin-bottom: 20px; text-align: left; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <h3 style="color: #1565C0; margin-bottom: 10px; font-size: 18px;">🖱️ Mouse Controls:</h3>
                    <ul style="padding-left: 20px; margin: 5px 0; font-size: 15px;">
                        <li><strong>Click Draw Button</strong> - Draw 3 cards from stock</li>
                        <li><strong>Click Waste Cards</strong> - Auto-move to foundation or tableau</li>
                        <li><strong>Click Top Tableau Cards</strong> - Move to foundation</li>
                        <li><strong>Drag & Drop</strong> - Move cards between tableau columns</li>
                    </ul>
                </div>

                <div style="margin-bottom: 20px; text-align: left; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <h3 style="color: #1565C0; margin-bottom: 10px; font-size: 18px;">⌨️ Keyboard Shortcuts:</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px;">
                        <div><kbd style="background: #e9ecef; padding: 3px 6px; border-radius: 3px;">Space</kbd> or <kbd style="background: #e9ecef; padding: 3px 6px; border-radius: 3px;">Enter</kbd> - Draw cards</div>
                        <div><kbd style="background: #e9ecef; padding: 3px 6px; border-radius: 3px;">1-7</kbd> - Move to foundation</div>
                        <div><kbd style="background: #e9ecef; padding: 3px 6px; border-radius: 3px;">H</kbd> - Show hint</div>
                        <div><kbd style="background: #e9ecef; padding: 3px 6px; border-radius: 3px;">Ctrl+Z</kbd> - Undo move</div>
                        <div><kbd style="background: #e9ecef; padding: 3px 6px; border-radius: 3px;">Ctrl+Y</kbd> - Redo move</div>
                        <div><kbd style="background: #e9ecef; padding: 3px 6px; border-radius: 3px;">ESC</kbd> - Close messages</div>
                    </div>
                </div>

                <div style="margin-bottom: 20px; text-align: left; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <h3 style="color: #1565C0; margin-bottom: 10px; font-size: 18px;">📋 Basic Rules:</h3>
                    <ul style="padding-left: 20px; margin: 5px 0; font-size: 15px;">
                        <li>Build tableau in descending order with alternating colors</li>
                        <li>Only Kings can be placed in empty tableau columns</li>
                        <li>Foundations must start with Aces and build up sequentially</li>
                        <li>You can recycle the stock pile ${this.maxStockRecycles} times maximum</li>
                    </ul>
                </div>

                <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 2px solid #dee2e6;">
                    <button id="startGameBtn" style="padding: 15px 50px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 18px; font-weight: bold; margin-bottom: 10px;">
                        Start Playing!
                    </button>
                    <p style="margin-top: 10px; font-size: 14px; color: #666;">Press ESC to close and start playing</p>
                </div>
            </div>
        `;

        // Show the message box
        document.getElementById('hintMessage').classList.remove('hidden');

        // Add event listener to start playing button
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.startGameAfterInstructions();
        });

        // Also allow closing with ESC key to start game
        const escHandler = (e) => {
            if (e.key === 'Escape' && !document.getElementById('hintMessage').classList.contains('hidden')) {
                this.startGameAfterInstructions();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    startGameAfterInstructions() {
        // Hide the instructions
        document.getElementById('hintMessage').classList.add('hidden');

        // Show the close button again for regular hints
        document.getElementById('closeHint').style.display = 'block';

        // Initialize the game
        this.initializeGame();
    }

    // Helper methods for custom data structures
    objectToArray(obj) {
        const result = [];
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                result.push(obj[key]);
            }
        }
        return result;
    }

    iterateObject(obj, callback) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                callback(obj[key], parseInt(key));
            }
        }
    }

    iterateLinkedList(list, callback) {
        let current = list.head;
        let index = 0;
        while (current !== null) {
            callback(current.data, index);
            current = current.next;
            index++;
        }
    }

    linkedListToArray(linkedList) {
        const result = [];
        this.iterateLinkedList(linkedList, (card) => {
            result.push(card);
        });
        return result;
    }

    // Start automatic move checking
    startMoveChecker() {
        // Clear any existing interval first
        if (this.moveCheckInterval) {
            clearInterval(this.moveCheckInterval);
        }
        
        this.moveCheckInterval = setInterval(() => {
            this.checkForPossibleMoves();
        }, 10000);
    }

    checkForPossibleMoves() {
        if (this.stockRecycleCount >= this.maxStockRecycles) {
            this.showStockRecycleLimitMessage();
            return;
        }

        if (this.hasPossibleMoves()) {
            this.consecutiveNoMoves = 0;
        } else {
            this.consecutiveNoMoves++;
            if (this.consecutiveNoMoves >= 2) {
                this.showOutOfMovesMessage();
            }
        }
    }

    hasPossibleMoves() {
        if (this.stockRecycleCount >= this.maxStockRecycles) {
            return false;
        }

        if (this.hasWasteToTableauMoves()) return true;
        if (this.hasWasteToFoundationMoves()) return true;
        if (this.hasTableauToTableauMoves()) return true;
        if (this.hasTableauToFoundationMoves()) return true;

        if (!this.stock.isEmpty() || (this.stock.isEmpty() && !this.waste.isEmpty() && this.stockRecycleCount < this.maxStockRecycles)) {
            return true;
        }

        return false;
    }

    hasWasteToTableauMoves() {
        if (this.waste.isEmpty()) return false;

        const visibleWasteCards = this.getVisibleWasteCards();
        const wasteArray = this.objectToArray(visibleWasteCards);

        for (let wasteIndex = 0; wasteIndex < wasteArray.length; wasteIndex++) {
            const card = wasteArray[wasteIndex];
            for (let col = 0; col < 7; col++) {
                if (this.canMoveToTableau(card, col)) {
                    return true;
                }
            }
        }
        return false;
    }

    hasWasteToFoundationMoves() {
        if (this.waste.isEmpty()) return false;

        const visibleWasteCards = this.getVisibleWasteCards();
        const wasteArray = this.objectToArray(visibleWasteCards);

        for (let wasteIndex = 0; wasteIndex < wasteArray.length; wasteIndex++) {
            const card = wasteArray[wasteIndex];
            if (this.canMoveToFoundation(card)) {
                return true;
            }
        }
        return false;
    }

    hasTableauToTableauMoves() {
        for (let fromCol = 0; fromCol < 7; fromCol++) {
            const columnArray = this.linkedListToArray(this.tableau[fromCol]);
            for (let cardIndex = 0; cardIndex < columnArray.length; cardIndex++) {
                const card = columnArray[cardIndex];
                if (card.face_up) {
                    const sequence = columnArray.slice(cardIndex);
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

    showOutOfMovesMessage() {
        console.log("🚫 No more moves available!");

        // Use the existing hint message box
        document.getElementById('hintText').innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #d32f2f; text-align: center;">No More Moves! 🎴</h3>
            <p style="margin: 8px 0; text-align: center;">You've run out of possible moves.</p>
            <p style="margin: 8px 0; text-align: center;"><strong>Final Score:</strong> ${this.score}</p>
            <p style="margin: 8px 0; text-align: center;"><strong>Moves:</strong> ${this.moveCount}</p>
            <p style="margin: 8px 0; text-align: center;"><strong>Time:</strong> ${document.getElementById('timer').textContent}</p>
            <p style="margin: 15px 0; text-align: center; font-weight: bold; color: #4CAF50;">
                Click the "New Game" button to start a new game!
            </p>
            <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: center;">
                <button id="continueGame" style="padding: 10px 20px; background: #757575; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">Continue Anyway</button>
            </div>
        `;

        // Show the message box
        document.getElementById('hintMessage').classList.remove('hidden');

        // Use event delegation for the buttons
        const hintMessage = document.getElementById('hintMessage');

        // Remove any existing click handlers and add a new one
        hintMessage.onclick = null;
        hintMessage.addEventListener('click', (e) => {
            if (e.target.id === 'continueGame') {
                this.hideHint();
                this.consecutiveNoMoves = 0;
            }
        });

        // Don't auto-hide since user needs to make a choice
    }

    showStockRecycleLimitMessage() {
        console.log("🎴 Stock recycle limit reached");

        // Use the existing hint message box
        document.getElementById('hintText').innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #d32f2f; text-align: center;">Game Over! 🎴</h3>
            <p style="margin: 8px 0; text-align: center;">You've recycled through the stock pile ${this.stockRecycleCount} times.</p>
            <p style="margin: 8px 0; text-align: center;">The game allows maximum ${this.maxStockRecycles} full stock cycles.</p>
            <p style="margin: 8px 0; text-align: center;"><strong>Final Score:</strong> ${this.score}</p>
            <p style="margin: 8px 0; text-align: center;"><strong>Moves:</strong> ${this.moveCount}</p>
            <p style="margin: 8px 0; text-align: center;"><strong>Time:</strong> ${document.getElementById('timer').textContent}</p>
            <p style="margin: 15px 0; text-align: center; font-weight: bold; color: #4CAF50;">
                Click the "New Game" button to start a new game!
            </p>
        `;

        // Show the message box
        document.getElementById('hintMessage').classList.remove('hidden');

        clearInterval(this.timerInterval);
        clearInterval(this.moveCheckInterval);

        // Don't auto-hide since it's a game over message
    }

    drawCard() {
        console.log("🃏 Drawing cards... Stock size:", this.stock.size(), "Waste size:", this.waste.size());
        
        if (this.stockRecycleCount >= this.maxStockRecycles) {
            this.showStockRecycleLimitMessage();
            return false;
        }

        if (this.stock.isEmpty() && this.waste.isEmpty()) {
            setTimeout(() => this.checkForPossibleMoves(), 500);
            return false;
        }

        const previousState = this.getGameState();

        if (this.stock.isEmpty()) {
            console.log("🔄 Resetting stock from waste...");
            this.stockRecycleCount++;
            console.log(`📊 Stock recycle count: ${this.stockRecycleCount}/${this.maxStockRecycles}`);

            // USING QUEUE: Add stock reset to recent moves
            this.addRecentMove("Reset stock from waste");

            // FIXED: Properly reset stock from waste
            const tempArray = [];
            
            // Transfer all waste cards to temporary array
            while (!this.waste.isEmpty()) {
                const card = this.waste.pop();
                card.face_up = false; // Turn all cards face down
                tempArray.push(card);
            }
            
            // Push cards back to stock in reverse order (maintaining original order)
            for (let i = tempArray.length - 1; i >= 0; i--) {
                this.stock.push(tempArray[i]);
            }

            console.log("✅ Stock reset with", this.stock.size(), "cards");

            if (this.stockRecycleCount >= this.maxStockRecycles) {
                console.log("🚫 Maximum stock recycles reached!");
                this.showStockRecycleLimitMessage();
            } else {
                setTimeout(() => this.checkForPossibleMoves(), 500);
            }
        } else {
            // Draw THREE cards - FIXED: Properly draw exactly 3 cards
            let cardsDrawn = 0;
            const tempWaste = new Stack(); // Temporary stack to maintain order
            
            // Draw up to 3 cards from stock
            while (!this.stock.isEmpty() && cardsDrawn < 3) {
                const card = this.stock.pop();
                card.face_up = true;
                tempWaste.push(card); // Add to temporary waste first
                cardsDrawn++;
            }
            
            // Transfer from temporary waste to actual waste (to maintain correct order)
            while (!tempWaste.isEmpty()) {
                this.waste.push(tempWaste.pop());
            }
            
            this.moveCount++;
            this.consecutiveNoMoves = 0;

            // USING QUEUE: Add draw action to recent moves
            this.addRecentMove(`Drew ${cardsDrawn} card(s) from stock`);
            
            console.log("✅ Drew", cardsDrawn, "cards. Stock remaining:", this.stock.size());
        }

        this.moveHistory.recordMove('draw', previousState, {
            cardsDrawn: 3,
            stockRecycleCount: this.stockRecycleCount
        });
        this.updateStats();
        this.renderGame();
        return true;
    }

    moveWasteCardToTableau(wasteIndex, toCol) {
        if (this.stockRecycleCount >= this.maxStockRecycles) {
            return false;
        }

        const visibleWasteCards = this.getVisibleWasteCards();
        const wasteArray = this.objectToArray(visibleWasteCards);

        if (wasteIndex < 0 || wasteIndex >= wasteArray.length) return false;

        // Calculate actual index in waste stack
        const actualIndex = this.waste.size() - wasteArray.length + wasteIndex;
        if (actualIndex < 0 || actualIndex >= this.waste.size()) return false;

        // Get the card from waste
        const card = wasteArray[wasteIndex];

        if (this.canMoveToTableau(card, toCol)) {
            const previousState = this.getGameState();

            // Remove from waste - we need to reconstruct the waste without this card
            const newWaste = new Stack();
            const tempStack = new Stack();

            // Transfer to temp stack to find the card
            while (!this.waste.isEmpty()) {
                tempStack.push(this.waste.pop());
            }

            // Transfer back, skipping the card we want to remove
            let found = false;
            while (!tempStack.isEmpty()) {
                const currentCard = tempStack.pop();
                if (!found && currentCard.id === card.id) {
                    found = true;
                    // Don't push this card back
                    continue;
                }
                newWaste.push(currentCard);
            }

            this.waste = newWaste;
            this.tableau[toCol].append(card);
            this.moveCount++;
            this.consecutiveNoMoves = 0;

            // USING QUEUE: Add move to recent moves
            this.addRecentMove(`Moved ${card.rank}${this.getSuitSymbol(card.suit)} from waste to column ${toCol + 1}`);

            this.moveHistory.recordMove('waste_to_tableau', previousState, {
                toCol: toCol,
                card: card,
                wasteIndex: actualIndex
            });
            this.updateStats();
            this.renderGame();

            setTimeout(() => this.checkForPossibleMoves(), 100);
            return true;
        }
        return false;
    }

    moveWasteCardToFoundation(wasteIndex) {
        if (this.stockRecycleCount >= this.maxStockRecycles) {
            return false;
        }

        const visibleWasteCards = this.getVisibleWasteCards();
        const wasteArray = this.objectToArray(visibleWasteCards);

        if (wasteIndex < 0 || wasteIndex >= wasteArray.length) return false;

        const card = wasteArray[wasteIndex];

        if (this.canMoveToFoundation(card)) {
            const previousState = this.getGameState();

            // Remove from waste
            const newWaste = new Stack();
            const tempStack = new Stack();

            while (!this.waste.isEmpty()) {
                tempStack.push(this.waste.pop());
            }

            let found = false;
            while (!tempStack.isEmpty()) {
                const currentCard = tempStack.pop();
                if (!found && currentCard.id === card.id) {
                    found = true;
                    continue;
                }
                newWaste.push(currentCard);
            }

            this.waste = newWaste;
            this.foundations[card.suit].push(card);
            this.moveCount++;
            this.consecutiveNoMoves = 0;

            // USING QUEUE: Add move to recent moves
            this.addRecentMove(`Moved ${card.rank}${this.getSuitSymbol(card.suit)} from waste to ${card.suit} foundation`);

            this.moveHistory.recordMove('waste_to_foundation', previousState, {
                card: card,
                wasteIndex: wasteIndex
            });
            this.updateStats();
            this.renderGame();

            this.checkWinCondition();
            setTimeout(() => this.checkForPossibleMoves(), 100);
            return true;
        }
        return false;
    }

    getVisibleWasteCards() {
        // Show last 3 cards from waste stack
        const result = {};
        const tempStack = new Stack();
        let count = 0;
        let index = 0;

        // Transfer to temp stack to see the cards
        while (!this.waste.isEmpty() && count < 3) {
            const card = this.waste.pop();
            tempStack.push(card);
            result[index] = card;
            index++;
            count++;
        }

        // Put cards back
        while (!tempStack.isEmpty()) {
            this.waste.push(tempStack.pop());
        }

        return result;
    }

    moveTableauToFoundation(fromCol) {
        if (this.stockRecycleCount >= this.maxStockRecycles) {
            return false;
        }

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

            // USING QUEUE: Add move to recent moves
            this.addRecentMove(`Moved ${movedCard.rank}${this.getSuitSymbol(movedCard.suit)} from column ${fromCol + 1} to ${movedCard.suit} foundation`);

            this.moveHistory.recordMove('tableau_to_foundation', previousState, {
                fromCol: fromCol,
                card: movedCard
            });
            this.updateStats();
            this.renderGame();

            this.checkWinCondition();
            setTimeout(() => this.checkForPossibleMoves(), 100);
            return true;
        }
        return false;
    }

    moveTableauToTableau(fromCol, cardIndex, toCol) {
        if (this.stockRecycleCount >= this.maxStockRecycles) {
            return false;
        }

        if (fromCol < 0 || fromCol > 6 || toCol < 0 || toCol > 6) return false;
        if (this.tableau[fromCol].isEmpty()) return false;

        const sourceArray = this.linkedListToArray(this.tableau[fromCol]);
        if (cardIndex < 0 || cardIndex >= sourceArray.length) return false;

        const movingCards = sourceArray.slice(cardIndex);
        const allFaceUp = movingCards.every(card => card.face_up);
        if (!allFaceUp) return false;

        const isValidSequence = this.isValidCardSequence(movingCards);
        if (!isValidSequence) return false;

        const movingCard = movingCards[0];
        if (!this.canMoveToTableau(movingCard, toCol)) return false;

        const previousState = this.getGameState();

        // Remove cards from source using linked list operations
        const remainingCards = sourceArray.slice(0, cardIndex);
        this.tableau[fromCol] = new LinkedList();
        remainingCards.forEach(card => this.tableau[fromCol].append(card));

        // Add cards to target
        movingCards.forEach(card => {
            this.tableau[toCol].append(card);
        });

        if (!this.tableau[fromCol].isEmpty()) {
            const newTopCard = this.tableau[fromCol].getLast();
            newTopCard.face_up = true;
        }

        this.moveCount++;
        this.consecutiveNoMoves = 0;

        // USING QUEUE: Add move to recent moves
        const cardCount = movingCards.length;
        this.addRecentMove(`Moved ${cardCount} card(s) from column ${fromCol + 1} to column ${toCol + 1}`);

        this.moveHistory.recordMove('tableau_to_tableau', previousState, {
            fromCol: fromCol,
            toCol: toCol,
            cardIndex: cardIndex,
            movedCards: movingCards
        });
        this.updateStats();
        this.renderGame();

        setTimeout(() => this.checkForPossibleMoves(), 100);
        return true;
    }

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

    undo() {
        const move = this.moveHistory.undo();
        if (move) {
            this.restoreGameState(move.gameState);
            
            // USING QUEUE: Add undo to recent moves
            this.addRecentMove("Undid last move");
            
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
            
            // USING QUEUE: Add redo to recent moves
            this.addRecentMove("Redid move");
            
            this.updateStats();
            this.renderGame();
            return true;
        }
        return false;
    }

    getGameState() {
        // Convert all custom structures to plain objects for serialization
        const foundationsState = {};
        for (const suit in this.foundations) {
            foundationsState[suit] = this.objectToArray(this.foundations[suit].toArray());
        }

        const tableauState = [];
        for (let i = 0; i < this.tableau.length; i++) {
            tableauState.push(this.linkedListToArray(this.tableau[i]));
        }

        return {
            stock: this.objectToArray(this.stock.toArray()),
            waste: this.objectToArray(this.waste.toArray()),
            foundations: foundationsState,
            tableau: tableauState,
            moveCount: this.moveCount,
            score: this.score,
            stockRecycleCount: this.stockRecycleCount,
            recentMoves: this.getRecentMoves() // Include recent moves in game state
        };
    }

    restoreGameState(state) {
        // Restore stock
        this.stock = new Stack();
        state.stock.forEach(card => this.stock.push(card));

        // Restore waste
        this.waste = new Stack();
        state.waste.forEach(card => this.waste.push(card));

        // Restore foundations
        for (const suit in this.foundations) {
            this.foundations[suit].clear();
            state.foundations[suit].forEach(card => this.foundations[suit].push(card));
        }

        // Restore tableau
        for (let i = 0; i < this.tableau.length; i++) {
            this.tableau[i] = new LinkedList();
            state.tableau[i].forEach(card => this.tableau[i].append(card));
        }

        this.moveCount = state.moveCount;
        this.score = state.score;
        this.stockRecycleCount = state.stockRecycleCount || 0;

        // Restore recent moves queue
        if (state.recentMoves) {
            this.recentMovesQueue.clear();
            state.recentMoves.forEach(move => this.recentMovesQueue.enqueue(move));
        }
    }

    renderGame() {
        // Reset all card styles first to ensure no dim cards
        const allCards = document.querySelectorAll('.card');
        allCards.forEach(card => {
            card.style.opacity = '1';
            card.style.boxShadow = '';
            card.style.transform = '';
        });

        this.renderStockAndWaste();
        this.renderFoundations();
        this.renderTableau();
        this.updateUndoRedoButtons();
        this.renderRecentMoves(); // Render recent moves display
    }

    // USING QUEUE: Render recent moves display
    renderRecentMoves() {
        let recentMovesContainer = document.getElementById('recentMoves');
        if (!recentMovesContainer) {
            // Create recent moves container if it doesn't exist
            const gameContainer = document.querySelector('.game-container');
            if (gameContainer) {
                recentMovesContainer = document.createElement('div');
                recentMovesContainer.id = 'recentMoves';
                recentMovesContainer.className = 'recent-moves';
                recentMovesContainer.innerHTML = `
                    <h3>Recent Moves</h3>
                    <div id="recentMovesList"></div>
                `;
                gameContainer.appendChild(recentMovesContainer);
            } else {
                return;
            }
        }

        const recentMovesList = document.getElementById('recentMovesList');
        const moves = this.getRecentMoves();
        
        if (moves.length === 0) {
            recentMovesList.innerHTML = '<p style="color: #666; font-style: italic;">No recent moves</p>';
        } else {
            recentMovesList.innerHTML = moves.map(move => 
                `<div class="recent-move-item">
                    <span class="move-time">${move.timestamp}</span>
                    <span class="move-desc">${move.description}</span>
                </div>`
            ).join('');
        }
    }

    renderStockAndWaste() {
        const stock = document.getElementById('stock');
        const waste = document.getElementById('waste');

        stock.innerHTML = '';
        waste.innerHTML = '';

        if (!this.stock.isEmpty()) {
            const stackSize = Math.min(3, this.stock.size());
            let stackHTML = '<div class="card-stack">';
            for (let i = 0; i < stackSize; i++) {
                stackHTML += '<div class="card back animated-card"></div>';
            }
            stackHTML += '</div>';
            stock.innerHTML = stackHTML;
        }

        const visibleWasteCards = this.getVisibleWasteCards();
        const wasteArray = this.objectToArray(visibleWasteCards);

        if (wasteArray.length > 0) {
            wasteArray.forEach((card, visibleIndex) => {
                const cardEl = this.createCardElement(card, 'waste', visibleIndex);
                const offset = visibleIndex * 25;
                cardEl.style.transform = `translateX(${offset}px)`;
                cardEl.style.zIndex = visibleIndex;

                cardEl.setAttribute('draggable', 'true');
                cardEl.classList.add('accessible-card');
                cardEl.style.cursor = 'pointer';

                waste.appendChild(cardEl);
            });

            if (this.waste.size() > 3) {
                const countIndicator = document.createElement('div');
                countIndicator.className = 'waste-count-indicator';
                countIndicator.textContent = `+${this.waste.size() - 3} more`;
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
        // Only the draw button should draw cards
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

            const cards = this.linkedListToArray(column);
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
                const cards = this.linkedListToArray(this.tableau[colIndex]);
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

                // NO OPACITY CHANGE - Cards will not become dim during drag
                setTimeout(() => {
                    if (this.dragSource.sequence && this.dragSource.sequence.length > 1) {
                        this.highlightSequence(this.dragSource.sequence);
                    }
                }, 0);
            }
        });

        document.addEventListener('dragend', (e) => {
            if (this.draggedCard) {
                // Reset ALL card styles
                const allCards = document.querySelectorAll('.card');
                allCards.forEach(card => {
                    card.style.opacity = '1';
                    card.style.boxShadow = '';
                });

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
        const sourceArray = this.linkedListToArray(this.tableau[fromCol]);
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
                // Only add shadow, no opacity change
                cardEl.style.boxShadow = '0 0 15px gold';
            }
        });
    }

    removeSequenceHighlight(sequence) {
        sequence.forEach(card => {
            const cardEl = document.querySelector(`[data-card-id="${card.id}"]`);
            if (cardEl) {
                cardEl.style.boxShadow = '';
            }
        });
    }

    handleTableauDrop(toCol) {
        const sourceLocation = this.dragSource.location;

        if (sourceLocation === 'tableau') {
            const fromCol = this.dragSource.col;
            if (this.dragSource.sequence && this.dragSource.sequence.length > 0) {
                const sourceArray = this.linkedListToArray(this.tableau[fromCol]);
                const firstCardInSequence = this.dragSource.sequence[0];
                const cardIndex = sourceArray.findIndex(card => card.id === firstCardInSequence.id);
                if (cardIndex !== -1) {
                    this.moveTableauToTableau(fromCol, cardIndex, toCol);
                }
            } else {
                const sourceArray = this.linkedListToArray(this.tableau[fromCol]);
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

    startTimer() {
        // Clear any existing timer first
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
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

    updateStats() {
        document.getElementById('moveCount').textContent = this.moveCount;
        document.getElementById('score').textContent = this.calculateScore();

        let recycleCounter = document.getElementById('recycleCounter');
        if (!recycleCounter) {
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
        console.log("🔍 Checking win condition...");

        let totalCards = 0;
        for (const suit of this.SUITS) {
            const foundationSize = this.foundations[suit].size();
            console.log(`Foundation ${suit}: ${foundationSize} cards`);
            totalCards += foundationSize;

            if (foundationSize !== 13) {
                console.log(`❌ Foundation ${suit} is not complete (${foundationSize}/13)`);
                return false;
            }
        }

        console.log(`🎉 ALL FOUNDATIONS COMPLETE! Total cards: ${totalCards}/52`);
        this.showWinMessage();
        return true;
    }

    showWinMessage() {
        console.log("🏆 showWinMessage() called!");

        clearInterval(this.timerInterval);
        clearInterval(this.moveCheckInterval);

        // USING QUEUE: Add win to recent moves
        this.addRecentMove("🎉 Game Won!");

        // Use the hint message box instead of winMessage
        document.getElementById('hintText').innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 4em; margin-bottom: 20px;">🎉</div>
            <h2 style="font-size: 2em; margin: 0 0 15px 0; color: #2E7D32;">Congratulations!</h2>
            <p style="font-size: 1.2em; margin: 0 0 25px 0; color: #666;">You've won the game!</p>
            
            <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: center;">
                    <div>
                        <div style="font-size: 1em; color: #666;">Final Score</div>
                        <div style="font-size: 2em; font-weight: bold; color: #FF6B6B;">${this.score}</div>
                    </div>
                    <div>
                        <div style="font-size: 1em; color: #666;">Total Moves</div>
                        <div style="font-size: 2em; font-weight: bold; color: #4CAF50;">${this.moveCount}</div>
                    </div>
                </div>
                <div style="margin-top: 15px; font-size: 1.1em;">
                    <div style="color: #666;">Time Completed</div>
                    <div style="font-size: 1.3em; font-weight: bold; color: #2196F3;">${document.getElementById('timer').textContent}</div>
                </div>
            </div>

            <p style="margin: 20px 0; text-align: center; font-weight: bold; color: #4CAF50;">
                Click the "New Game" button to play again!
            </p>
            
            <div style="margin-top: 20px;">
                <button id="closeWinHint" style="padding: 10px 30px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold;">
                    Continue
                </button>
            </div>
        </div>
    `;

        // Show the win message in the hint box
        document.getElementById('hintMessage').classList.remove('hidden');

        // Add event listener to close button
        document.getElementById('closeWinHint').addEventListener('click', () => {
            this.hideHint();
        });

        console.log("✅ Win message displayed in hint box");
    }

    showHint() {
        document.getElementById('hintText').innerHTML = `
            <div style="text-align: center;">
                <strong style="display: block; margin-bottom: 15px; font-size: 1.2em; color: #333;">Game Tips & Shortcuts</strong>
                <div style="text-align: left; display: inline-block; background: #f8f9fa; padding: 15px; border-radius: 10px; margin: 10px 0;">
                    • Look for Aces to start foundations<br>
                    • Move Kings to empty columns<br>
                    • You can drag sequences of cards!<br>
                    • If stuck, the game will notify you
                </div>
                <br>
                <div style="text-align: left; display: inline-block; background: #e3f2fd; padding: 15px; border-radius: 10px; margin: 10px 0;">
                    • <kbd>Space</kbd> or <kbd>Enter</kbd> - Draw cards<br>
                    • <kbd>1-7</kbd> - Move top tableau card to foundation<br>
                    • <kbd>H</kbd> - Show hint<br>
                    • <kbd>Ctrl+Z</kbd> - Undo move<br>
                    • <kbd>Ctrl+Y</kbd> - Redo move<br>
                </div>
            </div>
        `;
        document.getElementById('hintMessage').classList.remove('hidden');

        setTimeout(() => {
            this.hideHint();
        }, 8000);
    }

    hideHint() {
        document.getElementById('hintMessage').classList.add('hidden');
    }

    newGame() {
        console.log("🔄 Starting new game...");
        
        // Clear all intervals
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.moveCheckInterval) {
            clearInterval(this.moveCheckInterval);
            this.moveCheckInterval = null;
        }
        
        this.moveHistory.clear();
        this.recentMovesQueue.clear(); // Clear the queue for new game

        // Reset all game state properly
        this.stock = new Stack();
        this.waste = new Stack();
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
        this.stockRecycleCount = 0;

        // Reset event listeners flag
        this.eventListenersSetup = false;

        // Hide any open messages
        this.hideHint();
        const winMessage = document.getElementById('winMessage');
        if (winMessage && !winMessage.classList.contains('hidden')) {
            winMessage.classList.add('hidden');
        }

        // Show instructions again for new game
        this.showInstructions();
    }

    setupEventListeners() {
        // Only setup event listeners once
        if (this.eventListenersSetup) {
            return;
        }

        console.log("🔧 Setting up event listeners...");

        // Remove any existing event listeners first by cloning and replacing
        const newGameBtn = document.getElementById('newGame');
        const drawCardBtn = document.getElementById('drawCard');
        const hintBtn = document.getElementById('hintBtn');
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        const closeHintBtn = document.getElementById('closeHint');

        // Clone and replace buttons to remove all existing event listeners
        const newNewGameBtn = newGameBtn.cloneNode(true);
        const newDrawCardBtn = drawCardBtn.cloneNode(true);
        const newHintBtn = hintBtn.cloneNode(true);
        const newUndoBtn = undoBtn.cloneNode(true);
        const newRedoBtn = redoBtn.cloneNode(true);
        const newCloseHintBtn = closeHintBtn.cloneNode(true);

        newGameBtn.parentNode.replaceChild(newNewGameBtn, newGameBtn);
        drawCardBtn.parentNode.replaceChild(newDrawCardBtn, drawCardBtn);
        hintBtn.parentNode.replaceChild(newHintBtn, hintBtn);
        undoBtn.parentNode.replaceChild(newUndoBtn, undoBtn);
        redoBtn.parentNode.replaceChild(newRedoBtn, redoBtn);
        closeHintBtn.parentNode.replaceChild(newCloseHintBtn, closeHintBtn);

        // Add fresh event listeners
        newNewGameBtn.addEventListener('click', () => this.newGame());
        newDrawCardBtn.addEventListener('click', () => this.drawCard());
        newHintBtn.addEventListener('click', () => this.showHint());
        newUndoBtn.addEventListener('click', () => this.undo());
        newRedoBtn.addEventListener('click', () => this.redo());
        newCloseHintBtn.addEventListener('click', () => this.hideHint());

        // Add keyboard shortcuts (only once)
        this.setupKeyboardShortcuts();

        this.eventListenersSetup = true;
        console.log("✅ Event listeners setup complete");
    }

    setupKeyboardShortcuts() {
        // Remove any existing keyboard event listeners
        document.removeEventListener('keydown', this.keyboardHandler);
        
        // Create new keyboard handler
        this.keyboardHandler = (e) => {
            // Don't trigger shortcuts if user is typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Space or Enter: Draw Card
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                this.drawCard();
            }

            // H: Hint
            if (e.key === 'h' || e.key === 'H') {
                e.preventDefault();
                this.showHint();
            }

            // Ctrl/Cmd + Z: Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }

            // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z: Redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.redo();
            }

            // Escape: Close any open messages
            if (e.key === 'Escape') {
                this.hideHint();
                const winMessage = document.getElementById('winMessage');
                if (winMessage && !winMessage.classList.contains('hidden')) {
                    winMessage.classList.add('hidden');
                }
            }

            // Number keys 1-7: Auto-move to foundation from tableau columns
            if (e.key >= '1' && e.key <= '7') {
                e.preventDefault();
                const colIndex = parseInt(e.key) - 1;
                this.moveTableauToFoundation(colIndex);
            }
        };

        // Add the new keyboard handler
        document.addEventListener('keydown', this.keyboardHandler);
    }

    saveGameState() {
        // Called automatically when moves are recorded
    }
}

// Start the game
document.addEventListener('DOMContentLoaded', () => {
    window.solitaireGame = new SolitaireGame();
});