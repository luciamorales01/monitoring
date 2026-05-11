import type { ReactNode } from 'react';
import IconButton from './IconButton';
import { MoreHorizontalIcon } from '../uiIcons';
import './button.css';

export type ActionMenuItem = {
  disabled?: boolean;
  icon?: ReactNode;
  id: string;
  label: string;
  onSelect: () => void;
};

type ActionMenuProps = {
  buttonLabel: string;
  items: ActionMenuItem[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export default function ActionMenu({
  buttonLabel,
  items,
  onOpenChange,
  open,
}: ActionMenuProps) {
  return (
    <div className="ui-action-menu-root" onClick={(event) => event.stopPropagation()}>
      <IconButton
        aria-expanded={open}
        icon={<MoreHorizontalIcon size={16} />}
        label={buttonLabel}
        onClick={() => onOpenChange(!open)}
      />
      {open ? (
        <div className="ui-action-menu">
          {items.map((item) => (
            <button
              className="ui-action-menu__item"
              disabled={item.disabled}
              key={item.id}
              onClick={() => {
                onOpenChange(false);
                item.onSelect();
              }}
              type="button"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
