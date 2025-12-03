import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

export function Card({ children, className = '', ...props }: CardProps) {
    return (
        <div
            className={`bg-surface/80 backdrop-blur-xl border border-primary/20 rounded-xl p-6 shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:border-primary/40 hover:shadow-[0_0_25px_rgba(59,130,246,0.2)] transition-all duration-300 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
