import React from 'react';
import { Box, Skeleton } from '@mui/material';

// Shimmer animation component for different content types
export const ShimmerLoader = ({ 
    variant = 'text', 
    width = '100%', 
    height = 20, 
    count = 1,
    animation = 'wave',
    sx = {}
}) => {
    return (
        <Box sx={{ width: '100%', ...sx }}>
            {Array.from({ length: count }).map((_, index) => (
                <Skeleton
                    key={index}
                    variant={variant}
                    width={width}
                    height={height}
                    animation={animation}
                    sx={{
                        mb: index < count - 1 ? 1 : 0,
                        ...sx
                    }}
                />
            ))}
        </Box>
    );
};

// Predefined shimmer layouts for common components
export const TableShimmer = ({ rows = 5, columns = 4 }) => (
    <Box>
        {/* Table header shimmer */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {Array.from({ length: columns }).map((_, index) => (
                <ShimmerLoader 
                    key={index} 
                    variant="rectangular" 
                    height={40} 
                    width="100%" 
                />
            ))}
        </Box>
        {/* Table rows shimmer */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
            <Box key={rowIndex} sx={{ display: 'flex', gap: 2, mb: 1 }}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                    <ShimmerLoader 
                        key={colIndex} 
                        variant="rectangular" 
                        height={32} 
                        width="100%" 
                    />
                ))}
            </Box>
        ))}
    </Box>
);

export const CardShimmer = ({ count = 3 }) => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {Array.from({ length: count }).map((_, index) => (
            <Box 
                key={index} 
                sx={{ 
                    flex: '1 1 300px', 
                    minWidth: '300px',
                    p: 2,
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                    backgroundColor: '#fafafa'
                }}
            >
                <ShimmerLoader variant="rectangular" height={20} width="60%" sx={{ mb: 2 }} />
                <ShimmerLoader variant="text" count={3} />
                <ShimmerLoader variant="rectangular" height={40} width="100%" sx={{ mt: 2 }} />
            </Box>
        ))}
    </Box>
);

export const ListShimmer = ({ count = 5 }) => (
    <Box>
        {Array.from({ length: count }).map((_, index) => (
            <Box 
                key={index} 
                sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2, 
                    p: 2, 
                    borderBottom: '1px solid #e0e0e0',
                    '&:last-child': { borderBottom: 'none' }
                }}
            >
                <ShimmerLoader variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                    <ShimmerLoader variant="text" width="70%" height={20} sx={{ mb: 1 }} />
                    <ShimmerLoader variant="text" width="50%" height={16} />
                </Box>
            </Box>
        ))}
    </Box>
);

export const DashboardShimmer = () => (
    <Box sx={{ p: 3 }}>
        {/* Header shimmer */}
        <ShimmerLoader variant="rectangular" height={40} width="200px" sx={{ mb: 3 }} />
        
        {/* Stats cards shimmer */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mb: 4 }}>
            {Array.from({ length: 4 }).map((_, index) => (
                <Box 
                    key={index} 
                    sx={{ 
                        p: 3, 
                        border: '1px solid #e0e0e0', 
                        borderRadius: 2,
                        backgroundColor: '#fafafa'
                    }}
                >
                    <ShimmerLoader variant="text" width="60%" height={20} sx={{ mb: 2 }} />
                    <ShimmerLoader variant="rectangular" height={40} width="80%" sx={{ mb: 1 }} />
                    <ShimmerLoader variant="text" width="40%" height={16} />
                </Box>
            ))}
        </Box>
        
        {/* Charts/Content shimmer */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 2 }}>
            {Array.from({ length: 2 }).map((_, index) => (
                <Box 
                    key={index} 
                    sx={{ 
                        p: 3, 
                        border: '1px solid #e0e0e0', 
                        borderRadius: 2,
                        backgroundColor: '#fafafa'
                    }}
                >
                    <ShimmerLoader variant="rectangular" height={20} width="150px" sx={{ mb: 2 }} />
                    <ShimmerLoader variant="rectangular" height={200} width="100%" />
                </Box>
            ))}
        </Box>
    </Box>
);

export const FormShimmer = () => (
    <Box sx={{ p: 3 }}>
        <ShimmerLoader variant="rectangular" height={30} width="200px" sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ShimmerLoader variant="rectangular" height={56} width="100%" />
            <ShimmerLoader variant="rectangular" height={56} width="100%" />
            <ShimmerLoader variant="rectangular" height={56} width="100%" />
            <ShimmerLoader variant="rectangular" height={120} width="100%" />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <ShimmerLoader variant="rectangular" height={36} width={100} />
                <ShimmerLoader variant="rectangular" height={36} width={100} />
            </Box>
        </Box>
    </Box>
);

export default ShimmerLoader;
