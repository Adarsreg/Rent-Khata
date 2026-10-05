import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

import { STATUS_META, type BillStatus } from '@/domain/status';
import { useColors } from '@/theme/tokens';

import { Text } from './text';

const ICON_COLOR_KEY: Record<BillStatus, 'paid' | 'due' | 'overdue' | 'neutral'> = {
  paid: 'paid',
  due: 'due',
  overdue: 'overdue',
  notBilled: 'neutral',
};

export function StatusPill({
  status,
  size = 'md',
  className,
}: {
  status: BillStatus;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const meta = STATUS_META[status];
  const colors = useColors();
  const iconSize = size === 'sm' ? 11 : 13;

  return (
    <View
      accessibilityLabel={meta.label}
      className={[
        'flex-row items-center self-start rounded-full',
        meta.bg,
        size === 'sm' ? 'gap-1 px-2 py-0.5' : 'gap-1 px-3 py-1',
        className,
      ]
        .filter(Boolean)
        .join(' ')}>
      <Feather name={meta.icon} size={iconSize} color={colors[ICON_COLOR_KEY[status]]} />
      <Text variant="caption" className={`${meta.fg} font-semibold`}>
        {meta.short}
      </Text>
    </View>
  );
}
