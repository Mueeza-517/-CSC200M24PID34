// custom_structures.js 
class Stack {
    constructor() {
        this.items = {};
        this.top = -1;
    }
    
    push(item) {
        this.top++;
        this.items[this.top] = item;
    }
    
    pop() {
        if (this.isEmpty()) return null;
        const item = this.items[this.top];
        delete this.items[this.top];
        this.top--;
        return item;
    }
    
    peek() {
        if (this.isEmpty()) return null;
        return this.items[this.top];
    }
    
    isEmpty() {
        return this.top === -1;
    }
    
    size() {
        return this.top + 1;
    }
    
    toArray() {
        const result = {};
        for (let i = 0; i <= this.top; i++) {
            result[i] = this.items[i];
        }
        return result;
    }
    
    clear() {
        this.items = {};
        this.top = -1;
    }
}

class Queue {
    constructor() {
        this.items = {};
        this.front = 0;
        this.rear = -1;
        this.sizeCount = 0;
    }
    
    enqueue(item) {
        this.rear++;
        this.items[this.rear] = item;
        this.sizeCount++;
    }
    
    dequeue() {
        if (this.isEmpty()) return null;
        const item = this.items[this.front];
        delete this.items[this.front];
        this.front++;
        this.sizeCount--;
        return item;
    }
    
    frontItem() {
        if (this.isEmpty()) return null;
        return this.items[this.front];
    }
    
    isEmpty() {
        return this.sizeCount === 0;
    }
    
    size() {
        return this.sizeCount;
    }
    
    toArray() {
        const result = {};
        let index = 0;
        for (let i = this.front; i <= this.rear; i++) {
            result[index] = this.items[i];
            index++;
        }
        return result;
    }
    
    clear() {
        this.items = {};
        this.front = 0;
        this.rear = -1;
        this.sizeCount = 0;
    }
}

class LinkedList {
    constructor() {
        this.head = null;
        this.tail = null;
        this.length = 0;
    }
    
    append(data) {
        const newNode = { data: data, next: null };
        
        if (this.isEmpty()) {
            this.head = newNode;
            this.tail = newNode;
        } else {
            this.tail.next = newNode;
            this.tail = newNode;
        }
        this.length++;
    }
    
    removeLast() {
        if (this.isEmpty()) return null;
        
        if (this.length === 1) {
            const data = this.head.data;
            this.head = null;
            this.tail = null;
            this.length = 0;
            return data;
        }
        
        let current = this.head;
        while (current.next !== this.tail) {
            current = current.next;
        }
        
        const data = this.tail.data;
        this.tail = current;
        this.tail.next = null;
        this.length--;
        return data;
    }
    
    getLast() {
        if (this.isEmpty()) return null;
        return this.tail.data;
    }
    
    getAtIndex(index) {
        if (index < 0 || index >= this.length) return null;
        
        let current = this.head;
        let currentIndex = 0;
        
        while (currentIndex < index) {
            current = current.next;
            currentIndex++;
        }
        
        return current.data;
    }
    
    toArray() {
        const result = {};
        let current = this.head;
        let index = 0;
        
        while (current !== null) {
            result[index] = current.data;
            current = current.next;
            index++;
        }
        
        return result;
    }
    
    size() {
        return this.length;
    }
    
    isEmpty() {
        return this.length === 0;
    }
    
    slice(start, end) {
        if (start < 0 || start >= this.length) return new LinkedList();
        if (end === undefined || end > this.length) end = this.length;
        
        const result = new LinkedList();
        let current = this.head;
        let index = 0;
        
        while (current !== null && index < end) {
            if (index >= start) {
                result.append(current.data);
            }
            current = current.next;
            index++;
        }
        
        return result;
    }
    
    splice(start, deleteCount, ...items) {
        if (start < 0 || start > this.length) return new LinkedList();
        
        const removed = new LinkedList();
        let current = this.head;
        let prev = null;
        let index = 0;
        
        // Navigate to start position
        while (index < start && current !== null) {
            prev = current;
            current = current.next;
            index++;
        }
        
        // Remove deleteCount items
        for (let i = 0; i < deleteCount && current !== null; i++) {
            removed.append(current.data);
            current = current.next;
            this.length--;
        }
        
        // Insert new items
        if (items.length > 0) {
            let newItemsHead = null;
            let newItemsTail = null;
            
            for (const item of items) {
                const newNode = { data: item, next: null };
                if (!newItemsHead) {
                    newItemsHead = newNode;
                    newItemsTail = newNode;
                } else {
                    newItemsTail.next = newNode;
                    newItemsTail = newNode;
                }
                this.length++;
            }
            
            if (prev === null) { // Insert at head
                if (newItemsTail) {
                    newItemsTail.next = this.head;
                }
                this.head = newItemsHead || this.head;
            } else { // Insert in middle
                prev.next = newItemsHead;
                if (newItemsTail) {
                    newItemsTail.next = current;
                }
            }
            
            if (current === null) { // Update tail if we're at the end
                this.tail = newItemsTail || this.tail;
            }
        } else {
            // Just update pointers after removal
            if (prev === null) {
                this.head = current;
            } else {
                prev.next = current;
            }
            
            if (current === null) {
                this.tail = prev;
            }
        }
        
        return removed;
    }
    
    clear() {
        this.head = null;
        this.tail = null;
        this.length = 0;
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