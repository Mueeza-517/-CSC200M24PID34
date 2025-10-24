// custom_structures.js - Fixed Custom Data Structures
class Stack {
    constructor() {
        this.items = [];
    }
    
    push(item) {
        this.items.push(item);
    }
    
    pop() {
        if (this.isEmpty()) return null;
        return this.items.pop();
    }
    
    peek() {
        if (this.isEmpty()) return null;
        return this.items[this.items.length - 1];
    }
    
    isEmpty() {
        return this.items.length === 0;
    }
    
    size() {
        return this.items.length;
    }
    
    toArray() {
        return [...this.items];
    }
    
    clear() {
        this.items = [];
    }
}

class Queue {
    constructor() {
        this.items = [];
    }
    
    enqueue(item) {
        this.items.push(item);
    }
    
    dequeue() {
        if (this.isEmpty()) return null;
        return this.items.shift();
    }
    
    front() {
        if (this.isEmpty()) return null;
        return this.items[0];
    }
    
    isEmpty() {
        return this.items.length === 0;
    }
    
    size() {
        return this.items.length;
    }
    
    toArray() {
        return [...this.items];
    }
    
    clear() {
        this.items = [];
    }
}

class LinkedList {
    constructor() {
        this.items = [];
    }
    
    append(data) {
        this.items.push(data);
    }
    
    removeLast() {
        if (this.isEmpty()) return null;
        return this.items.pop();
    }
    
    getLast() {
        if (this.isEmpty()) return null;
        return this.items[this.items.length - 1];
    }
    
    getAtIndex(index) {
        if (index < 0 || index >= this.items.length) return null;
        return this.items[index];
    }
    
    toArray() {
        return [...this.items];
    }
    
    size() {
        return this.items.length;
    }
    
    isEmpty() {
        return this.items.length === 0;
    }
    
    slice(start, end) {
        return this.items.slice(start, end);
    }
    
    splice(start, deleteCount, ...items) {
        return this.items.splice(start, deleteCount, ...items);
    }
}

class MoveHistory {
    constructor() {
        this.undoStack = new Stack();
        this.redoStack = new Stack();
    }
    
    recordMove(moveType, gameState, moveData = {}) {
        const move = {
            type: moveType,
            data: moveData,
            gameState: JSON.parse(JSON.stringify(gameState)),
            timestamp: Date.now()
        };
        this.undoStack.push(move);
        this.redoStack.clear();
    }
    
    undo() {
        if (this.undoStack.isEmpty()) return null;
        
        const move = this.undoStack.pop();
        this.redoStack.push(move);
        return move;
    }
    
    redo() {
        if (this.redoStack.isEmpty()) return null;
        
        const move = this.redoStack.pop();
        this.undoStack.push(move);
        return move;
    }
    
    canUndo() {
        return !this.undoStack.isEmpty();
    }
    
    canRedo() {
        return !this.redoStack.isEmpty();
    }
    
    clear() {
        this.undoStack.clear();
        this.redoStack.clear();
    }
}