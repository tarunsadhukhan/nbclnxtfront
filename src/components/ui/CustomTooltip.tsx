import { Tooltip, tooltipClasses } from '@mui/material';
import { styled } from '@mui/material/styles';
import type { TooltipProps } from '@mui/material/Tooltip';

const CustomTooltip = styled((props: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: props.className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: '#1976d2',
    color: '#fff', 
    fontSize: '14px',
    maxWidth: 220,
    padding: '10px 15px',
    borderRadius: '8px',
    boxShadow: theme.shadows[4],
  },
}));

export default CustomTooltip;
