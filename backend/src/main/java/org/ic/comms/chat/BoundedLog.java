package org.ic.comms.chat;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

final class BoundedLog<T> {

    private final Object[] items;
    private final ReadWriteLock lock = new ReentrantReadWriteLock();
    private int head;
    private int size;

    BoundedLog(int capacity) {
        if (capacity <= 0) {
            throw new IllegalArgumentException("capacity must be positive");
        }
        this.items = new Object[capacity];
    }

    void append(T item) {
        lock.writeLock().lock();
        try {
            items[(head + size) % items.length] = item;
            if (size < items.length) {
                size++;
            } else {
                head = (head + 1) % items.length;
            }
        } finally {
            lock.writeLock().unlock();
        }
    }

    @SuppressWarnings("unchecked")
    List<T> snapshot() {
        lock.readLock().lock();
        try {
            List<T> copy = new ArrayList<>(size);
            for (int i = 0; i < size; i++) {
                copy.add((T) items[(head + i) % items.length]);
            }
            return copy;
        } finally {
            lock.readLock().unlock();
        }
    }
}
