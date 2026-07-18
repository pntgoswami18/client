import React from 'react';
import { ListItemText } from '@mui/material';

// Drop-in replacement for MUI's ListItemText.
//
// ListItemText wraps any non-Typography `secondary` content in a
// <Typography component="p"> by default. When `secondary` contains a
// block-level element (Box, Chip, a fragment containing either, etc.),
// that produces an invalid "<div> cannot be a descendant of <p>" DOM
// nesting and a React console warning. This component defaults the
// `secondary` slot to render as a <div> instead, so the fix lives in one
// place instead of being repeated (and potentially missed) at every
// ListItemText usage that renders non-text `secondary` content.
//
// Callers can still override slotProps.secondary (or any other slot) by
// passing their own `slotProps` — it's merged on top of the default.
const SafeListItemText = ({ slotProps, ...props }) => (
  <ListItemText slotProps={{ secondary: { component: 'div' }, ...slotProps }} {...props} />
);

export default SafeListItemText;
