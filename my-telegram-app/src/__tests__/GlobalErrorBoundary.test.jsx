import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GlobalErrorBoundary from '../components/common/GlobalErrorBoundary';

// A component that throws an error
const BuggyComponent = ({ shouldThrow }) => {
    if (shouldThrow) {
        throw new Error('Test Error');
    }
    return <div>Fine</div>;
};

describe('GlobalErrorBoundary', () => {
    const originalConsoleError = console.error;

    beforeEach(() => {
        // Suppress console.error in tests to keep output clean
        console.error = vi.fn();
    });

    afterEach(() => {
        console.error = originalConsoleError;
    });

    it('renders children when there is no error', () => {
        render(
            <GlobalErrorBoundary>
                <div>Test Content</div>
            </GlobalErrorBoundary>
        );
        expect(screen.getByText('Test Content')).toBeDefined();
    });

    it('renders fallback UI when a child component throws', () => {
        render(
            <GlobalErrorBoundary>
                <BuggyComponent shouldThrow={true} />
            </GlobalErrorBoundary>
        );

        expect(screen.getByText('Something went wrong')).toBeDefined();
        expect(screen.getByText(/unexpected error/)).toBeDefined();
        expect(screen.getByText('Refresh Page')).toBeDefined();
    });

    it('refreshes the page when clicking the retry button', () => {
        // Mock window.location.reload
        const reloadMock = vi.fn();
        Object.defineProperty(window, 'location', {
            value: { reload: reloadMock },
            writable: true,
        });

        render(
            <GlobalErrorBoundary>
                <BuggyComponent shouldThrow={true} />
            </GlobalErrorBoundary>
        );

        fireEvent.click(screen.getByText('Refresh Page'));
        expect(reloadMock).toHaveBeenCalled();
    });
});
