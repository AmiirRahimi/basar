'use client';

import { TreeItem, treeItemClasses } from '@mui/x-tree-view/TreeItem';
import { alpha, styled } from '@mui/material/styles';

/**
 * Styled MUI TreeItem used across TelC tree views.
 * Requires peer deps: `@mui/material`, `@mui/x-tree-view`.
 */
export const StyledTreeItem = styled(TreeItem)(({ theme }) => {
  const lineColor = alpha(theme.palette.text.primary, 0.12);
  const hoverBg = alpha(theme.palette.primary.main, 0.06);
  const selectedBg = alpha(theme.palette.primary.main, 0.1);

  return {
    [`& .${treeItemClasses.content}`]: {
      position: 'relative',
      paddingBlock: theme.spacing(0.5),
      paddingInline: theme.spacing(1),
      borderRadius: 12,
      transition: theme.transitions.create(['background-color', 'padding', 'box-shadow'], {
        duration: 200,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      }),
      '&:hover': {
        backgroundColor: hoverBg,
        boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}`,
        '& .tree-item-actions': {
          opacity: 1,
          visibility: 'visible',
        },
      },
      [`& .${treeItemClasses.label}`]: {
        width: '100%',
      },
      [`&::before`]: {
        content: '""',
        position: 'absolute',
        insetInlineStart: -18,
        top: '50%',
        width: 18,
        borderTop: `1px solid ${lineColor}`,
        transform: 'translateY(-50%)',
      },
    },
    [`& .${treeItemClasses.groupTransition}`]: {
      marginInlineStart: 18,
      paddingInlineStart: 18,
      borderInlineStart: `1px solid ${lineColor}`,
      transition: theme.transitions.create(['margin', 'padding', 'border'], {
        duration: 200,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      }),
    },
    [`& .${treeItemClasses.selected}`]: {
      backgroundColor: selectedBg,
      boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.2)}`,
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.14),
      },
    },
  };
});
