import { ChangeEvent } from 'react';
import { Card } from './ui/Card';

interface FilterBarProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    sortBy: string;
    onSortChange: (value: string) => void;
    selectedCategory: string;
    onCategoryChange: (value: string) => void;
    categories: string[];
}

export function FilterBar({
    searchQuery,
    onSearchChange,
    sortBy,
    onSortChange,
    selectedCategory,
    onCategoryChange,
    categories,
}: FilterBarProps) {
    return (
        <Card className="mb-8 border-white/10 p-4">
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-grow">
                    <label htmlFor="search" className="block text-sm font-medium text-gray-400 mb-1">
                        Search Creator
                    </label>
                    <input
                        type="text"
                        id="search"
                        placeholder="Search by name or wallet..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                </div>

                {/* Sort */}
                <div className="min-w-[200px]">
                    <label htmlFor="sort" className="block text-sm font-medium text-gray-400 mb-1">
                        Sort By
                    </label>
                    <select
                        id="sort"
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none cursor-pointer"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest_prize">Highest Prize</option>
                        <option value="lowest_prize">Lowest Prize</option>
                    </select>
                </div>

                {/* Category */}
                <div className="min-w-[200px]">
                    <label htmlFor="category" className="block text-sm font-medium text-gray-400 mb-1">
                        Category
                    </label>
                    <select
                        id="category"
                        value={selectedCategory}
                        onChange={(e) => onCategoryChange(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none cursor-pointer"
                    >
                        <option value="all">All Categories</option>
                        {categories.map((category) => (
                            <option key={category} value={category}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </Card>
    );
}
