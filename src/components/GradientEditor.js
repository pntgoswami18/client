import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, IconButton, Slider, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const toCss = (mode, angle, stops) => {
  const ordered = [...stops].sort((a, b) => a.pos - b.pos);
  const stopStr = ordered.map(s => `${s.color} ${clamp(Math.round(s.pos), 0, 100)}%`).join(', ');
  if (mode === 'radial') { return `radial-gradient(circle, ${stopStr})`; }
  return `linear-gradient(${angle}deg, ${stopStr})`;
};

const GradientEditor = ({ value, onChange, defaultStops }) => {
  const initial = useMemo(() => {
    if (value && typeof value === 'string' && value.includes('gradient')) {
      // naive parser for "...gradient(..., color pos%, color pos%, ...)"
      try {
        const isRadial = value.startsWith('radial-gradient');
        const mode = isRadial ? 'radial' : 'linear';
        let angle = 90;
        let stopPart = value.substring(value.indexOf('(') + 1, value.lastIndexOf(')'));
        if (!isRadial) {
          const m = stopPart.match(/^(\d+)(deg)\s*,\s*(.*)$/);
          if (m) { angle = parseInt(m[1], 10); stopPart = m[3]; }
        }
        const stops = stopPart.split(',').map(s => s.trim()).map(s => {
          const [color, pos] = s.split(/\s+(?=[^\s]+$)/);
          return { color, pos: parseFloat(pos) };
        }).filter(s => !Number.isNaN(s.pos) && s.color);
        return { mode, angle, stops: stops.length ? stops : defaultStops };
      } catch (_) { /* fallthrough */ }
    }
    return { mode: 'linear', angle: 90, stops: defaultStops };
  }, [value, defaultStops]);

  const [mode, setMode] = useState(initial.mode);
  const [angle, setAngle] = useState(initial.angle);
  const [stops, setStops] = useState(initial.stops);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    onChange(toCss(mode, angle, stops));
  }, [mode, angle, stops, onChange]);

  const marks = stops.map((s, i) => ({ value: clamp(s.pos, 0, 100), label: i === selectedIdx ? '|' : '' }));

  return (
    <Box sx={{ width: '100%', p: 1, border: '1px solid #ddd', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_e, v) => v && setMode(v)}>
          <ToggleButton value="linear">Linear</ToggleButton>
          <ToggleButton value="radial">Radial</ToggleButton>
        </ToggleButtonGroup>
        {mode === 'linear' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">Angle</Typography>
            <TextField size="small" type="number" value={angle} onChange={(e)=>setAngle(clamp(parseInt(e.target.value||'0',10),0,360))} sx={{ width: 90 }} />
          </Box>
        )}
      </Box>

      <Box sx={{ background: toCss(mode, angle, stops), height: 16, borderRadius: 1, mb: 2 }} />
      <Slider value={stops[selectedIdx]?.pos || 0} valueLabelDisplay="auto" marks={marks} min={0} max={100}
        onChange={(_e, val)=>{
          const cp = [...stops];
          cp[selectedIdx] = { ...cp[selectedIdx], pos: val };
          setStops(cp);
        }}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: '120px 130px 1fr auto', gap: 1, alignItems: 'center' }}>
        <Typography variant="caption" sx={{ gridColumn: '1 / span 4' }}>Stops</Typography>
        {stops.map((s, i) => (
          <React.Fragment key={i}>
            <Button size="small" variant={i===selectedIdx? 'contained':'outlined'} onClick={()=>setSelectedIdx(i)} sx={{ minWidth: 0, p: 0.5 }}>
              <input type="color" value={s.color} onChange={(e)=>{
                const cp = [...stops];
                cp[i] = { ...cp[i], color: e.target.value };
                setStops(cp);
              }} style={{ border: 'none', background: 'transparent', width: 36, height: 24, padding: 0, cursor: 'pointer' }} />
            </Button>
            <TextField size="small" value={s.color} onChange={(e)=>{
              const cp = [...stops];
              cp[i] = { ...cp[i], color: e.target.value };
              setStops(cp);
            }} />
            <TextField size="small" type="number" value={s.pos} onChange={(e)=>{
              const v = clamp(parseFloat(e.target.value||'0'),0,100);
              const cp = [...stops];
              cp[i] = { ...cp[i], pos: v };
              setStops(cp);
            }} />
            <IconButton size="small" onClick={()=>{
              const cp = stops.filter((_,idx)=>idx!==i);
              setStops(cp.length?cp:[s]);
              setSelectedIdx(0);
            }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </React.Fragment>
        ))}
      </Box>
      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
        <Button size="small" variant="outlined" onClick={()=>{
          const last = stops[stops.length-1];
          const pos = clamp((last?.pos??0)+10,0,100);
          setStops([...stops, { color: last?.color || '#000000', pos }]);
          setSelectedIdx(stops.length);
        }}>Add Stop</Button>
        <Button size="small" onClick={()=>onChange(toCss(mode, angle, stops))}>Apply</Button>
      </Box>
    </Box>
  );
};

export default GradientEditor;


