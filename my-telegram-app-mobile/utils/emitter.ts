type Listener = (...args: unknown[]) => void;

class EventEmitter {
    private events: Record<string, Listener[]> = {};

    on(event: string, listener: Listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    off(event: string, listener: Listener) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(l => l !== listener);
    }

    emit(event: string, ...args: unknown[]) {
        if (!this.events[event]) return;
        this.events[event].forEach(listener => listener(...args));
    }
}

export const emitter = new EventEmitter();
