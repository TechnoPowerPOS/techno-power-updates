import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
    count?: number;
    value: number;
    onChange: (value: number) => void;
    size?: number;
    color?: string;
    hoverColor?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
    count = 5,
    value,
    onChange,
    size = 28,
    color = "text-gray-300 dark:text-gray-600",
    hoverColor = "text-yellow-400"
}) => {
    const [hoverValue, setHoverValue] = useState<number | undefined>(undefined);

    const stars = Array.from({ length: count }, () => `star-${Math.random()}`);

    const handleClick = (value: number) => {
        onChange(value);
    };

    const handleMouseOver = (newHoverValue: number) => {
        setHoverValue(newHoverValue);
    };

    const handleMouseLeave = () => {
        setHoverValue(undefined);
    };

    return (
        <div className="flex items-center justify-center gap-2" dir="ltr">
            {stars.map((_, index) => {
                const ratingValue = index + 1;
                return (
                    <Star
                        key={ratingValue}
                        size={size}
                        onClick={() => handleClick(ratingValue)}
                        onMouseOver={() => handleMouseOver(ratingValue)}
                        onMouseLeave={handleMouseLeave}
                        className={`cursor-pointer transition-colors ${
                            (hoverValue || value) >= ratingValue ? hoverColor : color
                        }`}
                        fill="currentColor"
                    />
                );
            })}
        </div>
    );
};

export default StarRating;
