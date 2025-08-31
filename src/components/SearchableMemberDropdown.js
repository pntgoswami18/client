import React, { useState, useMemo } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  InputAdornment,
  IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import StarIcon from '@mui/icons-material/Star';

const SearchableMemberDropdown = ({
  value,
  onChange,
  members = [],
  label = "Select Member",
  placeholder = "Search members...",
  showId = true,
  showEmail = false,
  showAdminIcon = true,
  disabled = false,
  fullWidth = true,
  sx = {},
  includeAllOption = false,
  allOptionLabel = "All users",
  allOptionValue = "all"
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter members based on search term (index-based searching)
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) {
      return members;
    }

    const searchLower = searchTerm.toLowerCase();
    return members.filter(member => {
      // Search by name (primary search)
      if (member.name && member.name.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search by ID
      if (showId && member.id && member.id.toString().includes(searchLower)) {
        return true;
      }
      
      // Search by email
      if (showEmail && member.email && member.email.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search by phone
      if (member.phone && member.phone.includes(searchLower)) {
        return true;
      }
      
      return false;
    });
  }, [members, searchTerm, showId, showEmail]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleSelectChange = (event) => {
    onChange(event);
    // Clear search when an option is selected
    setSearchTerm('');
  };

  const getMemberDisplayText = (member) => {
    let displayText = member.name;
    
    if (showId) {
      displayText += ` (ID: ${member.id})`;
    }
    
    if (showEmail && member.email) {
      displayText += ` - ${member.email}`;
    }
    
    return displayText;
  };

  return (
    <FormControl fullWidth={fullWidth} disabled={disabled} sx={sx}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        onChange={handleSelectChange}
        label={label}
        MenuProps={{
          PaperProps: {
            style: {
              maxHeight: 400
            }
          }
        }}
      >
        {/* Search input */}
        <Box sx={{ p: 1, borderBottom: '1px solid #e0e0e0' }}>
          <TextField
            fullWidth
            size="small"
            placeholder={placeholder}
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={clearSearch}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </Box>

        {/* All option if requested */}
        {includeAllOption && (
          <MenuItem value={allOptionValue}>
            {allOptionLabel}
          </MenuItem>
        )}

        {/* No results message */}
        {filteredMembers.length === 0 && searchTerm && (
          <MenuItem disabled>
            No members found matching "{searchTerm}"
          </MenuItem>
        )}

        {/* No members available message */}
        {filteredMembers.length === 0 && !searchTerm && (
          <MenuItem disabled>
            No members available
          </MenuItem>
        )}

        {/* Member options */}
        {filteredMembers.map((member) => (
          <MenuItem key={member.id} value={member.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Box sx={{ flex: 1 }}>
                {getMemberDisplayText(member)}
              </Box>
              {showAdminIcon && member.is_admin === 1 && (
                <StarIcon 
                  sx={{ 
                    color: '#ffd700', 
                    fontSize: 16,
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                  }} 
                />
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default SearchableMemberDropdown;
